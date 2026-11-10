// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SiroLeaderboard} from "../src/SiroLeaderboard.sol";

contract SiroLeaderboardTest is Test {
    SiroLeaderboard public board;

    address public copyVault = makeAddr("copyVault");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public updater = makeAddr("updater");

    function setUp() public {
        board = new SiroLeaderboard();
        board.setCopyVault(copyVault);
        board.setUpdater(updater, true);
    }

    // ------------------------------------------ register

    function test_register_success() public {
        vm.prank(alice);
        board.register("Alice Strategy");

        assertTrue(board.isLeader(alice));
        assertEq(board.getLeaderCount(), 1);

        SiroLeaderboard.Leader memory l = board.getLeaderStats(alice);
        assertEq(l.wallet, alice);
        assertEq(l.name, "Alice Strategy");
        assertTrue(l.active);
        assertGt(l.registeredAt, 0);
    }

    function test_register_rejectsDouble() public {
        vm.prank(alice);
        board.register("Alice");

        vm.prank(alice);
        vm.expectRevert(SiroLeaderboard.AlreadyRegistered.selector);
        board.register("Alice 2");
    }

    function test_register_rejectsLongName() public {
        string memory longName = new string(65);
        vm.prank(alice);
        vm.expectRevert(SiroLeaderboard.NameTooLong.selector);
        board.register(longName);
    }

    // ---------------------------------------- setName

    function test_setName() public {
        vm.prank(alice);
        board.register("Old");
        vm.prank(alice);
        board.setName("New");
        assertEq(board.getLeaderStats(alice).name, "New");
    }

    function test_setName_notRegistered() public {
        vm.prank(alice);
        vm.expectRevert(SiroLeaderboard.NotRegistered.selector);
        board.setName("X");
    }

    // ---------------------------------- deactivate/reactivate

    function test_deactivate_reactivate() public {
        vm.prank(alice);
        board.register("Alice");

        vm.prank(alice);
        board.deactivate();
        assertFalse(board.getLeaderStats(alice).active);

        vm.prank(alice);
        board.reactivate();
        assertTrue(board.getLeaderStats(alice).active);
    }

    // ---------------------------------------- updateStats

    function test_updateStats_onlyUpdater() public {
        vm.prank(alice);
        board.register("Alice");

        vm.prank(bob);
        vm.expectRevert(SiroLeaderboard.Unauthorized.selector);
        board.updateStats(alice, 500, 180, 300, 1000 * 1e6, 5);

        vm.prank(updater);
        board.updateStats(alice, 500, 180, 300, 1000 * 1e6, 5);

        SiroLeaderboard.Leader memory l = board.getLeaderStats(alice);
        assertEq(l.totalPnl, 500);
        assertEq(l.sharpeScore, 180);
        assertEq(l.maxDrawdown, 300);
        assertEq(l.totalVolume, 1000 * 1e6);
        assertEq(l.tradeCount, 5);
    }

    function test_updateStats_accumulates() public {
        vm.prank(alice);
        board.register("Alice");

        vm.startPrank(updater);
        board.updateStats(alice, 100, 150, 50, 500 * 1e6, 3);
        board.updateStats(alice, 200, 160, 80, 300 * 1e6, 2);
        vm.stopPrank();

        SiroLeaderboard.Leader memory l = board.getLeaderStats(alice);
        assertEq(l.totalPnl, 200); // overwritten
        assertEq(l.totalVolume, 800 * 1e6); // accumulated
        assertEq(l.tradeCount, 5); // accumulated
    }

    // -------------------------------- updateFollowerCount

    function test_followerCount_fromCopyVault() public {
        vm.prank(alice);
        board.register("Alice");

        vm.prank(copyVault);
        board.updateFollowerCount(alice, true);
        assertEq(board.getLeaderStats(alice).followerCount, 1);

        vm.prank(copyVault);
        board.updateFollowerCount(alice, true);
        assertEq(board.getLeaderStats(alice).followerCount, 2);

        vm.prank(copyVault);
        board.updateFollowerCount(alice, false);
        assertEq(board.getLeaderStats(alice).followerCount, 1);
    }

    function test_followerCount_noUnderflow() public {
        vm.prank(alice);
        board.register("Alice");

        vm.prank(copyVault);
        board.updateFollowerCount(alice, false); // should not underflow
        assertEq(board.getLeaderStats(alice).followerCount, 0);
    }

    function test_followerCount_unauthorized() public {
        vm.prank(alice);
        board.register("Alice");

        vm.prank(bob);
        vm.expectRevert(SiroLeaderboard.Unauthorized.selector);
        board.updateFollowerCount(alice, true);
    }

    // ---------------------------------- getActiveLeaders

    function test_getActiveLeaders_filtersInactive() public {
        vm.prank(alice);
        board.register("Alice");
        vm.prank(bob);
        board.register("Bob");

        vm.prank(alice);
        board.deactivate();

        SiroLeaderboard.Leader[] memory active = board.getActiveLeaders(0, 10);
        assertEq(active.length, 1);
        assertEq(active[0].wallet, bob);
    }

    function test_getActiveLeaders_pagination() public {
        vm.prank(alice);
        board.register("Alice");
        vm.prank(bob);
        board.register("Bob");

        SiroLeaderboard.Leader[] memory list = board.getActiveLeaders(0, 1);
        assertEq(list.length, 1);
        assertEq(list[0].wallet, alice);
    }

    function test_getActiveLeaders_emptyOnOffsetPastEnd() public view {
        SiroLeaderboard.Leader[] memory list = board.getActiveLeaders(100, 10);
        assertEq(list.length, 0);
    }

    // ------------------------------------------ getLeaders

    function test_getLeaders_includesInactive() public {
        vm.prank(alice);
        board.register("Alice");
        vm.prank(bob);
        board.register("Bob");

        vm.prank(alice);
        board.deactivate();

        SiroLeaderboard.Leader[] memory all = board.getLeaders(0, 10);
        assertEq(all.length, 2);
    }

    // -------------------------------------------- admin

    function test_admin_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(SiroLeaderboard.Unauthorized.selector);
        board.setCopyVault(alice);

        vm.prank(alice);
        vm.expectRevert(SiroLeaderboard.Unauthorized.selector);
        board.setUpdater(alice, true);

        vm.prank(alice);
        vm.expectRevert(SiroLeaderboard.Unauthorized.selector);
        board.transferOwnership(alice);
    }

    function test_transferOwnership() public {
        board.transferOwnership(alice);
        vm.prank(alice);
        board.setUpdater(bob, true);
        assertTrue(board.updaters(bob));
    }
}
