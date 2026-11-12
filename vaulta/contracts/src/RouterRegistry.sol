// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IRouterRegistry} from "./interfaces/IRouterRegistry.sol";

/// @title RouterRegistry
/// @notice Protocol-wide list of swap adapters. A vault can only trade through an adapter that is
///         approved here AND whitelisted by the vault's own owner (two independent approvals).
/// @dev The owner is meant to be a TimelockController held by the treasury multisig, so approving a
///      new adapter is slow and public. Revoking must be fast when an adapter turns out to be unsafe,
///      so the guardian (the multisig itself) can revoke without the delay. The guardian cannot approve.
contract RouterRegistry is IRouterRegistry, Ownable2Step {
    address public guardian;
    mapping(address router => bool) public isApproved;

    error ZeroAddress();
    error NotOwnerOrGuardian();

    event RouterApproved(address indexed router);
    event RouterRevoked(address indexed router, address indexed by);
    event GuardianSet(address indexed guardian);

    constructor(address owner_, address guardian_) Ownable(owner_) {
        guardian = guardian_;
        emit GuardianSet(guardian_);
    }

    function approve(address router) external onlyOwner {
        if (router == address(0)) revert ZeroAddress();
        isApproved[router] = true;
        emit RouterApproved(router);
    }

    function revoke(address router) external {
        if (msg.sender != owner() && msg.sender != guardian) revert NotOwnerOrGuardian();
        isApproved[router] = false;
        emit RouterRevoked(router, msg.sender);
    }

    function setGuardian(address guardian_) external onlyOwner {
        guardian = guardian_;
        emit GuardianSet(guardian_);
    }
}
