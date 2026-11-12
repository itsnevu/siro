// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title VaultaToken
/// @notice The protocol token. The whole supply is minted once, in the constructor.
/// @dev There is no owner, no mint function, no pause, no blocklist and no transfer fee.
///      Name and symbol are constructor arguments so the project can be renamed without a code change.
contract VaultaToken is ERC20, ERC20Burnable, ERC20Permit {
    /// @notice 1,000,000,000 tokens with 18 decimals.
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;

    error ZeroAddress();

    /// @param recipient Receives the full supply. Use the launch contract or the treasury multisig.
    constructor(string memory name_, string memory symbol_, address recipient) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (recipient == address(0)) revert ZeroAddress();
        _mint(recipient, TOTAL_SUPPLY);
    }
}
