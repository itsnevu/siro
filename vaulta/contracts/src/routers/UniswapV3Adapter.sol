// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IGuardedRouter} from "../interfaces/IGuardedRouter.sol";
import {ISwapRouter02} from "../interfaces/external/IUniswapV3.sol";

/// @title UniswapV3Adapter
/// @notice Swaps through a single Uniswap V3 pool via SwapRouter02.
/// @dev Stateless and ownerless. It never holds funds between calls: it pulls the exact input from the
///      caller, approves the router for that amount, and the router pays the output straight to
///      `recipient`. The caller (a GuardedVault) re-checks its own balances afterwards.
///      `data` is either empty (use `defaultFee`) or `abi.encode(uint24 fee)`.
contract UniswapV3Adapter is IGuardedRouter {
    using SafeERC20 for IERC20;

    ISwapRouter02 public immutable swapRouter;
    uint24 public immutable defaultFee;

    error ZeroAddress();
    error InvalidRouteData();

    constructor(ISwapRouter02 swapRouter_, uint24 defaultFee_) {
        if (address(swapRouter_) == address(0)) revert ZeroAddress();
        swapRouter = swapRouter_;
        defaultFee = defaultFee_;
    }

    /// @inheritdoc IGuardedRouter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        bytes calldata data
    ) external returns (uint256 amountOut) {
        uint24 fee = defaultFee;
        if (data.length != 0) {
            if (data.length != 32) revert InvalidRouteData();
            fee = abi.decode(data, (uint24));
        }

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20(tokenIn).forceApprove(address(swapRouter), 0);
    }
}
