// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAggregatorV3 {
    uint8 public decimals;
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint80 public latestRoundId;
    string public description;

    constructor(uint8 decimals_, string memory description_) {
        decimals = decimals_;
        description = description_;
        latestRoundId = 1;
    }

    function setAnswer(int256 answer, uint256 timestamp, uint80 roundId) external {
        latestAnswer = answer;
        latestTimestamp = timestamp;
        latestRoundId = roundId;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (latestRoundId, latestAnswer, latestTimestamp, latestTimestamp, latestRoundId);
    }

    function getRoundData(uint80)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (latestRoundId, latestAnswer, latestTimestamp, latestTimestamp, latestRoundId);
    }
}
