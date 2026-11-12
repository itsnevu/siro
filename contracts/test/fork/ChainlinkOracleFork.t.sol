// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ChainlinkOracle, IAggregatorV3} from "../../src/ChainlinkOracle.sol";

/// Run with RH_RPC_URL set. Addresses come from api.robinhood.com/rhj (tokens) and
/// Chainlink's reference data directory feeds-robinhood-mainnet.json (feeds).
contract ChainlinkOracleForkTest is Test {
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address constant USDG_FEED = 0x61B7e5650328764B076A108EFF5fa7282a1B9aD2;
    address constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address constant AAPL_FEED = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;

    ChainlinkOracle oracle;

    function setUp() public {
        vm.createSelectFork(vm.envString("RH_RPC_URL"));
        oracle = new ChainlinkOracle(address(this));
        oracle.setFeed(USDG, IAggregatorV3(USDG_FEED), false);
        oracle.setFeed(NVDA, IAggregatorV3(NVDA_FEED), true);
        oracle.setFeed(AAPL, IAggregatorV3(AAPL_FEED), true);
    }

    function test_quotesRealStockTokensInUsdg() public view {
        (uint256 nvdaInUsdg, uint256 at) = oracle.quote(NVDA, USDG, 1e18);
        (uint256 aaplInUsdg,) = oracle.quote(AAPL, USDG, 1e18);
        console.log("1 NVDA in USDG (6dp):", nvdaInUsdg);
        console.log("1 AAPL in USDG (6dp):", aaplInUsdg);
        console.log("oldest update age (s):", block.timestamp - at);
        assertGt(nvdaInUsdg, 10e6);
        assertLt(nvdaInUsdg, 10_000e6);
        assertGt(aaplInUsdg, 10e6);
        assertLt(aaplInUsdg, 10_000e6);
    }
}
