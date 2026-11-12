// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IGuardedRouter
/// @notice The only call a vault ever makes to trade. Each DEX gets a small adapter implementing this.
/// @dev The adapter pulls `amountIn` of `tokenIn` from the caller (the caller approves exactly that
///      amount first) and must deliver the output to `recipient`. Callers do not trust the return
///      value or the adapter's own minimum-out check: they measure their balance before and after.
interface IGuardedRouter {
    /// @param data Adapter-specific routing hints, e.g. a Uniswap V3 fee tier. Empty means "default".
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        bytes calldata data
    ) external returns (uint256 amountOut);
}
