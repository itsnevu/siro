// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {IAggregatorV3, IOraclePausable} from "../interfaces/external/IChainlink.sol";

/// @title ChainlinkOracle
/// @notice Values tokens in USDG using Chainlink USD feeds. This is the only price source vaults use
///         for NAV, trade limits and slippage checks. It never reads a DEX price.
/// @dev Checks on every read, following Robinhood Chain's oracle guidance:
///        1. Sequencer uptime feed (if configured): sequencer must be up and past the grace period.
///        2. Feed answer must be positive and the round complete.
///        3. Feed must be younger than its per-feed `maxAge` (heartbeat plus a buffer).
///        4. For stock tokens: `oraclePaused()` on the token must be false (corporate action in progress).
///      Any failure reverts. Callers treat a revert as "price unavailable", never as zero.
///
///      Stock-token feeds update 24/5. Over the weekend they go stale by design, and vault operations
///      that need a price (deposits, USDG withdrawals, trades) stop until the market reopens.
///      In-kind redemption does not use this oracle and keeps working.
///
///      The stock feeds already include the ERC-8056 multiplier, so `balanceOf * price` is the full value.
///
///      Admin: the owner (a TimelockController) can add or replace a feed. Replacing a feed changes
///      vault valuations, which is why it sits behind the timelock: holders can exit before it applies.
contract ChainlinkOracle is IPriceOracle, Ownable2Step {
    struct Feed {
        IAggregatorV3 aggregator;
        uint32 maxAge;
        uint8 feedDecimals;
        uint8 tokenDecimals;
        bool checkOraclePause;
    }

    /// @notice How long after the sequencer comes back before prices are trusted again.
    uint256 public constant SEQUENCER_GRACE_PERIOD = 1 hours;

    address public immutable asset;
    uint8 public immutable assetDecimals;
    /// @notice USDG/USD feed. address(0) means USDG is taken as exactly $1.
    IAggregatorV3 public immutable assetFeed;
    uint8 public immutable assetFeedDecimals;
    uint32 public immutable assetFeedMaxAge;
    /// @notice Chainlink L2 sequencer uptime feed. address(0) disables the check.
    IAggregatorV3 public immutable sequencerUptimeFeed;

    mapping(address token => Feed) public feeds;

    error ZeroAddress();
    error InvalidMaxAge();
    error UnsupportedToken(address token);
    error InvalidPrice(address feed);
    error StalePrice(address feed, uint256 updatedAt);
    error OraclePaused(address token);
    error SequencerDown();
    error SequencerGracePeriod();

    event FeedSet(address indexed token, address indexed aggregator, uint32 maxAge, bool checkOraclePause);

    constructor(
        address owner_,
        address asset_,
        address assetFeed_,
        uint32 assetFeedMaxAge_,
        address sequencerUptimeFeed_
    ) Ownable(owner_) {
        if (asset_ == address(0)) revert ZeroAddress();
        asset = asset_;
        assetDecimals = IERC20Metadata(asset_).decimals();
        assetFeed = IAggregatorV3(assetFeed_);
        if (assetFeed_ != address(0)) {
            if (assetFeedMaxAge_ == 0) revert InvalidMaxAge();
            assetFeedDecimals = IAggregatorV3(assetFeed_).decimals();
            assetFeedMaxAge = assetFeedMaxAge_;
        }
        sequencerUptimeFeed = IAggregatorV3(sequencerUptimeFeed_);
    }

    /// @notice Adds or replaces the feed for `token`. Owner only (timelocked).
    /// @param maxAge Seconds after which the feed's price is refused. Use heartbeat plus a buffer.
    /// @param checkOraclePause True for Robinhood stock tokens, which expose `oraclePaused()`.
    function setFeed(address token, address aggregator, uint32 maxAge, bool checkOraclePause) external onlyOwner {
        if (token == address(0) || aggregator == address(0)) revert ZeroAddress();
        if (maxAge == 0) revert InvalidMaxAge();
        feeds[token] = Feed({
            aggregator: IAggregatorV3(aggregator),
            maxAge: maxAge,
            feedDecimals: IAggregatorV3(aggregator).decimals(),
            tokenDecimals: IERC20Metadata(token).decimals(),
            checkOraclePause: checkOraclePause
        });
        emit FeedSet(token, aggregator, maxAge, checkOraclePause);
    }

    /// @inheritdoc IPriceOracle
    function isSupported(address token) external view returns (bool) {
        return token == asset || address(feeds[token].aggregator) != address(0);
    }

    /// @inheritdoc IPriceOracle
    function valueOf(address token, uint256 amount) external view returns (uint256 value) {
        if (token == asset) return amount;
        Feed memory feed = feeds[token];
        if (address(feed.aggregator) == address(0)) revert UnsupportedToken(token);

        _checkSequencer();
        if (feed.checkOraclePause && IOraclePausable(token).oraclePaused()) revert OraclePaused(token);

        uint256 tokenUsd = _readPrice(feed.aggregator, feed.maxAge);
        uint256 assetUsd;
        uint256 assetUsdScale;
        if (address(assetFeed) == address(0)) {
            assetUsd = 1;
            assetUsdScale = 1;
        } else {
            assetUsd = _readPrice(assetFeed, assetFeedMaxAge);
            assetUsdScale = 10 ** assetFeedDecimals;
        }

        // value = amount * tokenUsd / 10^feedDec / 10^tokenDec  (USD)
        //         * 10^assetDec * assetUsdScale / assetUsd       (USD -> asset units)
        // A single mulDiv-style expression keeps precision; intermediate products stay far below 2^256
        // for any realistic balance (amount < 1e36, price < 1e18, scales <= 1e18 each).
        value = (amount * tokenUsd * (10 ** assetDecimals) * assetUsdScale)
            / (10 ** feed.feedDecimals * 10 ** feed.tokenDecimals * assetUsd);
    }

    function _readPrice(IAggregatorV3 aggregator, uint32 maxAge) private view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = aggregator.latestRoundData();
        if (answer <= 0 || updatedAt == 0) revert InvalidPrice(address(aggregator));
        if (updatedAt > block.timestamp || block.timestamp - updatedAt > maxAge) {
            revert StalePrice(address(aggregator), updatedAt);
        }
        return uint256(answer);
    }

    function _checkSequencer() private view {
        if (address(sequencerUptimeFeed) == address(0)) return;
        (, int256 status, uint256 startedAt,,) = sequencerUptimeFeed.latestRoundData();
        // 0 = sequencer up, 1 = down.
        if (status != 0) revert SequencerDown();
        if (block.timestamp - startedAt <= SEQUENCER_GRACE_PERIOD) revert SequencerGracePeriod();
    }
}
