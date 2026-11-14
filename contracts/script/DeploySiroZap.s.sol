// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {SiroZap, IWETH9, IVaultFactory} from "../src/SiroZap.sol";
import {ISwapRouter02} from "../src/UniswapV3Adapter.sol";

/// Deploys the user-facing swap+deposit zap and whitelists initial input tokens.
/// Mainnet needs ALLOW_MAINNET_DEPLOY=true. Inputs (all required):
///   DEX_V3_ROUTER      SwapRouter02 (0xcaf681a66d020601342297493863e78c959e5cb2 on 4663)
///   WETH9              0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 on 4663
///   VAULT_FACTORY      GuardedVaultFactory (contracts/deployments/4663.json: guardedVaultFactory)
///   ZAP_WHITELIST      comma-separated input tokens, e.g. the WETH9 address
contract DeploySiroZap is Script {
    function run() external {
        require(block.chainid == 4663 || block.chainid == 31337, "Unsupported chain");
        require(block.chainid != 4663 || vm.envOr("ALLOW_MAINNET_DEPLOY", false), "Mainnet requires opt-in");
        uint256 key = vm.envUint("PRIVATE_KEY");
        require(block.chainid == 31337 || key != 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80, "Public Anvil key forbidden");
        address router = vm.envAddress("DEX_V3_ROUTER");
        address weth = vm.envAddress("WETH9");
        address factory = vm.envAddress("VAULT_FACTORY");
        address[] memory whitelist = vm.envAddress("ZAP_WHITELIST", ",");

        vm.startBroadcast(key);
        SiroZap zap = new SiroZap(vm.addr(key), ISwapRouter02(router), IWETH9(weth), IVaultFactory(factory));
        for (uint256 i; i < whitelist.length; ++i) zap.setWhitelisted(whitelist[i], true);
        vm.stopBroadcast();

        console.log("SiroZap", address(zap));
        console.log("Set NEXT_PUBLIC_SIRO_ZAP to this address.");
    }
}
