// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ITwapOracle, IGuardedSwapRouter} from "./GuardedVault.sol";

interface IBurnableERC20 is IERC20 {
    function burn(uint256 amount) external;
}

contract BuybackBurn is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint16 public constant BPS = 10_000;

    IERC20 public immutable paymentToken;
    IBurnableERC20 public immutable burnToken;
    ITwapOracle public immutable oracle;
    uint32 public immutable cooldown;
    uint32 public immutable maxOracleDelay;
    uint16 public immutable maxSlippageBps;
    uint64 public lastBuyback;
    mapping(address => bool) public keepers;
    mapping(address => bool) public routers;

    error Unauthorized();
    error InvalidAddress();
    error InvalidConfig();
    error CooldownActive();
    error StaleOracle();
    error SlippageExceeded();
    event KeeperSet(address indexed keeper, bool allowed);
    event RouterSet(address indexed router, bool allowed);
    event BuybackExecuted(address indexed router, uint256 paymentAmount, uint256 burnedAmount);

    constructor(address initialOwner, IERC20 paymentToken_, IBurnableERC20 burnToken_, ITwapOracle oracle_, uint32 cooldown_, uint32 maxOracleDelay_, uint16 maxSlippageBps_) Ownable(initialOwner) {
        if (initialOwner == address(0) || address(paymentToken_) == address(0) || address(burnToken_) == address(0) || address(oracle_) == address(0)) revert InvalidAddress();
        if (maxOracleDelay_ == 0 || maxSlippageBps_ == 0 || maxSlippageBps_ > 2_000) revert InvalidConfig();
        paymentToken = paymentToken_; burnToken = burnToken_; oracle = oracle_; cooldown = cooldown_; maxOracleDelay = maxOracleDelay_; maxSlippageBps = maxSlippageBps_;
    }

    function setKeeper(address keeper, bool allowed) external onlyOwner { if (keeper == address(0)) revert InvalidAddress(); keepers[keeper] = allowed; emit KeeperSet(keeper, allowed); }
    function setRouter(address router, bool allowed) external onlyOwner { if (router == address(0)) revert InvalidAddress(); routers[router] = allowed; emit RouterSet(router, allowed); }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function execute(address router, uint256 paymentAmount, uint256 minBurnTokenOut) external nonReentrant whenNotPaused returns (uint256 burned) {
        if (!keepers[msg.sender] || !routers[router]) revert Unauthorized();
        if (block.timestamp < uint256(lastBuyback) + cooldown) revert CooldownActive();
        (uint256 expected, uint256 updatedAt) = oracle.quote(address(paymentToken), address(burnToken), paymentAmount);
        if (expected == 0 || updatedAt > block.timestamp || block.timestamp - updatedAt > maxOracleDelay) revert StaleOracle();
        if (minBurnTokenOut < expected * (BPS - maxSlippageBps) / BPS) revert SlippageExceeded();
        uint256 beforeBalance = burnToken.balanceOf(address(this));
        paymentToken.forceApprove(router, paymentAmount);
        IGuardedSwapRouter(router).swap(address(paymentToken), address(burnToken), paymentAmount, minBurnTokenOut, address(this));
        paymentToken.forceApprove(router, 0);
        burned = burnToken.balanceOf(address(this)) - beforeBalance;
        if (burned < minBurnTokenOut) revert SlippageExceeded();
        burnToken.burn(burned);
        lastBuyback = uint64(block.timestamp);
        emit BuybackExecuted(router, paymentAmount, burned);
    }
}
