// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {UniswapV3Adapter, IV3Factory, ISwapRouter02} from "../src/UniswapV3Adapter.sol";

/// Separate adapter deployment: never assumes a mainnet address is a testnet address.
contract DeployV3Adapter is Script {
    function run() external {
        require(block.chainid == 4663 || block.chainid == 46630 || block.chainid == 31337, "Unsupported chain");
        require(block.chainid != 4663 || vm.envOr("ALLOW_MAINNET_DEPLOY", false), "Mainnet requires opt-in");
        uint256 key = vm.envUint("PRIVATE_KEY");
        require(block.chainid == 31337 || key != 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80, "Public Anvil key forbidden");
        address factory = vm.envAddress("DEX_V3_FACTORY");
        address router = vm.envAddress("DEX_V3_ROUTER");
        vm.startBroadcast(key);
        UniswapV3Adapter adapter = new UniswapV3Adapter(vm.addr(key), IV3Factory(factory), ISwapRouter02(router));
        vm.stopBroadcast();
        console.log("UniswapV3Adapter", address(adapter));
        console.log("Register verified pools with setRoute, then queue/activate vault permissions.");
    }
}
