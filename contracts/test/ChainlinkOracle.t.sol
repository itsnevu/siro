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
    uint256 public uiMultiplier = 1e18;
    function setUiMultiplier(uint256 m) external { uiMultiplier = m; }
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

    function _withSequencer(int256 status, uint256 startedAt) internal returns (MockAggregatorV3 seq) {
        seq = new MockAggregatorV3(0, "L2 Sequencer Uptime");
        seq.setAnswer(status, startedAt, 1);
        vm.prank(owner);
        oracle.setSequencerFeed(IAggregatorV3(address(seq)));
    }

    function test_audit_revertsWhileSequencerDown() public {
        _withSequencer(1, block.timestamp - 10 hours);
        vm.expectRevert(ChainlinkOracle.SequencerDown.selector);
        oracle.quote(address(nvda), address(usdg), 1e18);
    }

    function test_audit_revertsDuringSequencerGrace() public {
        _withSequencer(0, block.timestamp - 10 minutes);
        vm.expectRevert(ChainlinkOracle.SequencerDown.selector);
        oracle.quote(address(nvda), address(usdg), 1e18);
    }

    function test_audit_quotesAfterSequencerGrace() public {
        _withSequencer(0, block.timestamp - 2 hours);
        (uint256 out,) = oracle.quote(address(nvda), address(usdg), 1e18);
        assertGt(out, 0);
    }

    function test_audit_sequencerFeedIsWriteOnce() public {
        _withSequencer(0, block.timestamp - 2 hours);
        vm.prank(owner);
        vm.expectRevert(ChainlinkOracle.FeedAlreadySet.selector);
        oracle.setSequencerFeed(IAggregatorV3(address(usdgFeed)));
    }

    // --- uiMultiplier (dividend and split adjustments) ---
    // Fixture from Robinhood Chain on 2026-11-15: AAPL uiMultiplier 1.001090616965388660, price $357.19.

    function test_multiplierOneIsUnchanged() public view {
        (uint256 out,) = oracle.quote(address(nvda), address(usdg), 1e18);
        assertEq(out, 165_430_000); // $165.43, same as before the change
    }

    function test_multiplierScalesStockValue() public {
        nvdaFeed.setAnswer(357_19e6, block.timestamp - 300, 2);
        (uint256 before,) = oracle.quote(address(nvda), address(usdg), 1e18);
        assertEq(before, 357_190_000); // v1 value: raw units priced as whole shares
        nvda.setUiMultiplier(1_001_090_616_965_388_660);
        (uint256 adjusted,) = oracle.quote(address(nvda), address(usdg), 1e18);
        assertEq(adjusted, 357_579_557); // 357.19 * 1.00109061696... = 357.579557 USDG
        assertEq(adjusted - before, 389_557); // the 0.109% gap v1 left uncounted
    }

    function test_splitDoublesValueOfHeldUnits() public {
        nvda.setUiMultiplier(2e18); // 2-for-1 split: each unit is now two shares at half the price
        nvdaFeed.setAnswer(82_715e5, block.timestamp - 300, 2); // $82.715 per share
        (uint256 out,) = oracle.quote(address(nvda), address(usdg), 1e18);
        assertEq(out, 165_430_000); // holding value unchanged across the split
    }

    function test_multiplierAppliesInBothDirections() public {
        nvda.setUiMultiplier(1_001_090_616_965_388_660);
        (uint256 units,) = oracle.quote(address(usdg), address(nvda), 165_430_000);
        // USDG -> stock buys fewer raw units because each unit is worth more than one share.
        assertApproxEqAbs(units, uint256(1e18) * 1e18 / 1_001_090_616_965_388_660, 1e11); // 8-decimal feed rounding
    }

    function test_zeroMultiplierReverts() public {
        nvda.setUiMultiplier(0);
        vm.expectRevert(ChainlinkOracle.InvalidPrice.selector);
        oracle.quote(address(nvda), address(usdg), 1e18);
    }

    function test_nonStockFeedIgnoresMultiplier() public view {
        (uint256 out,) = oracle.quote(address(usdg), address(usdg), 1e6);
        assertEq(out, 1e6);
    }
}
