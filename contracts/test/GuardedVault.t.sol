// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GuardedVault, ITwapOracle} from "../src/GuardedVault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// Quotes from a fixed price per whole token, in base-asset units.
contract MockTwapOracle is ITwapOracle {
    mapping(address => uint256) public priceInBase; // base units per 1e18 of token
    address public immutable base;
    uint256 public updatedAt;
    bool public broken;

    constructor(address base_) { base = base_; updatedAt = block.timestamp; }

    function setPrice(address token, uint256 price) external { priceInBase[token] = price; }
    function setUpdatedAt(uint256 t) external { updatedAt = t; }
    function setBroken(bool b) external { broken = b; }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256, uint256) {
        require(!broken, "oracle down");
        uint256 inBase = tokenIn == base ? amountIn : amountIn * priceInBase[tokenIn] / 1e18;
        uint256 out = tokenOut == base ? inBase : inBase * 1e18 / priceInBase[tokenOut];
        return (out, updatedAt);
    }
}

/// Swaps at the oracle price, minus an optional haircut to simulate a bad fill.
contract MockGuardedRouter {
    MockTwapOracle public immutable oracle;
    uint16 public haircutBps;

    constructor(MockTwapOracle oracle_) { oracle = oracle_; }

    function setHaircut(uint16 bps) external { haircutBps = bps; }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256, address recipient) external returns (uint256 out) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        (out,) = oracle.quote(tokenIn, tokenOut, amountIn);
        out = out * (10_000 - haircutBps) / 10_000;
        MockERC20(tokenOut).mint(recipient, out);
    }
}

/// A whitelisted router that tries to deposit into the vault mid-swap.
contract ReentrantRouter {
    MockTwapOracle public immutable oracle;
    GuardedVault public vault;

    constructor(MockTwapOracle oracle_) { oracle = oracle_; }
    function setVault(GuardedVault v) external { vault = v; }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256, address recipient) external returns (uint256 out) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(tokenIn).mint(address(this), 1e6);
        IERC20(tokenIn).approve(address(vault), 1e6);
        vault.deposit(1e6, address(this));
        (out,) = oracle.quote(tokenIn, tokenOut, amountIn);
        MockERC20(tokenOut).mint(recipient, out);
    }
}

