// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SiroCopyVault} from "../src/SiroCopyVault.sol";
import {SiroRiskGuard} from "../src/SiroRiskGuard.sol";
import {SiroLeaderboard} from "../src/SiroLeaderboard.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract AuditRouter {
    function swap(address input, address output, uint256 amount, address recipient) external {
        require(MockERC20(input).transferFrom(msg.sender, address(this), amount));
        MockERC20(output).mint(recipient, amount);
    }

    function swapOutput(address input, address output, uint256 amountIn, uint256 amountOut) external {
        require(MockERC20(input).transferFrom(msg.sender, address(this), amountIn));
        MockERC20(output).mint(msg.sender, amountOut);
    }
}

/// These passing tests reproduce unsafe behavior; they are not safety assertions.
contract ReadinessAuditTest is Test {
    SiroCopyVault vault;
    SiroRiskGuard guard;
    SiroLeaderboard board;
    MockERC20 usdc;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address keeper = makeAddr("keeper");
    address leader = makeAddr("leader");
    uint256 constant DEPOSIT = 10_000 * 1e6;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vault = new SiroCopyVault(address(usdc));
        guard = new SiroRiskGuard();
        board = new SiroLeaderboard();
        vault.setRiskGuard(address(guard));
        vault.setLeaderboard(address(board));
        vault.setKeeper(keeper);
        guard.setCopyVault(address(vault));
        board.setCopyVault(address(vault));
        vm.prank(leader);
        board.register("Leader");
        usdc.mint(alice, 100_000 * 1e6);
        usdc.mint(bob, 100_000 * 1e6);
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _createVault(address user, uint256 amount) internal {
        address[] memory leaders = new address[](1);
        leaders[0] = leader;
        vm.prank(user);
        vault.createVault(leaders, amount);
    }
    function test_audit_anotherVaultCanSellUsersPosition() public {
        _createVault(alice, DEPOSIT);
        _createVault(bob, DEPOSIT);
        MockERC20 asset = new MockERC20("Asset", "ASSET", 6);
        AuditRouter dex = new AuditRouter();
        vault.setRouterWhitelist(address(dex), true);
        vault.setAllowedSelector(AuditRouter.swap.selector, true);
        uint256 amount = 500 * 1e6;

        vm.prank(keeper);
        vault.executeSwap(
            SiroCopyVault.SwapParams(alice, address(dex), address(usdc), address(asset), amount, amount),
            abi.encodeCall(dex.swap, (address(usdc), address(asset), amount, address(vault)))
        );
        // Bob never bought ASSET, but can spend Alice's pooled position.
        vm.prank(keeper);
        vault.executeSwap(
            SiroCopyVault.SwapParams(bob, address(dex), address(asset), address(usdc), amount, amount),
            abi.encodeCall(dex.swap, (address(asset), address(usdc), amount, address(vault)))
        );
        assertEq(vault.vaultBalance(bob), DEPOSIT + amount);
        assertEq(asset.balanceOf(address(vault)), 0);
        assertEq(guard.getTokenPosition(alice, address(asset)), amount);
        vm.prank(bob);
        vault.withdraw(type(uint256).max);
        assertGt(usdc.balanceOf(bob), 100_000 * 1e6);
    }

    function test_audit_keeperCanRedirectOutputWithZeroMinimum() public {
        _createVault(alice, DEPOSIT);
        MockERC20 asset = new MockERC20("Asset", "ASSET", 6);
        AuditRouter dex = new AuditRouter();
        vault.setRouterWhitelist(address(dex), true);
        vault.setAllowedSelector(AuditRouter.swap.selector, true);
        vm.startPrank(alice);
        guard.setRiskConfig(1000, 500, 2500, 1);
        guard.setTokenWhitelist(address(usdc), true);
        guard.setTokenWhitelist(address(asset), true);
        vm.stopPrank();
        uint256 amount = 500 * 1e6;
        vm.prank(keeper);
        vault.executeSwap(
            SiroCopyVault.SwapParams(alice, address(dex), address(usdc), address(asset), amount, 0),
            abi.encodeCall(dex.swap, (address(usdc), address(asset), amount, keeper))
        );
        assertEq(asset.balanceOf(keeper), amount);
        assertEq(vault.vaultBalance(alice), DEPOSIT - amount);
        assertEq(asset.balanceOf(address(vault)), 0);
    }

    function test_audit_killSwitchReadIsFalseBeforeRiskConfig() public {
        vm.prank(alice);
        guard.setKillSwitch(true);
        (,,,, bool reportedKilled,) = guard.getRiskConfig(alice);
        assertFalse(reportedKilled);
        assertFalse(guard.validateTrade(alice, address(usdc), address(usdc), 1, DEPOSIT));
    }

    function test_audit_ownerCannotWithdrawInvestedPosition() public {
        _createVault(alice, DEPOSIT);
        MockERC20 asset = new MockERC20("Asset", "ASSET", 6);
        AuditRouter dex = new AuditRouter();
        vault.setRouterWhitelist(address(dex), true);
        vault.setAllowedSelector(AuditRouter.swap.selector, true);
        vm.startPrank(alice);
        guard.setRiskConfig(10000, 10000, 10000, 100);
        guard.setTokenWhitelist(address(usdc), true);
        guard.setTokenWhitelist(address(asset), true);
        vm.stopPrank();
        vm.prank(keeper);
        vault.executeSwap(
            SiroCopyVault.SwapParams(alice, address(dex), address(usdc), address(asset), DEPOSIT, DEPOSIT),
            abi.encodeCall(dex.swap, (address(usdc), address(asset), DEPOSIT, address(vault)))
        );
        assertEq(asset.balanceOf(address(vault)), DEPOSIT);
        assertEq(vault.vaultBalance(alice), 0);
        vm.prank(alice);
        vm.expectRevert(SiroCopyVault.InvalidAmount.selector);
        vault.withdraw(type(uint256).max);
    }

    function test_audit_depositErasesUnchargedProfit() public {
        _createVault(alice, DEPOSIT);
        MockERC20 asset = new MockERC20("Asset", "ASSET", 6);
        AuditRouter dex = new AuditRouter();
        vault.setRouterWhitelist(address(dex), true);
        vault.setAllowedSelector(AuditRouter.swap.selector, true);
        vault.setAllowedSelector(AuditRouter.swapOutput.selector, true);
        vm.startPrank(alice);
        guard.setRiskConfig(10000, 10000, 10000, 100);
        guard.setTokenWhitelist(address(usdc), true);
        guard.setTokenWhitelist(address(asset), true);
        vm.stopPrank();
        uint256 amount = 500 * 1e6;
        vm.startPrank(keeper);
        vault.executeSwap(
            SiroCopyVault.SwapParams(alice, address(dex), address(usdc), address(asset), amount, amount),
            abi.encodeCall(dex.swap, (address(usdc), address(asset), amount, address(vault)))
        );
        vault.executeSwap(
            SiroCopyVault.SwapParams(alice, address(dex), address(asset), address(usdc), amount, 700 * 1e6),
            abi.encodeCall(dex.swapOutput, (address(asset), address(usdc), amount, 700 * 1e6))
        );
        vm.stopPrank();
        assertEq(vault.vaultBalance(alice), DEPOSIT + 200 * 1e6);
        vm.startPrank(alice);
        vault.deposit(100 * 1e6);
        vault.withdraw(type(uint256).max);
        vm.stopPrank();
        assertEq(vault.protocolFees(), 0);
        assertEq(vault.leaderFees(leader), 0);
        assertEq(usdc.balanceOf(alice), 100_200 * 1e6);
    }
}
