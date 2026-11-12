// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library RobinhoodChain {
    uint256 constant CHAIN_ID = 4663;

    // --- Tokens ---
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    // --- Uniswap (official: github.com/Uniswap/contracts/blob/main/deployments/4663.md) ---
    address constant UNISWAP_V3_FACTORY = 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA;
    address constant SWAP_ROUTER_02 = 0xCaf681a66D020601342297493863E78C959E5cb2;
    address constant UNIVERSAL_ROUTER = 0x204FAca1764B154221e35c0d20aBb3c525710498;
    address constant V4_QUOTER = 0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94;

    // --- Chainlink EACAggregatorProxy (verified on Blockscout, descriptions TBD via manifest) ---
    // Run `forge script script/ManifestFeeds.s.sol` to populate descriptions.
    // Batch deployed 2026-06-22, plus newer ones through 2026-11-07.
    // The following are placeholders until manifest identifies ETH/USD and USDG/USD:
    address constant CHAINLINK_ETH_USD = address(0);
    address constant CHAINLINK_USDG_USD = address(0);

    // Sequencer uptime feed: TBD — may not exist on this Orbit L2
    address constant CHAINLINK_SEQUENCER = address(0);
}
