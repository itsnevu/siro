// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ChainlinkOracle, IAggregatorV3, IStockToken} from "../../src/ChainlinkOracle.sol";

/// Real AAPL token, AAPL/USD and USDG/USD feeds on a 4663 fork: the v2 oracle values a raw AAPL unit
/// at price * uiMultiplier, while the deployed v1 oracle values it at price alone.
/// Run: RH_RPC_URL=<rpc> forge test --match-contract OracleMultiplierFork -vv
contract OracleMultiplierFork is Test {
    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address constant AAPL_FEED = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant USDG_FEED = 0x61B7e5650328764B076A108EFF5fa7282a1B9aD2;
    address constant V1 = 0x18d197cD6454eF08d80c5FA92209B3aF31926ea9;

    function test_v2ClosesTheMultiplierGap() public {
        vm.createSelectFork(vm.envString("RH_RPC_URL"));
        ChainlinkOracle v2 = new ChainlinkOracle(address(this));
        v2.setFeed(USDG, IAggregatorV3(USDG_FEED), false);
        v2.setFeed(AAPL, IAggregatorV3(AAPL_FEED), true);
        uint256 m = IStockToken(AAPL).uiMultiplier();
        (uint256 v2Out,) = v2.quote(AAPL, USDG, 1e18);
        (uint256 v1Out,) = ChainlinkOracle(V1).quote(AAPL, USDG, 1e18);
        console.log("uiMultiplier", m);
        console.log("v1 USDG per AAPL unit", v1Out);
        console.log("v2 USDG per AAPL unit", v2Out);
        assertGt(m, 1e18);
        assertApproxEqRel(v2Out, v1Out * m / 1e18, 1e10); // v2 = v1 * multiplier (1e-8 relative rounding)
        assertGt(v2Out, v1Out);
    }
}
