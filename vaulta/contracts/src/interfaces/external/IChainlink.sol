// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Chainlink price feed proxy interface.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @notice Robinhood stock tokens expose this advisory flag while a corporate action is processed.
interface IOraclePausable {
    function oraclePaused() external view returns (bool);
}
