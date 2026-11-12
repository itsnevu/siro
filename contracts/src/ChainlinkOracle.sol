// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ITwapOracle} from "./GuardedVault.sol";

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

interface IStockToken {
    function oraclePaused() external view returns (bool);
}

/// Prices any pair of registered tokens through their Chainlink USD feeds, so a stock
/// quoted in USDG accounts for USDG's own USD price. Freshness is enforced by the caller
/// (GuardedVault.maxOracleDelay) against the returned, oldest `updatedAt`.
contract ChainlinkOracle is ITwapOracle, Ownable2Step {
    struct Feed {
        IAggregatorV3 aggregator;
        uint8 tokenDecimals;
        uint8 feedDecimals;
        bool checkOraclePause;
    }

    mapping(address => Feed) public feeds;

    error FeedNotSet();
    error FeedAlreadySet();
    error InvalidPrice();
    error PriceUnavailable();

    event FeedSet(address indexed token, address indexed aggregator, bool checkOraclePause);

    constructor(address owner_) Ownable(owner_) {}

    /// Write-once: a feed can never be swapped for one that misprices a vault's holdings.
    function setFeed(address token, IAggregatorV3 aggregator, bool checkOraclePause) external onlyOwner {
        if (address(feeds[token].aggregator) != address(0)) revert FeedAlreadySet();
        feeds[token] = Feed(aggregator, IERC20Metadata(token).decimals(), aggregator.decimals(), checkOraclePause);
        emit FeedSet(token, address(aggregator), checkOraclePause);
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut, uint256 updatedAt) {
        Feed memory fin = feeds[tokenIn];
        Feed memory fout = feeds[tokenOut];
        (uint256 priceIn, uint256 atIn) = _read(tokenIn, fin);
        (uint256 priceOut, uint256 atOut) = _read(tokenOut, fout);
        amountOut = Math.mulDiv(
            amountIn,
            priceIn * 10 ** (uint256(fout.tokenDecimals) + fout.feedDecimals),
            priceOut * 10 ** (uint256(fin.tokenDecimals) + fin.feedDecimals)
        );
        updatedAt = atIn < atOut ? atIn : atOut;
    }

    function _read(address token, Feed memory feed) private view returns (uint256 price, uint256 updatedAt) {
        if (address(feed.aggregator) == address(0)) revert FeedNotSet();
        // Robinhood pauses a stock's feed during corporate actions; its last value is not trusted.
        if (feed.checkOraclePause && IStockToken(token).oraclePaused()) revert PriceUnavailable();
        (, int256 answer,, uint256 at,) = feed.aggregator.latestRoundData();
        if (answer <= 0 || at == 0) revert InvalidPrice();
        return (uint256(answer), at);
    }
}
