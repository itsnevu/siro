// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPriceOracle
/// @notice Values a token amount in units of the vault asset (USDG).
/// @dev Implementations MUST revert when they cannot give a trustworthy price (stale round, paused
///      oracle, sequencer down, unknown token). They must never return zero or a guess instead.
///      Implementations MUST NOT read a DEX spot price.
interface IPriceOracle {
    /// @return value `amount` of `token` expressed in asset units, rounded down.
    function valueOf(address token, uint256 amount) external view returns (uint256 value);

    /// @notice True if a feed is configured for `token`. Does not say whether the price is fresh.
    function isSupported(address token) external view returns (bool);
}
