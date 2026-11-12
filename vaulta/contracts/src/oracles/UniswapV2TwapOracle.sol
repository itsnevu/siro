// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITwapOracle} from "../interfaces/ITwapOracle.sol";
import {IUniswapV2Pair} from "../interfaces/external/IUniswapV2.sol";

/// @title UniswapV2TwapOracle
/// @notice Fixed-window time-weighted average price for one Uniswap V2 pair, built on the pair's
///         cumulative price accumulators. Used by BuybackBurn to bound execution price.
/// @dev Port of Uniswap's ExampleOracleSimple to Solidity 0.8. The window is at least 30 minutes.
///      Moving a V2 TWAP requires holding the pool price away from the market for a large part of the
///      window, across many blocks, while arbitrageurs trade against you. That is what makes it a
///      usable reference where a spot price is not.
///      Prices are UQ112x112 fixed point (112 fractional bits), as in the pair itself.
///      There is no owner. Anyone may call `update`.
contract UniswapV2TwapOracle is ITwapOracle {
    uint32 public constant MIN_PERIOD = 30 minutes;

    IUniswapV2Pair public immutable pair;
    address public immutable token0;
    address public immutable token1;
    uint32 public immutable period;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint32 public blockTimestampLast;
    /// @notice Average price of token0 in token1 over the last full window, UQ112x112. Zero until the first window closes.
    uint224 public price0Average;
    /// @notice Average price of token1 in token0 over the last full window, UQ112x112.
    uint224 public price1Average;

    error PeriodTooShort();
    error NoReserves();
    error UnsupportedToken(address token);
    error NoObservationYet();

    event Updated(uint224 price0Average, uint224 price1Average, uint32 timestamp);

    constructor(IUniswapV2Pair pair_, uint32 period_) {
        if (period_ < MIN_PERIOD) revert PeriodTooShort();
        pair = pair_;
        period = period_;
        token0 = pair_.token0();
        token1 = pair_.token1();
        (uint112 reserve0, uint112 reserve1,) = pair_.getReserves();
        if (reserve0 == 0 || reserve1 == 0) revert NoReserves();
        (price0CumulativeLast, price1CumulativeLast, blockTimestampLast) = _currentCumulativePrices();
    }

    /// @notice Rolls the window forward if a full period has passed. Returns whether it did.
    function update() public returns (bool updated) {
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = _currentCumulativePrices();
        uint32 timeElapsed;
        unchecked {
            timeElapsed = blockTimestamp - blockTimestampLast; // wraps like the pair's own counter
        }
        if (timeElapsed < period) return false;

        unchecked {
            // Differences of accumulators are valid across overflow, exactly as in Uniswap V2.
            price0Average = uint224((price0Cumulative - price0CumulativeLast) / timeElapsed);
            price1Average = uint224((price1Cumulative - price1CumulativeLast) / timeElapsed);
        }
        price0CumulativeLast = price0Cumulative;
        price1CumulativeLast = price1Cumulative;
        blockTimestampLast = blockTimestamp;
        emit Updated(price0Average, price1Average, blockTimestamp);
        return true;
    }

    /// @inheritdoc ITwapOracle
    /// @dev Uses the average of the most recent closed window. That window ended less than one
    ///      `period` ago, because `update` is attempted first.
    function consult(address tokenIn, uint256 amountIn) external returns (uint256 amountOut) {
        update();
        uint224 average;
        if (tokenIn == token0) average = price0Average;
        else if (tokenIn == token1) average = price1Average;
        else revert UnsupportedToken(tokenIn);
        if (average == 0) revert NoObservationYet();
        amountOut = (uint256(average) * amountIn) >> 112;
    }

    /// @dev Accumulators as of this block, including the time since the pair last synced.
    function _currentCumulativePrices()
        private
        view
        returns (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp)
    {
        blockTimestamp = uint32(block.timestamp % 2 ** 32);
        price0Cumulative = pair.price0CumulativeLast();
        price1Cumulative = pair.price1CumulativeLast();
        (uint112 reserve0, uint112 reserve1, uint32 pairTimestamp) = pair.getReserves();
        if (pairTimestamp != blockTimestamp && reserve0 != 0 && reserve1 != 0) {
            unchecked {
                uint32 timeElapsed = blockTimestamp - pairTimestamp;
                price0Cumulative += ((uint256(reserve1) << 112) / reserve0) * timeElapsed;
                price1Cumulative += ((uint256(reserve0) << 112) / reserve1) * timeElapsed;
            }
        }
    }
}
