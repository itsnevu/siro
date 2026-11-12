// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IGuardedRouter} from "../interfaces/IGuardedRouter.sol";
import {IUniswapV2Router02} from "../interfaces/external/IUniswapV2.sol";

/// @title UniswapV2Adapter
/// @notice Swaps through Uniswap V2 pairs via Router02.
/// @dev Stateless and ownerless; never holds funds between calls.
///      `data` is either empty (direct pair tokenIn -> tokenOut) or `abi.encode(address[] path)`,
///      where the path must start with `tokenIn`, end with `tokenOut` and have at most 4 hops.
contract UniswapV2Adapter is IGuardedRouter {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PATH_LENGTH = 4;

    IUniswapV2Router02 public immutable router;

    error ZeroAddress();
    error InvalidPath();

    constructor(IUniswapV2Router02 router_) {
        if (address(router_) == address(0)) revert ZeroAddress();
        router = router_;
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
        address[] memory path;
        if (data.length == 0) {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
        } else {
            path = abi.decode(data, (address[]));
            uint256 n = path.length;
            if (n < 2 || n > MAX_PATH_LENGTH || path[0] != tokenIn || path[n - 1] != tokenOut) revert InvalidPath();
        }

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(router), amountIn);
        uint256[] memory amounts =
            router.swapExactTokensForTokens(amountIn, minAmountOut, path, recipient, block.timestamp);
        IERC20(tokenIn).forceApprove(address(router), 0);
        amountOut = amounts[amounts.length - 1];
    }
}
