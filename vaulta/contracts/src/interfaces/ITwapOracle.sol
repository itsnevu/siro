// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ITwapOracle
/// @notice Time-weighted price source used to bound buyback execution.
interface ITwapOracle {
    /// @notice Amount of the quote token that `amountIn` of `tokenIn` is worth at the time-weighted price.
    /// @dev Not a view: implementations may roll their observation window forward. Reverts if `tokenIn`
    ///      is not supported or if no full window has been observed yet.
    function consult(address tokenIn, uint256 amountIn) external returns (uint256 amountOut);
}
