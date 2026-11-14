// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {RobinhoodForkTest} from "./BaseFork.t.sol";
import {RobinhoodChain} from "../../config/RobinhoodChain.sol";
import {SiroZap, IWETH9, IVaultFactory} from "../../src/SiroZap.sol";
import {ISwapRouter02} from "../../src/UniswapV3Adapter.sol";

/// Real SwapRouter02, WETH9, GuardedVaultFactory and the live vault on a mainnet fork.
/// Run: RH_RPC_URL=<rpc> forge test --match-contract SiroZapForkTest -vv
contract SiroZapForkTest is RobinhoodForkTest {
    address constant VAULT_FACTORY = 0x33f420792328958739e4983A9Bac7FB44297Cf91;
    SiroZap zap;
    address vault;
    address user = makeAddr("user");

    function setUp() public override {
        super.setUp();
        zap = new SiroZap(address(this), ISwapRouter02(RobinhoodChain.SWAP_ROUTER_02), IWETH9(RobinhoodChain.WETH), IVaultFactory(VAULT_FACTORY));
        zap.setWhitelisted(RobinhoodChain.WETH, true);
        (, bytes memory ret) = VAULT_FACTORY.staticcall(abi.encodeWithSignature("vaults(uint256)", 0));
        vault = abi.decode(ret, (address));
        vm.deal(user, 10 ether);
        _dealWeth(user, 10 ether);
        vm.prank(user);
        weth.approve(address(zap), type(uint256).max);
    }

    function _measure(address tokenIn, uint24 fee, uint256 value) internal {
        vm.prank(user);
        uint256 g = gasleft();
        uint256 shares = zap.swapAndDeposit{value: value}(vault, tokenIn, 0.01 ether, fee, 1, 1, block.timestamp, user);
        g -= gasleft();
        assertGt(shares, 0);
        assertEq(IERC4626(vault).balanceOf(user), shares);
        emit log_named_uint(string.concat(tokenIn == address(0) ? "native fee " : "weth fee ", vm.toString(uint256(fee)), " gas"), g);
    }

    function test_gas_weth_100() public { _measure(RobinhoodChain.WETH, 100, 0); }
    function test_gas_weth_500() public { _measure(RobinhoodChain.WETH, 500, 0); }
    function test_gas_weth_3000() public { _measure(RobinhoodChain.WETH, 3000, 0); }
    function test_gas_native_500() public { _measure(address(0), 500, 0.01 ether); }
}
