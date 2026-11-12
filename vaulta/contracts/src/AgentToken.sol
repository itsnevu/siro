// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title AgentToken
/// @notice A plain fixed-supply ERC-20 launched for one agent. The whole supply is minted once.
/// @dev No owner, no mint, no pause, no blocklist, no transfer fee.
contract AgentToken is ERC20 {
    /// @notice The agent this token was launched for.
    uint256 public immutable agentId;

    constructor(string memory name_, string memory symbol_, uint256 agentId_, uint256 supply, address recipient)
        ERC20(name_, symbol_)
    {
        agentId = agentId_;
        _mint(recipient, supply);
    }
}
