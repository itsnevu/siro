// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Subset of Uniswap's SwapRouter02 (IV3SwapRouter). Note: unlike the original SwapRouter,
///         this struct has no deadline field.
interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
