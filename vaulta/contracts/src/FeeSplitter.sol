// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FeeSplitter
/// @notice Splits whatever tokens it holds between three fixed recipients: the agent's creator,
///         the compute fund, and the buyback-and-burn contract.
/// @dev Recipients and shares are immutable. There is no owner, no setter, no upgrade path and no
///      way to withdraw other than `distribute`, which anyone may call for any token.
///      Vaults pay performance fees to a splitter as vault shares; `distribute(vaultShareToken)`
///      forwards those shares and each recipient redeems its own.
contract FeeSplitter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    address public immutable creator;
    address public immutable computeFund;
    address public immutable buybackBurn;
    uint16 public immutable creatorBps;
    uint16 public immutable computeFundBps;
    uint16 public immutable buybackBurnBps;

    error ZeroAddress();
    error SharesMustSumTo100Percent();
    error NothingToDistribute();

    event Distributed(
        address indexed token, uint256 total, uint256 creatorAmount, uint256 computeFundAmount, uint256 buybackBurnAmount
    );

    constructor(
        address creator_,
        address computeFund_,
        address buybackBurn_,
        uint16 creatorBps_,
        uint16 computeFundBps_,
        uint16 buybackBurnBps_
    ) {
        if (creator_ == address(0) || computeFund_ == address(0) || buybackBurn_ == address(0)) revert ZeroAddress();
        if (uint256(creatorBps_) + computeFundBps_ + buybackBurnBps_ != BPS) revert SharesMustSumTo100Percent();
        creator = creator_;
        computeFund = computeFund_;
        buybackBurn = buybackBurn_;
        creatorBps = creatorBps_;
        computeFundBps = computeFundBps_;
        buybackBurnBps = buybackBurnBps_;
    }

    /// @notice How the current balance of `token` would be split.
    function pending(IERC20 token)
        public
        view
        returns (uint256 creatorAmount, uint256 computeFundAmount, uint256 buybackBurnAmount)
    {
        uint256 total = token.balanceOf(address(this));
        creatorAmount = (total * creatorBps) / BPS;
        computeFundAmount = (total * computeFundBps) / BPS;
        // The remainder goes to buyback so rounding never strands dust in this contract.
        buybackBurnAmount = total - creatorAmount - computeFundAmount;
    }

    /// @notice Pays out the full balance of `token`. Callable by anyone.
    function distribute(IERC20 token) external nonReentrant returns (uint256 total) {
        (uint256 creatorAmount, uint256 computeFundAmount, uint256 buybackBurnAmount) = pending(token);
        total = creatorAmount + computeFundAmount + buybackBurnAmount;
        if (total == 0) revert NothingToDistribute();
        if (creatorAmount != 0) token.safeTransfer(creator, creatorAmount);
        if (computeFundAmount != 0) token.safeTransfer(computeFund, computeFundAmount);
        if (buybackBurnAmount != 0) token.safeTransfer(buybackBurn, buybackBurnAmount);
        emit Distributed(address(token), total, creatorAmount, computeFundAmount, buybackBurnAmount);
    }
}
