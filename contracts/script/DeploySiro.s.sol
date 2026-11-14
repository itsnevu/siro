// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VmSafe} from "forge-std/Vm.sol";
import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {ChainlinkOracle, IAggregatorV3} from "../src/ChainlinkOracle.sol";
import {GuardedVaultFactory} from "../src/GuardedVaultFactory.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract DeploySiro is Script {
    function run() external {
        bool local = block.chainid == 31337;
        require(local || block.chainid == 46630 || block.chainid == 4663, "Unsupported chain");
        require(block.chainid != 4663 || vm.envOr("ALLOW_MAINNET_DEPLOY", false), "Mainnet requires explicit opt-in");
        uint256 pk = local
            ? vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80))
            : vm.envUint("PRIVATE_KEY");
        require(local || pk != 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80, "Public Anvil key forbidden");
        address deployer = vm.addr(pk);
        address usdg = local ? address(0) : vm.envAddress("USDG_ADDRESS");
        address feed = local ? address(0) : vm.envAddress("USDG_USD_FEED");
        if (!local) {
            require(usdg.code.length > 0 && feed.code.length > 0, "Token/feed must be contracts");
            require(IERC20Metadata(usdg).decimals() == 6, "Expected 6-decimal USDG");
        }
        vm.startBroadcast(pk);
        if (local) {
            MockERC20 token = new MockERC20("Mock Global Dollar", "USDG", 6);
            token.mint(deployer, 100_000e6);
            usdg = address(token);
        }
        ChainlinkOracle oracle = new ChainlinkOracle(deployer);
        if (!local) {
            oracle.setFeed(usdg, IAggregatorV3(feed), false);
            // L2 sequencer uptime feed. Robinhood Chain has none yet; set it (write-once) when Chainlink publishes one.
            address sequencer = vm.envOr("SEQUENCER_UPTIME_FEED", address(0));
            if (sequencer != address(0)) oracle.setSequencerFeed(IAggregatorV3(sequencer));
            else console.log("WARNING: no SEQUENCER_UPTIME_FEED; oracle cannot detect sequencer outages.");
            (uint256 quote, uint256 at) = oracle.quote(usdg, usdg, 1e6);
            require(quote == 1e6 && at <= block.timestamp && block.timestamp - at <= 1 days, "Invalid/stale USDG feed");
        }
        AgentRegistry registry = new AgentRegistry(deployer);
        GuardedVaultFactory factory = new GuardedVaultFactory(IERC20(usdg), oracle, registry, 1 days);
        registry.setFactory(address(factory));
        vm.stopBroadcast();
        // A dry run must never become an app deployment record. The Node runner
        // verifies broadcast receipts and bytecode before promoting this candidate.
        if (!vm.isContext(VmSafe.ForgeContext.ScriptBroadcast)) return;
        string memory root = "siro";
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "deployer", deployer);
        vm.serializeAddress(root, "usdg", usdg);
        vm.serializeAddress(root, "oracle", address(oracle));
        vm.serializeAddress(root, "agentRegistry", address(registry));
        vm.serializeAddress(root, "guardedVaultFactory", address(factory));
        string memory json = vm.serializeUint(root, "deployBlock", block.number);
        vm.writeJson(json, string.concat("deployments/", vm.toString(block.chainid), ".pending.json"));
        console.log("GuardedVaultFactory:", address(factory));
        console.log("Trading requires configured feeds, router, tokens and executor permissions.");
    }
}
