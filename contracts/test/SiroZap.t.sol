// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockERC4626Vault} from "./mocks/MockERC4626Vault.sol";
import {SiroZap, IWETH9, IVaultFactory} from "../src/SiroZap.sol";
import {ISwapRouter02} from "../src/UniswapV3Adapter.sol";

contract ZapWETH is MockERC20 {
    constructor() MockERC20("Wrapped Ether", "WETH", 18) {}
    function deposit() external payable { _mint(msg.sender, msg.value); }
}

contract ZapFactory is IVaultFactory {
    mapping(address => bool) public isVault;
    function set(address v, bool ok) external { isVault[v] = ok; }
}

/// Pays `rateNum/rateDen` of amountIn in tokenOut; can leave part of the input unspent.
contract ZapRouter {
    uint256 public rateNum = 2;
    uint256 public rateDen = 1;
    uint256 public spendBps = 10_000;
    uint24 public lastFee;
    address public lastRecipient;
    function setRate(uint256 n, uint256 d) external { rateNum = n; rateDen = d; }
    function setSpendBps(uint256 b) external { spendBps = b; }
    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata p) external payable returns (uint256 out) {
        lastFee = p.fee; lastRecipient = p.recipient;
        uint256 spent = p.amountIn * spendBps / 10_000;
        IERC20(p.tokenIn).transferFrom(msg.sender, address(this), spent);
        out = spent * rateNum / rateDen;
        require(out >= p.amountOutMinimum, "Too little received");
        MockERC20(p.tokenOut).mint(p.recipient, out);
    }
}

/// Mimics GuardedVault._requireFreshHoldings reverting at deposit time.
contract StaleVault is MockERC4626Vault {
    error StaleOracle();
    constructor(IERC20 a) MockERC4626Vault(a, "Stale", "STL") {}
    function deposit(uint256, address) public pure override returns (uint256) { revert StaleOracle(); }
}

/// Re-enters the zap from inside transferFrom.
contract ReentrantToken is MockERC20 {
    SiroZap public zap; address public vault;
    constructor() MockERC20("Evil", "EVIL", 18) {}
    function arm(SiroZap z, address v) external { zap = z; vault = v; }
    function transferFrom(address from, address to, uint256 amt) public override returns (bool) {
        if (address(zap) != address(0) && msg.sender == address(zap)) {
            zap.swapAndDeposit(vault, address(this), 1, 500, 0, 0, block.timestamp, from);
        }
        return super.transferFrom(from, to, amt);
    }
}

contract FeeOnTransferToken is MockERC20 {
    constructor() MockERC20("Tax", "TAX", 18) {}
    function _update(address from, address to, uint256 amt) internal override {
        if (from != address(0) && to != address(0)) { super._update(from, address(0xdead), amt / 100); amt -= amt / 100; }
        super._update(from, to, amt);
    }
}

