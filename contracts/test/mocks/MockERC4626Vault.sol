// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockERC4626Vault is ERC4626 {
    uint256 private _maxWithdrawOverride;
    bool private _useMaxWithdrawOverride;
    bool public paused;

    constructor(IERC20 asset_, string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        ERC4626(asset_)
    {}

    function setMaxWithdrawOverride(uint256 val) external {
        _maxWithdrawOverride = val;
        _useMaxWithdrawOverride = true;
    }

    function clearMaxWithdrawOverride() external {
        _useMaxWithdrawOverride = false;
    }

    function setPaused(bool val) external {
        paused = val;
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        if (_useMaxWithdrawOverride) return _maxWithdrawOverride;
        return super.maxWithdraw(owner);
    }
}
