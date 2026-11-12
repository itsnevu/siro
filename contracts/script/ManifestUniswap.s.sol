// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RobinhoodChain} from "../config/RobinhoodChain.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract ManifestUniswap is Script {
    function run() external view {
        console.log("=== Uniswap Verification on Robinhood Chain ===");

        _checkCode("V3Factory", RobinhoodChain.UNISWAP_V3_FACTORY);
        _checkCode("SwapRouter02", RobinhoodChain.SWAP_ROUTER_02);
        _checkCode("UniversalRouter", RobinhoodChain.UNIVERSAL_ROUTER);
        _checkCode("V4Quoter", RobinhoodChain.V4_QUOTER);

        IUniswapV3Factory factory = IUniswapV3Factory(RobinhoodChain.UNISWAP_V3_FACTORY);

        uint24[4] memory fees = [uint24(100), uint24(500), uint24(3000), uint24(10000)];
        for (uint256 i; i < fees.length; ++i) {
            address pool = factory.getPool(RobinhoodChain.WETH, RobinhoodChain.USDG, fees[i]);
            if (pool != address(0) && pool.code.length > 0) {
                console.log("POOL WETH/USDG fee:", fees[i]);
                console.log("  address:", pool);
                console.log("  has_code: true");
            } else if (pool != address(0)) {
                console.log("POOL WETH/USDG fee:", fees[i]);
                console.log("  address:", pool);
                console.log("  has_code: FALSE");
            } else {
                console.log("POOL WETH/USDG fee:", fees[i]);
                console.log("  no pool");
            }
        }
    }

    function _checkCode(string memory label, address addr) internal view {
        uint256 codeLen = addr.code.length;
        if (codeLen > 0) {
            console.log("OK", label, addr);
            console.log("  code_bytes:", codeLen);
        } else {
            console.log("FAIL", label, addr);
        }
    }
}
