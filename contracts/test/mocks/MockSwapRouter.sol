// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockSwapRouter {
    using SafeERC20 for IERC20;

    uint256 public mockRate = 1e18;
    bool public shouldRevert;

    function setMockRate(uint256 rate) external {
        mockRate = rate;
    }

    function setRevert(bool val) external {
        shouldRevert = val;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        require(!shouldRevert, "MockSwapRouter: forced revert");
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        amountOut = amountIn * mockRate / 1e18;
        require(amountOut >= minAmountOut, "MockSwapRouter: insufficient output");
        IERC20(tokenOut).transfer(recipient, amountOut);
        return amountOut;
    }
}
