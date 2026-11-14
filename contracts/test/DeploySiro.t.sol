// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeploySiro} from "../script/DeploySiro.s.sol";
import {GuardedVaultFactory} from "../src/GuardedVaultFactory.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockAggregatorV3} from "./mocks/MockAggregatorV3.sol";

/// The deploy script is mainnet-only. Stand-in token and feed live in this test, never in the script.
contract DeploySiroTest is Test {
    DeploySiro script;
    uint256 constant ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant KEY = 0xA11CE;

    function setUp() public {
        script = new DeploySiro();
        vm.setEnv("PRIVATE_KEY", vm.toString(KEY));
        vm.setEnv("ALLOW_MAINNET_DEPLOY", "false");
    }

    // Environment cheatcodes are process-global; keep these checks sequential.
    function test_mainnetOnlyGuardsAndWiring() public {
        for (uint256 id = 0; id < 3; id++) {
            vm.chainId([uint256(1), 31337, 46630][id]);
            vm.expectRevert("Unsupported chain");
            script.run();
        }
        vm.chainId(4663);
        vm.expectRevert("Mainnet requires explicit opt-in");
        script.run();

        vm.setEnv("ALLOW_MAINNET_DEPLOY", "true");
        vm.setEnv("PRIVATE_KEY", vm.toString(ANVIL_KEY));
        vm.expectRevert("Public Anvil key forbidden");
        script.run();

        vm.setEnv("PRIVATE_KEY", vm.toString(KEY));
        vm.setEnv("USDG_ADDRESS", vm.toString(address(0x1234)));
        vm.setEnv("USDG_USD_FEED", vm.toString(address(0x5678)));
        vm.expectRevert("Token/feed must be contracts");
        script.run();

        // Wiring on chain 4663 with stand-in token and feed contracts.
        vm.warp(10 days);
        MockERC20 usdg = new MockERC20("Global Dollar", "USDG", 6);
        MockAggregatorV3 feed = new MockAggregatorV3(8, "USDG / USD");
        feed.setAnswer(1e8, block.timestamp, 1);
        vm.setEnv("USDG_ADDRESS", vm.toString(address(usdg)));
        vm.setEnv("USDG_USD_FEED", vm.toString(address(feed)));
        address deployer = vm.addr(KEY);
        uint64 nonce = vm.getNonce(deployer);
        address oracle = vm.computeCreateAddress(deployer, nonce);
        // Nonces: oracle n, setFeed n+1 (a broadcast call), registry n+2, factory n+3.
        AgentRegistry registry = AgentRegistry(vm.computeCreateAddress(deployer, nonce + 2));
        GuardedVaultFactory factory = GuardedVaultFactory(vm.computeCreateAddress(deployer, nonce + 3));
        script.run();
        assertEq(address(factory.asset()), address(usdg));
        assertEq(address(factory.oracle()), oracle);
        assertEq(address(factory.registry()), address(registry));
        assertEq(registry.factory(), address(factory));
        assertEq(factory.policyDelay(), 1 days);
    }
}
