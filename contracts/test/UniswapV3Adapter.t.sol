// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {UniswapV3Adapter, IV3Factory, ISwapRouter02} from "../src/UniswapV3Adapter.sol";
contract V3PoolMock { uint128 public liquidity = 1e18; function empty() external { liquidity = 0; } }
contract V3FactoryMock { address public pool; function setPool(address p) external { pool = p; } function getPool(address,address,uint24) external view returns (address) { return pool; } }
contract V3RouterMock is ISwapRouter02 {
    address public immutable factory;
    uint256 public output = 200;
    bool public consume = true;
    address public recipient;
    constructor(address f) { factory = f; }
    function configure(uint256 out, bool consume_) external { output = out; consume = consume_; }
    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256) {
        recipient = p.recipient;
        if (consume) IERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        IERC20(p.tokenOut).transfer(p.recipient, output);
        return type(uint256).max; // Adapter must use actual balance changes.
    }
}
contract UniswapV3AdapterTest is Test {
    MockERC20 a; MockERC20 b; V3FactoryMock factory; V3RouterMock router; V3PoolMock pool; UniswapV3Adapter adapter;
    function setUp() public {
        a = new MockERC20("A", "A", 6); b = new MockERC20("B", "B", 18);
        factory = new V3FactoryMock(); router = new V3RouterMock(address(factory)); pool = new V3PoolMock(); factory.setPool(address(pool));
        adapter = new UniswapV3Adapter(address(this), IV3Factory(address(factory)), router);
        adapter.setRoute(address(a), address(b), 3000); a.mint(address(this), 1000); b.mint(address(router), 1000); a.approve(address(adapter), 1000);
    }
    function test_swapUsesActualOutputAndClearsAllowance() public {
        assertEq(adapter.swap(address(a), address(b), 100, 190, address(this)), 200);
        assertEq(a.balanceOf(address(this)), 900); assertEq(b.balanceOf(address(this)), 200);
        assertEq(a.allowance(address(adapter), address(router)), 0); assertEq(router.recipient(), address(adapter));
    }
    function test_cannotRedirectRecipient() public { vm.expectRevert(UniswapV3Adapter.InvalidSwap.selector); adapter.swap(address(a), address(b), 100, 190, address(0x123)); }
    function test_cannotLowerMinimumToZero() public { vm.expectRevert(UniswapV3Adapter.InvalidSwap.selector); adapter.swap(address(a), address(b), 100, 0, address(this)); }
    function test_routeCannotChangeOrReverseOverwrite() public { vm.expectRevert(UniswapV3Adapter.RouteAlreadySet.selector); adapter.setRoute(address(b), address(a), 500); }
    function test_badOutputRollsBackInput() public { router.configure(10, true); vm.expectRevert(UniswapV3Adapter.InsufficientOutput.selector); adapter.swap(address(a), address(b), 100, 190, address(this)); assertEq(a.balanceOf(address(this)), 1000); }
    function test_unconsumedInputRejected() public { router.configure(200, false); vm.expectRevert(UniswapV3Adapter.UnsupportedInput.selector); adapter.swap(address(a), address(b), 100, 190, address(this)); }
    function test_emptyPoolRejected() public { pool.empty(); vm.expectRevert(UniswapV3Adapter.PoolUnavailable.selector); adapter.swap(address(a), address(b), 100, 190, address(this)); }
    function test_onlyOwnerCanSetRoutes() public { vm.prank(address(0x123)); vm.expectRevert(); adapter.setRoute(address(a), address(b), 500); }
    function test_dustNotPaidToNextCaller() public { b.mint(address(adapter), 37); adapter.swap(address(a), address(b), 100, 190, address(this)); assertEq(b.balanceOf(address(this)), 200); assertEq(b.balanceOf(address(adapter)), 37); }
    function test_routerFactoryMismatchRejected() public { vm.expectRevert(UniswapV3Adapter.InvalidAddress.selector); new UniswapV3Adapter(address(this), IV3Factory(address(pool)), router); }
}
