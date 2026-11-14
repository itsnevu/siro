// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeploySiro} from "../script/DeploySiro.s.sol";
import {GuardedVaultFactory} from "../src/GuardedVaultFactory.sol";
import {GuardedVault} from "../src/GuardedVault.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeploySiroTest is Test {
    DeploySiro script;
    uint256 constant LOCAL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function setUp() public {
        script = new DeploySiro();
        vm.setEnv("PRIVATE_KEY", vm.toString(LOCAL_KEY));
        vm.setEnv("ALLOW_MAINNET_DEPLOY", "false");
    }

    // Environment cheatcodes are process-global; keep these checks sequential.
    function test_deploymentGuardsAndLocalLifecycle() public {
        check_rejectUnsupportedChain();
        check_mainnetRequiresOptIn();
        check_testnetRejectsPublicAnvilKey();
        check_testnetRejectsMissingTokenCode();
        vm.setEnv("PRIVATE_KEY", vm.toString(LOCAL_KEY));
        check_localDeploymentCreateDepositAndExit();
    }

    function check_rejectUnsupportedChain() internal {
        vm.chainId(1);
        vm.expectRevert("Unsupported chain");
        script.run();
    }

    function check_mainnetRequiresOptIn() internal {
        vm.chainId(4663);
        vm.expectRevert("Mainnet requires explicit opt-in");
        script.run();
    }

    function check_testnetRejectsPublicAnvilKey() internal {
        vm.chainId(46630);
        vm.expectRevert("Public Anvil key forbidden");
        script.run();
    }

    function check_testnetRejectsMissingTokenCode() internal {
        vm.chainId(46630);
        vm.setEnv("PRIVATE_KEY", "123456789");
        vm.setEnv("USDG_ADDRESS", vm.toString(address(0x1234)));
        vm.setEnv("USDG_USD_FEED", vm.toString(address(0x5678)));
        vm.expectRevert("Token/feed must be contracts");
        script.run();
    }

    function check_localDeploymentCreateDepositAndExit() internal {
        vm.chainId(31337);
        address deployer = vm.addr(LOCAL_KEY);
        uint64 nonce = vm.getNonce(deployer);
        address token = vm.computeCreateAddress(deployer, nonce);
        address oracle = vm.computeCreateAddress(deployer, nonce + 2);
        AgentRegistry registry = AgentRegistry(vm.computeCreateAddress(deployer, nonce + 3));
        GuardedVaultFactory factory = GuardedVaultFactory(vm.computeCreateAddress(deployer, nonce + 4));
        script.run();
        assertEq(address(factory.asset()), token);
        assertEq(address(factory.oracle()), oracle);
        assertEq(address(factory.registry()), address(registry));
        assertEq(registry.factory(), address(factory));
        assertEq(factory.policyDelay(), 1 days);
        vm.startPrank(deployer);
        (uint256 id, GuardedVault vault) = factory.createAgent("Local agent", "sUSDG", GuardedVault.Policy(1000, 2500, 500, 100, 3600, 86400), "", 0);
        assertEq(registry.getAgent(id).vault, address(vault));
        assertEq(vault.owner(), deployer);
        IERC20(token).approve(address(vault), 100e6);
        vault.deposit(100e6, deployer);
        assertEq(vault.totalAssets(), 100e6);
        vault.withdraw(40e6, deployer, deployer);
        assertEq(vault.totalAssets(), 60e6);
        vault.setKillSwitch(true);
        vault.redeemInKind(vault.balanceOf(deployer), deployer, deployer);
        assertEq(vault.totalAssets(), 0);
        assertEq(IERC20(token).balanceOf(deployer), 100_000e6);
        vm.stopPrank();
    }
}
