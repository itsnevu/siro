// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ChainlinkOracle, IAggregatorV3} from "../src/ChainlinkOracle.sol";
import {MockAggregatorV3} from "./mocks/MockAggregatorV3.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// Robinhood Stock Tokens expose oraclePaused() while a corporate action is processed.
contract MockStockToken is MockERC20 {
    bool public oraclePaused;
    constructor() MockERC20("NVIDIA", "NVDA", 18) {}
    function setOraclePaused(bool p) external { oraclePaused = p; }
}

contract ChainlinkOracleTest is Test {
    ChainlinkOracle oracle;
    MockERC20 usdg;
    MockStockToken nvda;
    MockAggregatorV3 usdgFeed;
    MockAggregatorV3 nvdaFeed;
    address owner = makeAddr("owner");

    function setUp() public {
        vm.warp(1_800_000_000);
        usdg = new MockERC20("Global Dollar", "USDG", 6);
        nvda = new MockStockToken();
        usdgFeed = new MockAggregatorV3(8, "USDG / USD");
        nvdaFeed = new MockAggregatorV3(8, "Robinhood NVDA / USD");
        usdgFeed.setAnswer(1e8, block.timestamp - 100, 1);         // $1.00
        nvdaFeed.setAnswer(165_43e6, block.timestamp - 300, 1);   // $165.43

        oracle = new ChainlinkOracle(owner);
        vm.startPrank(owner);
        oracle.setFeed(address(usdg), IAggregatorV3(address(usdgFeed)), false);
        oracle.setFeed(address(nvda), IAggregatorV3(address(nvdaFeed)), true);
        vm.stopPrank();
    }

    function test_quotesStockInBaseAcrossDecimals() public view {
        (uint256 out, uint256 updatedAt) = oracle.quote(address(nvda), address(usdg), 2e18);
        assertEq(out, 330_86e4); // 2 NVDA = 330.86 USDG (6 decimals)
        assertEq(updatedAt, block.timestamp - 300); // oldest of the two feeds
    }

    function test_quotesBaseInStock() public view {
        (uint256 out,) = oracle.quote(address(usdg), address(nvda), 165_43e4); // 165.43 USDG
        assertEq(out, 1e18);
    }

    function test_baseDepegIsPricedIn() public {
        usdgFeed.setAnswer(0.98e8, block.timestamp, 2);
        (uint256 out,) = oracle.quote(address(nvda), address(usdg), 1e18);
        assertEq(out, 168_806122); // 165.43 / 0.98, floored
    }

    function test_revertsOnNonPositiveAnswer() public {
        nvdaFeed.setAnswer(0, block.timestamp, 2);
        vm.expectRevert(ChainlinkOracle.InvalidPrice.selector);
        oracle.quote(address(nvda), address(usdg), 1e18);
    }

    function test_revertsWhileTokenOracleIsPaused() public {
        nvda.setOraclePaused(true);
        vm.expectRevert(ChainlinkOracle.PriceUnavailable.selector);
        oracle.quote(address(nvda), address(usdg), 1e18);
    }

    function test_revertsForUnknownToken() public {
        vm.expectRevert(ChainlinkOracle.FeedNotSet.selector);
        oracle.quote(makeAddr("unknown"), address(usdg), 1e18);
    }

    function test_feedCannotBeReplaced() public {
        MockAggregatorV3 evil = new MockAggregatorV3(8, "evil");
        vm.prank(owner);
        vm.expectRevert(ChainlinkOracle.FeedAlreadySet.selector);
        oracle.setFeed(address(nvda), IAggregatorV3(address(evil)), true);
    }

    function test_onlyOwnerSetsFeeds() public {
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        vm.expectRevert();
        oracle.setFeed(address(other), IAggregatorV3(address(nvdaFeed)), false);
    }
}
