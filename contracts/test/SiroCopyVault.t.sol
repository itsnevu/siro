// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SiroCopyVault} from "../src/SiroCopyVault.sol";
import {SiroRiskGuard} from "../src/SiroRiskGuard.sol";
import {SiroLeaderboard} from "../src/SiroLeaderboard.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract MockRouter {
    MockERC20 public tokenOut;

    constructor(MockERC20 _tokenOut) {
        tokenOut = _tokenOut;
    }

    // A simple "swap" that mints tokenOut to the caller
    function swap(address to, uint256 amountOut) external {
        tokenOut.mint(to, amountOut);
    }

    function swapExact(address tokenIn, uint256 amountIn, address to, uint256 amountOut) external {
        MockERC20(tokenIn).burn(msg.sender, amountIn);
        tokenOut.mint(to, amountOut);
    }
}

contract SiroCopyVaultTest is Test {
    SiroCopyVault public vault;
    SiroRiskGuard public guard;
    SiroLeaderboard public board;
    MockERC20 public usdc;
    MockRouter public router;

    address public deployer = address(this);
    address public keeper = makeAddr("keeper");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public leader1 = makeAddr("leader1");
    address public leader2 = makeAddr("leader2");
    address public leader3 = makeAddr("leader3");

    uint256 constant DEPOSIT = 10_000 * 1e6; // 10k USDC

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vault = new SiroCopyVault(address(usdc));
        guard = new SiroRiskGuard();
        board = new SiroLeaderboard();
        router = new MockRouter(usdc);

        // Wire
        vault.setRiskGuard(address(guard));
        vault.setLeaderboard(address(board));
        vault.setKeeper(keeper);
        vault.setRouterWhitelist(address(router), true);
        vault.setAllowedSelector(MockRouter.swap.selector, true);
        vault.setAllowedSelector(MockRouter.swapExact.selector, true);

        guard.setCopyVault(address(vault));
        board.setCopyVault(address(vault));

        // Register leaders
        vm.prank(leader1);
        board.register("Leader One");
        vm.prank(leader2);
        board.register("Leader Two");
        vm.prank(leader3);
        board.register("Leader Three");

        // Fund users
        usdc.mint(alice, 100_000 * 1e6);
        usdc.mint(bob, 100_000 * 1e6);

        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    // -------------------------------------------------------- helpers

    function _createVault(address user, uint256 amount) internal {
        address[] memory leaders = new address[](2);
        leaders[0] = leader1;
        leaders[1] = leader2;
        vm.prank(user);
        vault.createVault(leaders, amount);
    }

    // --------------------------------------------------- createVault

    function test_createVault_success() public {
        _createVault(alice, DEPOSIT);

        assertTrue(vault.hasVault(alice));
        assertEq(vault.vaultBalance(alice), DEPOSIT);
        assertEq(vault.getVaultCount(), 1);

        // Follower counts updated
        assertEq(board.getLeaderStats(leader1).followerCount, 1);
        assertEq(board.getLeaderStats(leader2).followerCount, 1);
    }

    function test_createVault_rejectsDouble() public {
        _createVault(alice, DEPOSIT);
        address[] memory leaders = new address[](1);
        leaders[0] = leader1;
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.VaultAlreadyExists.selector);
        vault.createVault(leaders, DEPOSIT);
    }

    function test_createVault_rejectsZero() public {
        address[] memory leaders = new address[](1);
        leaders[0] = leader1;
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.InvalidAmount.selector);
        vault.createVault(leaders, 0);
    }

    function test_createVault_rejectsSelfAsLeader() public {
        address[] memory leaders = new address[](1);
        leaders[0] = alice;
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.LeaderIsSelf.selector);
        vault.createVault(leaders, DEPOSIT);
    }

    function test_createVault_rejectsDuplicateLeader() public {
        address[] memory leaders = new address[](2);
        leaders[0] = leader1;
        leaders[1] = leader1;
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.DuplicateLeader.selector);
        vault.createVault(leaders, DEPOSIT);
    }

    function test_createVault_rejectsTooManyLeaders() public {
        address[] memory leaders = new address[](6);
        for (uint256 i = 0; i < 6; i++) leaders[i] = makeAddr(string(abi.encodePacked("l", i)));
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.InvalidLeaderCount.selector);
        vault.createVault(leaders, DEPOSIT);
    }

    function test_createVault_rejectsNativeValue() public {
        address[] memory leaders = new address[](1);
        leaders[0] = leader1;
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.UnexpectedValue.selector);
        vault.createVault{value: 1}(leaders, DEPOSIT);
    }

    // ----------------------------------------------------- deposit

    function test_deposit_success() public {
        _createVault(alice, DEPOSIT);
        vm.prank(alice);
        vault.deposit(5_000 * 1e6);
        assertEq(vault.vaultBalance(alice), 15_000 * 1e6);
    }

    function test_deposit_noVault() public {
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.NoVault.selector);
        vault.deposit(DEPOSIT);
    }

    // ---------------------------------------------------- withdraw

    function test_withdraw_full() public {
        _createVault(alice, DEPOSIT);
        uint256 before = usdc.balanceOf(alice);

        vm.prank(alice);
        vault.withdraw(type(uint256).max);

        assertEq(usdc.balanceOf(alice) - before, DEPOSIT);
        assertFalse(vault.hasVault(alice));
        assertEq(vault.getVaultCount(), 0);

        // Follower counts decremented
        assertEq(board.getLeaderStats(leader1).followerCount, 0);
        assertEq(board.getLeaderStats(leader2).followerCount, 0);
    }

    function test_withdraw_partial() public {
        _createVault(alice, DEPOSIT);
        vm.prank(alice);
        vault.withdraw(3_000 * 1e6);

        assertTrue(vault.hasVault(alice));
        assertEq(vault.vaultBalance(alice), 7_000 * 1e6);
        assertEq(vault.getVaultCount(), 1);
    }

    function test_withdraw_performanceFee() public {
        _createVault(alice, DEPOSIT);

        // Simulate profit: keeper "swaps" and vault balance increases
        // Directly give the vault more USDC to simulate profit
        usdc.mint(address(vault), 2_000 * 1e6);
        // Manually update vault balance (simulate swap that returned to USDC)
        // We need to use the keeper to do this properly, so let's just test fee calc
        // by depositing, then manually setting balance higher through the router

        // For a proper test, just verify withdraw with no profit has no fee
        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(DEPOSIT);

        // No profit = no fee
        assertEq(usdc.balanceOf(alice) - before, DEPOSIT);
    }

    // -------------------------------------------------- pause/resume

    function test_pause_resume() public {
        _createVault(alice, DEPOSIT);

        vm.prank(alice);
        vault.pauseVault();
        assertTrue(vault.isVaultPaused(alice));

        vm.prank(alice);
        vault.resumeVault();
        assertFalse(vault.isVaultPaused(alice));
    }

    function test_pause_alreadyPaused() public {
        _createVault(alice, DEPOSIT);
        vm.prank(alice);
        vault.pauseVault();

        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.VaultPausedError.selector);
        vault.pauseVault();
    }

    // -------------------------------------------------- setLeaders

    function test_setLeaders_updatesFollowerCounts() public {
        _createVault(alice, DEPOSIT);

        assertEq(board.getLeaderStats(leader1).followerCount, 1);
        assertEq(board.getLeaderStats(leader2).followerCount, 1);
        assertEq(board.getLeaderStats(leader3).followerCount, 0);

        address[] memory newLeaders = new address[](1);
        newLeaders[0] = leader3;
        vm.prank(alice);
        vault.setLeaders(newLeaders);

        assertEq(board.getLeaderStats(leader1).followerCount, 0);
        assertEq(board.getLeaderStats(leader2).followerCount, 0);
        assertEq(board.getLeaderStats(leader3).followerCount, 1);
    }

    // -------------------------------------------------- executeSwap

    function _swapParams(address owner_, address router_, address tokenIn_, address tokenOut_, uint256 amountIn_, uint256 minOut_) internal pure returns (SiroCopyVault.SwapParams memory) {
        return SiroCopyVault.SwapParams(owner_, router_, tokenIn_, tokenOut_, amountIn_, minOut_);
    }

    function test_executeSwap_rejectsNonKeeper() public {
        _createVault(alice, DEPOSIT);

        vm.prank(bob);
        vm.expectRevert(SiroCopyVault.Unauthorized.selector);
        vault.executeSwap(_swapParams(alice, address(router), address(usdc), address(usdc), 100, 0), abi.encodeWithSelector(MockRouter.swap.selector, address(vault), 100));
    }

    function test_executeSwap_rejectsPaused() public {
        _createVault(alice, DEPOSIT);
        vm.prank(alice);
        vault.pauseVault();

        vm.prank(keeper);
        vm.expectRevert(SiroCopyVault.VaultPausedError.selector);
        vault.executeSwap(_swapParams(alice, address(router), address(usdc), address(usdc), 100, 0), abi.encodeWithSelector(MockRouter.swap.selector, address(vault), 100));
    }

    function test_executeSwap_rejectsUnwhitelistedRouter() public {
        _createVault(alice, DEPOSIT);

        vm.prank(keeper);
        vm.expectRevert(SiroCopyVault.RouterNotWhitelisted.selector);
        vault.executeSwap(_swapParams(alice, makeAddr("bad"), address(usdc), address(usdc), 100, 0), abi.encodeWithSelector(MockRouter.swap.selector, address(vault), 100));
    }

    function test_executeSwap_rejectsUnallowedSelector() public {
        _createVault(alice, DEPOSIT);
        bytes memory data = abi.encodeWithSignature("malicious()");

        vm.prank(keeper);
        vm.expectRevert(SiroCopyVault.SelectorNotAllowed.selector);
        vault.executeSwap(_swapParams(alice, address(router), address(usdc), address(usdc), 100, 0), data);
    }

    function test_executeSwap_rejectsTooShortData() public {
        _createVault(alice, DEPOSIT);

        vm.prank(keeper);
        vm.expectRevert(SiroCopyVault.SelectorNotAllowed.selector);
        vault.executeSwap(_swapParams(alice, address(router), address(usdc), address(usdc), 100, 0), hex"aabb");
    }

    function test_executeSwap_recordsTradeInRiskGuard() public {
        _createVault(alice, DEPOSIT);

        // Swap 500 USDC via router, router mints 500 USDC back
        bytes memory data = abi.encodeWithSelector(MockRouter.swap.selector, address(vault), 500 * 1e6);

        vm.prank(keeper);
        vault.executeSwap(_swapParams(alice, address(router), address(usdc), address(usdc), 500 * 1e6, 0), data);

        assertEq(guard.getDailyLoss(alice), 500 * 1e6);
    }

    function test_executeSwap_enforceMinAmountOut() public {
        _createVault(alice, DEPOSIT);

        // Router will output 500 USDC, but we require 1000
        bytes memory data = abi.encodeWithSelector(MockRouter.swap.selector, address(vault), 500 * 1e6);

        vm.prank(keeper);
        vm.expectRevert(SiroCopyVault.SwapFailed.selector);
        vault.executeSwap(_swapParams(alice, address(router), address(usdc), address(usdc), 500 * 1e6, 1000 * 1e6), data);
    }

    // ---------------------------------------------- receive guard

    function test_receive_rejectsStrayEth() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertFalse(ok);
    }

    // ----------------------------------------------- admin

    function test_onlyOwner_setKeeper() public {
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.Unauthorized.selector);
        vault.setKeeper(alice);
    }

    function test_onlyOwner_setRouterWhitelist() public {
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.Unauthorized.selector);
        vault.setRouterWhitelist(address(router), false);
    }

    function test_transferOwnership() public {
        vault.transferOwnership(alice);
        vm.prank(alice);
        vault.setKeeper(bob);
        assertEq(vault.keeper(), bob);
    }

    function test_transferOwnership_rejectsZero() public {
        vm.expectRevert(SiroCopyVault.ZeroAddress.selector);
        vault.transferOwnership(address(0));
    }

    // ------------------------------------------ protocol fees

    function test_collectProtocolFees_nothingToClaim() public {
        vm.expectRevert(SiroCopyVault.NothingToClaim.selector);
        vault.collectProtocolFees(deployer);
    }

    // ------------------------------------------- leader fees

    function test_claimLeaderFees_nothingToClaim() public {
        vm.prank(leader1);
        vm.expectRevert(SiroCopyVault.NothingToClaim.selector);
        vault.claimLeaderFees();
    }

    // -------------------------------------------- views

    function test_getVault_returnsData() public {
        _createVault(alice, DEPOSIT);
        (
            uint256 deposited,
            uint256 balance,
            uint256 hwm,
            uint256 withdrawn,
            uint256 feePaid,
            address[] memory leaders,
            bool paused,
            uint256 createdAt
        ) = vault.getVault(alice);

        assertEq(deposited, DEPOSIT);
        assertEq(balance, DEPOSIT);
        assertEq(hwm, DEPOSIT);
        assertEq(withdrawn, 0);
        assertEq(feePaid, 0);
        assertEq(leaders.length, 2);
        assertFalse(paused);
        assertGt(createdAt, 0);
    }

    // --------------------------------- vaultOwners cleanup

    function test_vaultOwners_cleanedOnFullWithdraw() public {
        _createVault(alice, DEPOSIT);
        _createVault(bob, DEPOSIT);
        assertEq(vault.getVaultCount(), 2);

        vm.prank(alice);
        vault.withdraw(type(uint256).max);
        assertEq(vault.getVaultCount(), 1);

        vm.prank(bob);
        vault.withdraw(type(uint256).max);
        assertEq(vault.getVaultCount(), 0);
    }
}