contract GuardedVaultTest is Test {
    MockERC20 usdg;
    MockERC20 nvda;
    MockTwapOracle oracle;
    MockGuardedRouter router;
    GuardedVault vault;

    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint64 constant DELAY = 1 days;

    function setUp() public {
        usdg = new MockERC20("Global Dollar", "USDG", 6);
        nvda = new MockERC20("NVIDIA", "NVDA", 18);
        oracle = new MockTwapOracle(address(usdg));
        oracle.setPrice(address(nvda), 100e6); // 1 NVDA = 100 USDG
        router = new MockGuardedRouter(oracle);

        GuardedVault.Policy memory policy = GuardedVault.Policy({
            maxTradeBps: 5_000,
            maxAllocationBps: 6_000,
            maxDailyLossBps: 1_000,
            maxSlippageBps: 100,
            cooldown: 0,
            maxOracleDelay: 1 hours
        });
        vault = new GuardedVault(IERC20(address(usdg)), "Siro Top 5 Tech", "sT5T", owner, oracle, DELAY, policy);

        vm.startPrank(owner);
        vault.queueTokenPermission(address(nvda), true);
        vault.queueRouterPermission(address(router), true);
        vault.queueExecutorPermission(agent, true);
        vm.stopPrank();
        vm.warp(block.timestamp + DELAY);
        oracle.setUpdatedAt(block.timestamp);
        vault.activateTokenPermission(address(nvda));
        vault.activateRouterPermission(address(router));
        vault.activateExecutorPermission(agent);

        _deposit(alice, 1_000e6);
        _deposit(bob, 1_000e6);
    }

    function _deposit(address who, uint256 amount) internal {
        usdg.mint(who, amount);
        vm.startPrank(who);
        usdg.approve(address(vault), amount);
        vault.deposit(amount, who);
        vm.stopPrank();
    }

    function _buyNvda(uint256 usdgIn) internal returns (uint256 out) {
        (uint256 expected,) = oracle.quote(address(usdg), address(nvda), usdgIn);
        vm.prank(agent);
        out = vault.executeTrade(address(router), address(usdg), address(nvda), usdgIn, expected * 9_950 / 10_000);
    }

    // ------------------------------------------------------------ trading guards

    function test_tradeWithinLimitsExecutes() public {
        uint256 out = _buyNvda(800e6);
        assertEq(out, 8e18);
        assertEq(nvda.balanceOf(address(vault)), 8e18);
        assertEq(vault.totalAssets(), 2_000e6);
    }

    function test_executorCannotTradeWithZeroMinimum() public {
        vm.prank(agent);
        vm.expectRevert(GuardedVault.SlippageExceeded.selector);
        vault.executeTrade(address(router), address(usdg), address(nvda), 500e6, 0);
    }

    function test_badFillRevertsEvenWithValidMinimum() public {
        router.setHaircut(500); // router delivers 5% less than quoted
        (uint256 expected,) = oracle.quote(address(usdg), address(nvda), 500e6);
        vm.prank(agent);
        vm.expectRevert(GuardedVault.SlippageExceeded.selector);
        vault.executeTrade(address(router), address(usdg), address(nvda), 500e6, expected * 9_950 / 10_000);
    }

    function test_tradeAboveMaxTradeReverts() public {
        vm.prank(agent);
        vm.expectRevert(GuardedVault.TradeTooLarge.selector);
        vault.executeTrade(address(router), address(usdg), address(nvda), 1_500e6, 1);
    }

    function test_staleOracleBlocksTrading() public {
        vm.warp(block.timestamp + 2 hours);
        vm.prank(agent);
        vm.expectRevert(GuardedVault.StaleOracle.selector);
        vault.executeTrade(address(router), address(usdg), address(nvda), 500e6, 1);
    }

    function test_onlyExecutorCanTrade() public {
        vm.prank(alice);
        vm.expectRevert(GuardedVault.Unauthorized.selector);
        vault.executeTrade(address(router), address(usdg), address(nvda), 500e6, 1);
    }

    function test_killSwitchBlocksTrading() public {
        vm.prank(owner);
        vault.setKillSwitch(true);
        vm.prank(agent);
        vm.expectRevert(GuardedVault.TradingPaused.selector);
        vault.executeTrade(address(router), address(usdg), address(nvda), 500e6, 1);
    }

    function test_newRouterNeedsTimelock() public {
        address rogue = makeAddr("rogue");
        vm.prank(owner);
        vault.queueRouterPermission(rogue, true);
        vm.expectRevert(GuardedVault.TimelockActive.selector);
        vault.activateRouterPermission(rogue);
        assertFalse(vault.allowedRouters(rogue));
    }

    // ------------------------------------------------------------ share price integrity

    function test_disallowedTokenIsStillValued() public {
        _buyNvda(800e6);
        vm.prank(owner);
        vault.queueTokenPermission(address(nvda), false);
        vm.warp(block.timestamp + DELAY);
        oracle.setUpdatedAt(block.timestamp);
        vault.activateTokenPermission(address(nvda));
        assertEq(vault.totalAssets(), 2_000e6);
    }

    function test_routerCannotReenterDuringTrade() public {
        ReentrantRouter evil = new ReentrantRouter(oracle);
        evil.setVault(vault);
        vm.prank(owner);
        vault.queueRouterPermission(address(evil), true);
        vm.warp(block.timestamp + DELAY);
        oracle.setUpdatedAt(block.timestamp);
        vault.activateRouterPermission(address(evil));

        (uint256 expected,) = oracle.quote(address(usdg), address(nvda), 500e6);
        vm.prank(agent);
        vm.expectRevert();
        vault.executeTrade(address(evil), address(usdg), address(nvda), 500e6, expected * 9_950 / 10_000);
    }

    function test_firstDepositInflationAttackDoesNotHurtVictim() public {
        GuardedVault.Policy memory policy = GuardedVault.Policy(5_000, 6_000, 1_000, 100, 0, 1 hours);
        GuardedVault fresh = new GuardedVault(IERC20(address(usdg)), "Fresh", "F", owner, oracle, DELAY, policy);
        address attacker = makeAddr("attacker");
        usdg.mint(attacker, 1_000e6 + 1);
        vm.startPrank(attacker);
        usdg.approve(address(fresh), 1);
        fresh.deposit(1, attacker);
        usdg.transfer(address(fresh), 1_000e6); // donation to skew the share price
        vm.stopPrank();

        address victim = makeAddr("victim");
        usdg.mint(victim, 1_000e6);
        vm.startPrank(victim);
        usdg.approve(address(fresh), 1_000e6);
        uint256 shares = fresh.deposit(1_000e6, victim);
        vm.stopPrank();
        assertGe(fresh.previewRedeem(shares), 999e6);
    }

    // ------------------------------------------------------------ exits

    function test_sharesAreIsolatedProRata() public {
        _buyNvda(800e6);
        assertEq(vault.balanceOf(alice), vault.balanceOf(bob));
        uint256 bobShares = vault.balanceOf(bob);
        vm.prank(bob);
        vault.redeemInKind(bobShares, bob, bob);
        // Bob leaves with exactly half of each holding; Alice's half stays untouched.
        assertEq(usdg.balanceOf(bob), 600e6);
        assertEq(nvda.balanceOf(bob), 4e18);
        assertEq(usdg.balanceOf(address(vault)), 600e6);
        assertEq(nvda.balanceOf(address(vault)), 4e18);
    }

    function test_redeemInKindExitsInvestedPosition() public {
        _buyNvda(1_000e6);
        // Alice drains the remaining USDG through a normal redeem...
        uint256 aliceShares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.redeem(aliceShares, alice, alice);

        // ...so Bob's value now sits entirely in NVDA and a USDG redeem cannot pay him.
        uint256 bobShares = vault.balanceOf(bob);
        vm.prank(bob);
        vm.expectRevert();
        vault.redeem(bobShares, bob, bob);

        vm.prank(bob);
        vault.redeemInKind(bobShares, bob, bob);
        assertEq(vault.balanceOf(bob), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(nvda.balanceOf(bob), 10e18);
        assertEq(nvda.balanceOf(address(vault)), 0);
    }

    function test_redeemInKindWorksWhenOracleIsDownOrPaused() public {
        _buyNvda(800e6);
        oracle.setBroken(true);
        vm.prank(owner);
        vault.setKillSwitch(true);

        uint256 aliceShares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.redeemInKind(aliceShares, alice, alice);
        assertEq(usdg.balanceOf(alice), 600e6);
        assertEq(nvda.balanceOf(alice), 4e18);
    }

    function test_redeemInKindSpendsAllowanceForThirdParty() public {
        uint256 shares = vault.balanceOf(alice) / 2;
        vm.prank(bob);
        vm.expectRevert();
        vault.redeemInKind(shares, bob, alice);

        vm.prank(alice);
        vault.approve(bob, shares);
        vm.prank(bob);
        vault.redeemInKind(shares, bob, alice);
        assertEq(usdg.balanceOf(bob), 500e6);
        assertEq(vault.allowance(alice, bob), 0);
    }

    function test_redeemInKindRejectsZeroAndExcessShares() public {
        vm.prank(alice);
        vm.expectRevert(GuardedVault.InvalidShares.selector);
        vault.redeemInKind(0, alice, alice);

        uint256 tooMany = vault.balanceOf(alice) + 1;
        vm.prank(alice);
        vm.expectRevert();
        vault.redeemInKind(tooMany, alice, alice);
    }

    // ------------------------------------------------------------ audit regressions

    function _togglePermission(address token, bool allowed) internal {
        vm.prank(owner);
        vault.queueTokenPermission(token, allowed);
        vm.warp(block.timestamp + DELAY);
        oracle.setUpdatedAt(block.timestamp);
        vault.activateTokenPermission(token);
    }

    /// Disallow then re-allow must not track the token twice (double-counted NAV, over-paid in-kind exits).
    function test_audit_reallowDoesNotDuplicateTrackedAsset() public {
        _buyNvda(800e6);
        _togglePermission(address(nvda), false);
        _togglePermission(address(nvda), true);
        assertEq(vault.trackedAssetCount(), 2);
        assertEq(vault.totalAssets(), 2_000e6);
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.redeemInKind(shares, alice, alice);
        assertEq(nvda.balanceOf(alice), 4e18);
    }

    /// Share price must not be set from a stale quote: deposits and withdrawals wait, in-kind exit still works.
    function test_audit_staleHoldingBlocksPricedEntryAndExit() public {
        _buyNvda(800e6);
        vm.warp(block.timestamp + 2 hours);
        usdg.mint(alice, 100e6);
        vm.startPrank(alice);
        usdg.approve(address(vault), 100e6);
        vm.expectRevert(GuardedVault.StaleOracle.selector);
        vault.deposit(100e6, alice);
        vm.expectRevert(GuardedVault.StaleOracle.selector);
        vault.withdraw(10e6, alice, alice);
        vault.redeemInKind(vault.balanceOf(alice), alice, alice);
        vm.stopPrank();
    }
}
