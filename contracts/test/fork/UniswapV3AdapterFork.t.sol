// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {RobinhoodForkTest} from "./BaseFork.t.sol";
import {UniswapV3Adapter, IV3Factory, ISwapRouter02} from "../../src/UniswapV3Adapter.sol";
import {RobinhoodChain} from "../../config/RobinhoodChain.sol";
contract UniswapV3AdapterForkTest is RobinhoodForkTest {
    function test_swapRealUsdgForWeth() public {
        UniswapV3Adapter adapter = new UniswapV3Adapter(address(this), IV3Factory(RobinhoodChain.UNISWAP_V3_FACTORY), ISwapRouter02(RobinhoodChain.SWAP_ROUTER_02));
        adapter.setRoute(address(usdg), address(weth), 500);
        _dealUsdg(address(this), 100e6);
        usdg.approve(address(adapter), 100e6);
        uint256 beforeBalance = weth.balanceOf(address(this));
        // Smoke test for wiring only. Production minimum is enforced by GuardedVault's oracle.
        uint256 out = adapter.swap(address(usdg), address(weth), 100e6, 1, address(this));
        assertGt(out, 0);
        assertEq(weth.balanceOf(address(this)) - beforeBalance, out);
        assertEq(usdg.balanceOf(address(this)), 0);
        assertEq(usdg.allowance(address(adapter), address(adapter.router())), 0);
    }
}
