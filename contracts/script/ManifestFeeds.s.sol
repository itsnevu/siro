// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface IAggregatorV3 {
    function description() external view returns (string memory);
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

contract ManifestFeeds is Script {
    address[] internal feeds;

    function run() external {
        _loadFeeds();

        for (uint256 i; i < feeds.length; ++i) {
            address addr = feeds[i];
            if (addr.code.length == 0) {
                console.log("SKIP", addr, "NO_CODE");
                continue;
            }
            IAggregatorV3 feed = IAggregatorV3(addr);
            try feed.description() returns (string memory desc) {
                uint8 dec = feed.decimals();
                (uint80 roundId, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();
                uint256 age = block.timestamp > updatedAt ? block.timestamp - updatedAt : 0;
                console.log("---");
                console.log("feed", addr);
                console.log("desc", desc);
                console.log("decimals", dec);
                console.log("roundId", roundId);
                console.log("answer", answer);
                console.log("updatedAt", updatedAt);
                console.log("age_seconds", age);
            } catch {
                console.log("FAIL", addr, "CALL_FAILED");
            }
        }
    }

    function _loadFeeds() internal {
        feeds.push(0xFE941871d8c2AC48C70A62f864De47090Ef8171d);
        feeds.push(0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37);
        feeds.push(0x2824b105C37F9C57783972cBDE03F679B7AC0E82);
        feeds.push(0x470A51258068043bd43dC0a56245625C9fE86eB0);
        feeds.push(0x0009cD492adf8167f9eEBf1293556A673530a21a);
        feeds.push(0x3546407C5F94dD7Eab3a853D245b5C5EAb53318a);
        feeds.push(0xa7a18Ca3F19E17FfA28F92302B817Ca8c1A94b06);
        feeds.push(0x451B1295aA84FD6d6b58af1a5002eA1b1A1913A0);
        feeds.push(0x1C6c8cADBe02E19129c39dDB92281cE4c0bf206b);
        feeds.push(0xA994d3684e8400A6c8078226925779FdeE682DD9);
        feeds.push(0x6317f016FA3e312C4625dee51d32b43a223011f8);
        feeds.push(0xe9B94828424a8Efe6e773c28AB5Fd486851867c8);
        feeds.push(0xa0DF4ee0fFf975306345875E3548Fcc519577A11);
        feeds.push(0x4A1166a659A55625345e9515b32adECea5547C38);
        feeds.push(0xE4479F01738B4e8C428CD8eB72D47AB9BC3c7de6);
        feeds.push(0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15);
        feeds.push(0xCF169363636D73dbBf77733629CB38919d14232d);
        feeds.push(0x425EEFdCf05ed6526C3cE61Af99429A228a6d596);
        feeds.push(0x5b40F4E78FA58B60a4F59b8cc8cB8d2Fb0690467);
        feeds.push(0xfb133Fa4B7b385802B693a293606682Df47109A3);
        feeds.push(0xd1016D9Da414B13D55abe02221A8A145eB89aA0D);
        feeds.push(0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72);
        feeds.push(0xF6d57763DFa625F4A413485261Ab2E71Ff4304CF);
        feeds.push(0x319724394D3A0e3669269846abE664Cd621f9f6A);
        feeds.push(0xa68CA83408bE3f78d1c58a82081c619e9d21486d);
        feeds.push(0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E);
        feeds.push(0xaD6D88eab22aa4867Efe807a5311Ed64962f740D);
        feeds.push(0x820ABedFF239034956B7A9d2F0a331f9F075eB4c);
        feeds.push(0x8cd1DFC0fc61fcA55FA77b37e008A90f13364Fce);
        feeds.push(0x80901d846d5D7B030F26B480776EE3b29374C2ae);
        feeds.push(0x41ed2c58611790af0760e31e80Bb427e4e83D603);
        feeds.push(0x209b73908e92Ae021826eD79609845451Ecba2ce);
        feeds.push(0xdA81cD9c76F1D3Ea32655dfFc7408ef22BB0Ee2a);
        feeds.push(0x6652eDf64bA3731C4F2D3ce821A0Fb1f1f6b482a);
        feeds.push(0x025Ba3B3569Ca7d15Da7BFC1648F13F06A072851);
        feeds.push(0x7C38C00C30BEe9378381E7B6135d7283356D71b1);
        feeds.push(0x5cBC53D382E56cBb223f118CF8Eefb6c9c2759f5);
        feeds.push(0x6B22A786bAa607d76728168703a39Ea9C99f2cD0);
        feeds.push(0x4bDbb3150014c6Ab2C6D9347B0779c49015a2f3f);
        feeds.push(0xF6f373a037c30F0e5010d854385cA89185AE638b);
        feeds.push(0xA04EE5c4c8827F17e82f93bE9e19DeA221A749a8);
        feeds.push(0x75a9c76Ef439e2C7c2E5a34Ab105EcFe3766431c);
        feeds.push(0x6D054DECb74Cf8ef3675B0Abc100e02921176EdF);
        feeds.push(0xe1b3aABCAFAd1c94708dc1367dcfF8Aa4407487C);
        feeds.push(0x288b837A17fED1aa00c1df832ef79D0C77336c10);
        feeds.push(0x0e6a64a2B58A6693a531E6c555f3A5d042eEA844);
        feeds.push(0x2a07f8d87d369Bd8Bc36472337ae02d512a7b5e5);
        feeds.push(0xB265810950ba6c5C0Ff821c9963014a56fD8Bffb);
        feeds.push(0x42a95341ff361e81fd934F39943c5C98F6991844);
        feeds.push(0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C);
    }
}
