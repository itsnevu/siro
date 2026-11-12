// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GuardedVault} from "../src/GuardedVault.sol";
import {GuardedVaultFactory} from "../src/GuardedVaultFactory.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockTwapOracle} from "./GuardedVault.t.sol";

contract GuardedVaultFactoryTest is Test {
    MockERC20 usdg;
    MockTwapOracle oracle;
    AgentRegistry registry;
    GuardedVaultFactory factory;

    address admin = makeAddr("admin");
    address creator = makeAddr("creator");
    address attacker = makeAddr("attacker");

    uint64 constant DELAY = 1 days;

    function setUp() public {
        usdg = new MockERC20("Global Dollar", "USDG", 6);
        oracle = new MockTwapOracle(address(usdg));
        registry = new AgentRegistry(admin);
        factory = new GuardedVaultFactory(IERC20(address(usdg)), oracle, registry, DELAY);
        vm.prank(admin);
        registry.setFactory(address(factory));
    }

    function _policy() internal pure returns (GuardedVault.Policy memory) {
        return GuardedVault.Policy({maxTradeBps: 1_000, maxAllocationBps: 2_500, maxDailyLossBps: 500, maxSlippageBps: 100, cooldown: 1 hours, maxOracleDelay: 1 days});
    }

    function test_createAgentDeploysVaultOwnedByCreatorAndRegistersIt() public {
        vm.prank(creator);
        (uint256 agentId, GuardedVault vault) = factory.createAgent("Top 5 Tech", "sT5T", _policy(), "ipfs://top5", 200);

        assertEq(vault.owner(), creator);
        assertEq(vault.asset(), address(usdg));
        assertEq(address(vault.oracle()), address(oracle));
        assertEq(vault.policyDelay(), DELAY);
        assertTrue(factory.isVault(address(vault)));
        assertEq(factory.vaultCount(), 1);
        assertEq(factory.vaults(0), address(vault));

        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.creator, creator);
        assertEq(agent.vault, address(vault));
        assertEq(agent.policyHash, keccak256(abi.encode(_policy())));
        assertEq(agent.creatorFeeBps, 200);
        assertEq(registry.agentIdOfVault(address(vault)), agentId);
    }

    function test_onlyFactoryCanRegister() public {
        vm.prank(attacker);
        vm.expectRevert(AgentRegistry.Unauthorized.selector);
        registry.registerAgent(attacker, makeAddr("someVault"), keccak256("p"), "", 0);
    }

    function test_vaultCannotBeRegisteredTwice() public {
        vm.prank(creator);
        (, GuardedVault vault) = factory.createAgent("A", "A", _policy(), "", 0);
        vm.prank(address(factory));
        vm.expectRevert(AgentRegistry.InvalidAgent.selector);
        registry.registerAgent(creator, address(vault), keccak256("p"), "", 0);
    }

    function test_factoryIsSetOnce() public {
        vm.prank(admin);
        vm.expectRevert(AgentRegistry.InvalidAddress.selector);
        registry.setFactory(attacker);
    }

    function test_creatorFeeIsCapped() public {
        vm.prank(creator);
        vm.expectRevert(AgentRegistry.FeeTooHigh.selector);
        factory.createAgent("A", "A", _policy(), "", 1_001);
    }

    function test_factoryRejectsTooShortTimelock() public {
        vm.expectRevert(GuardedVaultFactory.DelayTooShort.selector);
        new GuardedVaultFactory(IERC20(address(usdg)), oracle, registry, 1 hours);
    }

    function test_invalidPolicyIsRejected() public {
        GuardedVault.Policy memory bad = _policy();
        bad.maxSlippageBps = 5_000;
        vm.prank(creator);
        vm.expectRevert(GuardedVault.InvalidPolicy.selector);
        factory.createAgent("A", "A", bad, "", 0);
    }
}
