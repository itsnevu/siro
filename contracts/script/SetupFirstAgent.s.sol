// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {GuardedVaultFactory} from "../src/GuardedVaultFactory.sol";
import {GuardedVault} from "../src/GuardedVault.sol";

/// Creates the operator's first agent vault and queues its permissions (one-day timelock):
/// USDG + the configured stock tokens, the Uniswap V3 adapter, and the SessionExecutor.
/// Activation is a separate, permissionless call once the timelock has passed.
contract SetupFirstAgent is Script {
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    function run() external {
        require(block.chainid == 4663, "Unsupported chain");
        require(vm.envOr("ALLOW_MAINNET_DEPLOY", false), "Mainnet requires explicit opt-in");
        uint256 key = vm.envUint("PRIVATE_KEY");
        GuardedVaultFactory factory = GuardedVaultFactory(vm.envAddress("SIRO_FACTORY"));
        address adapter = vm.envAddress("SIRO_ADAPTER");
        address executor = vm.envAddress("SIRO_SESSION_EXECUTOR");
        address[] memory stocks = vm.envAddress("SIRO_STOCKS", ",");
        // Conservative: 20% of the vault per trade, 35% max in one stock, 3% daily loss stop,
        // 1% slippage, one trade per hour, stock prices at most 26 hours old.
        GuardedVault.Policy memory policy = GuardedVault.Policy(2_000, 3_500, 300, 100, 3_600, 93_600);

        vm.startBroadcast(key);
        (uint256 agentId, GuardedVault vault) = factory.createAgent("Siro Agent 001", "SIRO-A1", policy, "https://usesiro.xyz/evidence", 0);
        vault.queueTokenPermission(USDG, true);
        for (uint256 i; i < stocks.length; ++i) vault.queueTokenPermission(stocks[i], true);
        vault.queueRouterPermission(adapter, true);
        vault.queueExecutorPermission(executor, true);
        vm.stopBroadcast();
        console.log("agentId", agentId);
        console.log("vault", address(vault));
    }
}