contract SiroZapTest is Test {
    MockERC20 usdg; MockERC20 tokenIn; ZapWETH weth; ZapFactory factory; ZapRouter router;
    MockERC4626Vault vault; SiroZap zap;
    address user = address(0xA11CE);
    address receiver = address(0xB0B);

    function setUp() public {
        usdg = new MockERC20("Global Dollar", "USDG", 6);
        tokenIn = new MockERC20("Token", "TKN", 18);
        weth = new ZapWETH();
        factory = new ZapFactory();
        router = new ZapRouter();
        vault = new MockERC4626Vault(usdg, "Vault", "vUSDG");
        factory.set(address(vault), true);
        zap = new SiroZap(address(this), ISwapRouter02(address(router)), IWETH9(address(weth)), factory);
        zap.setWhitelisted(address(tokenIn), true);
        zap.setWhitelisted(address(weth), true);
        tokenIn.mint(user, 1e30);
        vm.deal(user, 1e30);
        vm.prank(user); tokenIn.approve(address(zap), type(uint256).max);
    }

    function _zap(address t, uint256 amt, uint256 minOut) internal returns (uint256) {
        vm.prank(user);
        return zap.swapAndDeposit(address(vault), t, amt, 500, minOut, 0, block.timestamp, receiver);
    }

    // --- happy paths ---

    function test_erc20HappyPath() public {
        uint256 shares = _zap(address(tokenIn), 100e18, 200e18);
        assertEq(shares, vault.balanceOf(receiver));
        assertGt(shares, 0);
        assertEq(usdg.balanceOf(address(vault)), 200e18);
        assertEq(tokenIn.balanceOf(address(zap)), 0);
        assertEq(usdg.balanceOf(address(zap)), 0);
        assertEq(tokenIn.allowance(address(zap), address(router)), 0);
        assertEq(usdg.allowance(address(zap), address(vault)), 0);
        assertEq(router.lastRecipient(), address(zap));
        assertEq(router.lastFee(), 500);
    }

    function test_nativeHappyPath() public {
        vm.prank(user);
        uint256 shares = zap.swapAndDeposit{value: 1 ether}(address(vault), address(0), 1 ether, 3000, 2 ether, 0, block.timestamp, receiver);
        assertEq(vault.balanceOf(receiver), shares);
        assertEq(weth.balanceOf(address(zap)), 0);
        assertEq(address(zap).balance, 0);
    }

    // --- required reverts ---

    function test_revertDeadlinePassed() public {
        vm.prank(user);
        vm.expectRevert(SiroZap.DeadlinePassed.selector);
        zap.swapAndDeposit(address(vault), address(tokenIn), 1e18, 500, 0, 0, block.timestamp - 1, receiver);
    }

    function test_revertSlippage() public {
        router.setRate(1, 1); // pays 1:1, user asked for 2:1
        vm.prank(user);
        vm.expectRevert(); // router's own minimum fires first, as on mainnet
        zap.swapAndDeposit(address(vault), address(tokenIn), 1e18, 500, 2e18, 0, block.timestamp, receiver);
    }

    function test_revertSlippageWhenRouterIgnoresMinimum() public {
        // A router returning nothing still trips the zap's own balance check.
        router.setRate(0, 1);
        vm.prank(user);
        vm.expectRevert(SiroZap.SlippageExceeded.selector);
        zap.swapAndDeposit(address(vault), address(tokenIn), 1e18, 500, 0, 0, block.timestamp, receiver);
    }

    function test_revertNotWhitelisted() public {
        MockERC20 other = new MockERC20("X", "X", 18);
        vm.prank(user);
        vm.expectRevert(SiroZap.TokenNotWhitelisted.selector);
        zap.swapAndDeposit(address(vault), address(other), 1e18, 500, 0, 0, block.timestamp, receiver);
    }

    function test_revertNativeWhenWethNotWhitelisted() public {
        zap.setWhitelisted(address(weth), false);
        vm.prank(user);
        vm.expectRevert(SiroZap.TokenNotWhitelisted.selector);
        zap.swapAndDeposit{value: 1}(address(vault), address(0), 1, 500, 0, 0, block.timestamp, receiver);
    }

    function test_revertZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(SiroZap.ZeroAmount.selector);
        zap.swapAndDeposit(address(vault), address(tokenIn), 0, 500, 0, 0, block.timestamp, receiver);
    }

    function test_revertUnknownVault() public {
        MockERC4626Vault rogue = new MockERC4626Vault(usdg, "Rogue", "R");
        vm.prank(user);
        vm.expectRevert(SiroZap.VaultNotRecognized.selector);
        zap.swapAndDeposit(address(rogue), address(tokenIn), 1e18, 500, 0, 0, block.timestamp, receiver);
    }

    function test_revertBadFee() public {
        vm.prank(user);
        vm.expectRevert(SiroZap.InvalidFee.selector);
        zap.swapAndDeposit(address(vault), address(tokenIn), 1e18, 2500, 0, 0, block.timestamp, receiver);
    }

    function test_revertSharesBelowMinimum() public {
        vm.prank(user);
        vm.expectRevert(SiroZap.SharesBelowMinimum.selector);
        zap.swapAndDeposit(address(vault), address(tokenIn), 1e18, 500, 0, type(uint256).max, block.timestamp, receiver);
    }

    function test_revertMsgValueMismatch() public {
        vm.prank(user);
        vm.expectRevert(SiroZap.InvalidValue.selector);
        zap.swapAndDeposit{value: 1}(address(vault), address(tokenIn), 1e18, 500, 0, 0, block.timestamp, receiver);
        vm.prank(user);
        vm.expectRevert(SiroZap.InvalidValue.selector);
        zap.swapAndDeposit{value: 1}(address(vault), address(0), 2, 500, 0, 0, block.timestamp, receiver);
    }

    function test_revertSameToken() public {
        zap.setWhitelisted(address(usdg), true);
        usdg.mint(user, 1e6);
        vm.prank(user);
        vm.expectRevert(SiroZap.SameToken.selector);
        zap.swapAndDeposit(address(vault), address(usdg), 1e6, 500, 0, 0, block.timestamp, receiver);
    }

    function test_revertFeeOnTransfer() public {
        FeeOnTransferToken tax = new FeeOnTransferToken();
        zap.setWhitelisted(address(tax), true);
        tax.mint(user, 100e18);
        vm.startPrank(user);
        tax.approve(address(zap), type(uint256).max);
        vm.expectRevert(SiroZap.UnsupportedToken.selector);
        zap.swapAndDeposit(address(vault), address(tax), 100e18, 500, 0, 0, block.timestamp, receiver);
        vm.stopPrank();
    }

    function test_staleVaultRevertBubbles() public {
        StaleVault stale = new StaleVault(usdg);
        factory.set(address(stale), true);
        vm.prank(user);
        vm.expectRevert(StaleVault.StaleOracle.selector);
        zap.swapAndDeposit(address(stale), address(tokenIn), 1e18, 500, 0, 0, block.timestamp, receiver);
        assertEq(tokenIn.balanceOf(user), 1e30); // whole tx rolled back
    }

    // --- refund, reentrancy, dust, admin ---

    function test_leftoverRefunded() public {
        router.setSpendBps(6_000);
        uint256 before = tokenIn.balanceOf(user);
        _zap(address(tokenIn), 100e18, 0);
        assertEq(before - tokenIn.balanceOf(user), 60e18);
        assertEq(tokenIn.balanceOf(address(zap)), 0);
        assertEq(tokenIn.allowance(address(zap), address(router)), 0);
    }

    function test_reentrancyBlocked() public {
        ReentrantToken evil = new ReentrantToken();
        zap.setWhitelisted(address(evil), true);
        evil.mint(user, 10e18);
        evil.arm(zap, address(vault));
        vm.startPrank(user);
        evil.approve(address(zap), type(uint256).max);
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        zap.swapAndDeposit(address(vault), address(evil), 1e18, 500, 0, 0, block.timestamp, receiver);
        vm.stopPrank();
    }

    function test_strayBalancesNotPaidToCaller() public {
        tokenIn.mint(address(zap), 7e18);
        usdg.mint(address(zap), 9e18);
        _zap(address(tokenIn), 100e18, 0);
        assertEq(usdg.balanceOf(address(vault)), 200e18);
        assertEq(tokenIn.balanceOf(address(zap)), 7e18);
        assertEq(usdg.balanceOf(address(zap)), 9e18);
    }

    function test_onlyOwnerWhitelists() public {
        vm.prank(user);
        vm.expectRevert();
        zap.setWhitelisted(address(tokenIn), false);
    }

    function test_constructorRejectsEoa() public {
        vm.expectRevert(SiroZap.InvalidAddress.selector);
        new SiroZap(address(this), ISwapRouter02(address(0x1234)), IWETH9(address(weth)), factory);
    }

    // --- fuzz ---

    function testFuzz_minOut(uint96 amountIn, uint256 minOut) public {
        vm.assume(amountIn > 0);
        uint256 expected = uint256(amountIn) * 2;
        vm.prank(user);
        if (minOut > expected) {
            vm.expectRevert();
            zap.swapAndDeposit(address(vault), address(tokenIn), amountIn, 500, minOut, 0, block.timestamp, receiver);
        } else {
            uint256 shares = zap.swapAndDeposit(address(vault), address(tokenIn), amountIn, 500, minOut, 0, block.timestamp, receiver);
            assertEq(vault.balanceOf(receiver), shares);
            assertEq(usdg.balanceOf(address(vault)), expected);
        }
    }

    function testFuzz_amountInAndSpend(uint128 amountIn, uint16 spendBps) public {
        amountIn = uint128(bound(amountIn, 1, 1e30));
        spendBps = uint16(bound(spendBps, 1, 10_000));
        router.setSpendBps(spendBps);
        uint256 spent = uint256(amountIn) * spendBps / 10_000;
        vm.assume(spent > 0);
        uint256 before = tokenIn.balanceOf(user);
        _zap(address(tokenIn), amountIn, 0);
        assertEq(before - tokenIn.balanceOf(user), spent);
        assertEq(tokenIn.balanceOf(address(zap)), 0);
        assertEq(usdg.balanceOf(address(zap)), 0);
    }
}
