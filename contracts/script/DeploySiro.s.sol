// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {SiroCopyVault} from "../src/SiroCopyVault.sol";
import {SiroRiskGuard} from "../src/SiroRiskGuard.sol";
import {SiroLeaderboard} from "../src/SiroLeaderboard.sol";

contract DeploySiro is Script {
    address constant ANVIL_1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    function run() external {
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(pk);
        address keeperAddr = vm.envOr("KEEPER_ADDRESS", deployer);

        vm.startBroadcast(pk);

        // --- USDC ---
        address usdcAddress;
        if (block.chainid == 31337) {
            MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
            usdc.mint(deployer, 100_000 * 1e6);
            usdc.mint(ANVIL_1, 50_000 * 1e6);
            usdcAddress = address(usdc);
            console.log("Mock USDC:", usdcAddress);
        } else {
            usdcAddress = vm.envOr("USDC_ADDRESS", address(0));
            console.log("USDC:", usdcAddress);
        }

        // --- Deploy contracts ---
        SiroCopyVault vault = new SiroCopyVault(usdcAddress);
        console.log("SiroCopyVault:", address(vault));

        SiroRiskGuard guard = new SiroRiskGuard();
        console.log("SiroRiskGuard:", address(guard));

        SiroLeaderboard board = new SiroLeaderboard();
        console.log("SiroLeaderboard:", address(board));

        // --- Wire contracts together ---
        vault.setRiskGuard(address(guard));
        vault.setLeaderboard(address(board));
        vault.setKeeper(keeperAddr);

        guard.setCopyVault(address(vault));
        board.setCopyVault(address(vault));

        console.log("Keeper set to:", keeperAddr);
        console.log("All contracts wired.");

        vm.stopBroadcast();

        // --- Write deployment JSON ---
        string memory root = "deploy";
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "deployer", deployer);
        vm.serializeAddress(root, "usdc", usdcAddress);
        vm.serializeAddress(root, "copyVault", address(vault));
        vm.serializeAddress(root, "riskGuard", address(guard));
        vm.serializeAddress(root, "leaderboard", address(board));
        string memory out = vm.serializeUint(root, "deployBlock", block.number);

        string memory file = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(out, file);
        console.log("Wrote:", file);
    }
}
