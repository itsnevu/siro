// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {ChainlinkOracle, IAggregatorV3} from "../src/ChainlinkOracle.sol";
import {UniswapV3Adapter} from "../src/UniswapV3Adapter.sol";

/// Registers Robinhood stock tokens: their Chainlink USD feed (write-once, oracle-pause checked)
/// and their deepest USDG pool on Uniswap V3 (write-once). Addresses come from
/// docs.robinhood.com/chain/contracts and Chainlink's Robinhood mainnet directory.
/// Pools were chosen by in-range liquidity at the time of writing. Already-set entries are skipped.
contract ConfigureMarkets is Script {
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    struct Market { string sym; address token; address feed; uint24 fee; }

    function markets() internal pure returns (Market[10] memory m) {
        m[0] = Market("AAPL", 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9, 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0, 500);
        m[1] = Market("MSFT", 0xe93237C50D904957Cf27E7B1133b510C669c2e74, 0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E, 3000);
        m[2] = Market("NVDA", 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC, 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15, 500);
        m[3] = Market("AMZN", 0x12f190a9F9d7D37a250758b26824B97CE941bF54, 0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C, 3000);
        m[4] = Market("GOOGL", 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3, 0xF6f373a037c30F0e5010d854385cA89185AE638b, 500);
        m[5] = Market("TSLA", 0x322F0929c4625eD5bAd873c95208D54E1c003b2d, 0x4A1166a659A55625345e9515b32adECea5547C38, 3000);
        m[6] = Market("META", 0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35, 0x7C38C00C30BEe9378381E7B6135d7283356D71b1, 3000);
        m[7] = Market("SPY", 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C, 0x319724394D3A0e3669269846abE664Cd621f9f6A, 500);
        m[8] = Market("QQQ", 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68, 0x80901d846d5D7B030F26B480776EE3b29374C2ae, 500);
        m[9] = Market("COIN", 0x6330D8C3178a418788dF01a47479c0ce7CCF450b, 0xA3a468A452940B7D6b69991207B508c609a98Ef2, 500);
    }

    function run() external {
        require(block.chainid == 4663, "Unsupported chain");
        require(vm.envOr("ALLOW_MAINNET_DEPLOY", false), "Mainnet requires explicit opt-in");
        uint256 key = vm.envUint("PRIVATE_KEY");
        ChainlinkOracle oracle = ChainlinkOracle(vm.envAddress("SIRO_ORACLE"));
        UniswapV3Adapter adapter = UniswapV3Adapter(vm.envAddress("SIRO_ADAPTER"));
        Market[10] memory m = markets();
        vm.startBroadcast(key);
        for (uint256 i; i < m.length; ++i) {
            require(m[i].token.code.length > 0 && m[i].feed.code.length > 0, "Token/feed must be contracts");
            (, int256 answer,, uint256 at,) = IAggregatorV3(m[i].feed).latestRoundData();
            require(answer > 0 && at > 0, "Feed has no price");
            (IAggregatorV3 agg,,,) = oracle.feeds(m[i].token);
            if (address(agg) == address(0)) oracle.setFeed(m[i].token, IAggregatorV3(m[i].feed), true);
            (address pool,) = adapter.routes(adapter.routeKey(m[i].token, USDG));
            if (pool == address(0)) adapter.setRoute(m[i].token, USDG, m[i].fee);
            console.log(m[i].sym, "configured");
        }
        vm.stopBroadcast();
    }
}
