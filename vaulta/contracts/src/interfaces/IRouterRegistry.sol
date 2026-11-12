// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRouterRegistry
/// @notice Protocol-level list of swap adapters that vaults are allowed to whitelist.
interface IRouterRegistry {
    function isApproved(address router) external view returns (bool);
}
