// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SiroRiskGuard} from "../src/SiroRiskGuard.sol";

contract SiroRiskGuardTest is Test {
    SiroRiskGuard public guard;

    address public copyVault = makeAddr("copyVault");
    address public alice = makeAddr("alice");
    address public tokenA = makeAddr("tokenA");
    address public tokenB = makeAddr("tokenB");

    uint256 constant VAULT_BAL = 10_000 * 1e6;

    function setUp() public {
        guard = new SiroRiskGuard();
        guard.setCopyVault(copyVault);
    }

    // -------------------------------------------------- defaults

    function test_defaults_uninitializedUser() public view {
        (uint16 maxTrade, uint16 daily, uint16 maxPos, uint16 slip, bool kill, bool init) = guard.getRiskConfig(alice);
        assertEq(maxTrade, 1_000);
        assertEq(daily, 500);
        assertEq(maxPos, 2_500);
        assertEq(slip, 100);
        assertFalse(kill);
        assertFalse(init);
    }

    // ------------------------------------------- setRiskConfig

    function test_setRiskConfig_success() public {
        vm.prank(alice);
        guard.setRiskConfig(2_000, 1_000, 5_000, 200);

        (uint16 maxTrade,,,,, bool init) = guard.getRiskConfig(alice);
        assertEq(maxTrade, 2_000);
        assertTrue(init);
    }

    function test_setRiskConfig_rejectsZero() public {
        vm.prank(alice);
        vm.expectRevert(SiroRiskGuard.InvalidBps.selector);
        guard.setRiskConfig(0, 500, 2_500, 100);
    }

    function test_setRiskConfig_rejectsOver10k() public {
        vm.prank(alice);
        vm.expectRevert(SiroRiskGuard.InvalidBps.selector);
        guard.setRiskConfig(10_001, 500, 2_500, 100);
    }

    // ------------------------------------------- kill switch

    function test_killSwitch_blocksTrades() public {
        vm.prank(alice);
        guard.setKillSwitch(true);

        bool ok = guard.validateTrade(alice, tokenA, tokenB, 100 * 1e6, VAULT_BAL);
        assertFalse(ok);

        vm.prank(alice);
        guard.setKillSwitch(false);
        ok = guard.validateTrade(alice, tokenA, tokenB, 100 * 1e6, VAULT_BAL);
        assertTrue(ok);
    }

    // ----------------------------------------- max trade size

    function test_maxTradeSize_default10pct() public {
        vm.startPrank(alice);
        guard.setRiskConfig(1_000, 5_000, 5_000, 100); // 10% max trade, 50% daily loss
        guard.setTokenWhitelistBatch(_tokens(), true);
        vm.stopPrank();

        // 10% of 10k = 1k. Trade 1k should pass, 1001 should fail.
        bool ok = guard.validateTrade(alice, tokenA, tokenB, 1_000 * 1e6, VAULT_BAL);
        assertTrue(ok);

        ok = guard.validateTrade(alice, tokenA, tokenB, 1_001 * 1e6, VAULT_BAL);
        assertFalse(ok);
    }

    // ------------------------------------------ daily loss

    function test_dailyLoss_enforced() public {
        // Default daily loss = 5% of 10k = 500
        // Record a trade of 400
        vm.prank(copyVault);
        guard.recordTrade(alice, tokenA, tokenB, 400 * 1e6, 400 * 1e6);

        assertEq(guard.getDailyLoss(alice), 400 * 1e6);

        // Next trade of 200 should exceed daily limit (400 + 200 > 500)
        bool ok = guard.validateTrade(alice, tokenA, tokenB, 200 * 1e6, VAULT_BAL);
        assertFalse(ok);

        // But 100 should be fine
        ok = guard.validateTrade(alice, tokenA, tokenB, 100 * 1e6, VAULT_BAL);
        assertTrue(ok);
    }

    // -------------------------------------- position tracking

    function test_positionTracking() public {
        // Set high trade/daily limits so only position limit is tested
        vm.prank(alice);
        guard.setRiskConfig(10_000, 10_000, 2_500, 100); // 25% max position
        // Whitelist tokens since config is initialized
        vm.prank(alice);
        guard.setTokenWhitelistBatch(_tokens(), true);

        vm.startPrank(copyVault);
        guard.recordTrade(alice, tokenA, tokenB, 2_000 * 1e6, 2_000 * 1e6);
        vm.stopPrank();

        assertEq(guard.getTokenPosition(alice, tokenB), 2_000 * 1e6);

        // Trying to add 600 more to tokenB (2000 + 600 > 2500) should fail
        bool ok = guard.validateTrade(alice, tokenA, tokenB, 600 * 1e6, VAULT_BAL);
        assertFalse(ok);

        // 500 should pass
        ok = guard.validateTrade(alice, tokenA, tokenB, 500 * 1e6, VAULT_BAL);
        assertTrue(ok);
    }

    function _tokens() internal view returns (address[] memory) {
        address[] memory t = new address[](2);
        t[0] = tokenA;
        t[1] = tokenB;
        return t;
    }

    // ---------------------------------------- token whitelist

    function test_tokenWhitelist_enforced() public {
        vm.startPrank(alice);
        guard.setRiskConfig(1_000, 500, 2_500, 100);
        guard.setTokenWhitelist(tokenA, true);
        // tokenB not whitelisted
        vm.stopPrank();

        bool ok = guard.validateTrade(alice, tokenA, tokenB, 100 * 1e6, VAULT_BAL);
        assertFalse(ok); // tokenB not allowed

        vm.prank(alice);
        guard.setTokenWhitelist(tokenB, true);
        ok = guard.validateTrade(alice, tokenA, tokenB, 100 * 1e6, VAULT_BAL);
        assertTrue(ok);
    }

    function test_tokenWhitelistBatch() public {
        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;

        vm.prank(alice);
        guard.setTokenWhitelistBatch(tokens, true);

        assertTrue(guard.isTokenAllowed(alice, tokenA));
        assertTrue(guard.isTokenAllowed(alice, tokenB));
    }

    // ---------------------------------------- recordTrade auth

    function test_recordTrade_onlyCopyVault() public {
        vm.prank(alice);
        vm.expectRevert(SiroRiskGuard.Unauthorized.selector);
        guard.recordTrade(alice, tokenA, tokenB, 100, 100);
    }

    // ------------------------------------------- admin

    function test_setCopyVault_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(SiroRiskGuard.Unauthorized.selector);
        guard.setCopyVault(alice);
    }

    function test_setCopyVault_rejectsZero() public {
        vm.expectRevert(SiroRiskGuard.ZeroAddress.selector);
        guard.setCopyVault(address(0));
    }

    function test_slippanceTolerance_view() public {
        assertEq(guard.getSlippageTolerance(alice), 100); // default

        vm.prank(alice);
        guard.setRiskConfig(1_000, 500, 2_500, 250);
        assertEq(guard.getSlippageTolerance(alice), 250);
    }
}
