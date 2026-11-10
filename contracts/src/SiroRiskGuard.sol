// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SiroRiskGuard
 * @notice Onchain guard contract that validates every trade before the keeper executes it.
 *         Each vault owner configures their own risk parameters. If any check fails, the
 *         transaction reverts — the keeper cannot bypass RiskGuard.
 *
 * @dev Risk parameters per vault:
 *        - maxTradeSize:        Maximum single trade as % of vault (bps).
 *        - dailyLossLimit:      Maximum daily loss as % of vault (bps).
 *        - maxPositionPerToken: Maximum exposure to a single token as % of vault (bps).
 *        - slippageTolerance:   Maximum slippage (bps).
 *        - Token whitelist:     Only approved tokens can be traded.
 *        - Kill switch:         User can freeze all trading instantly.
 */
contract SiroRiskGuard {
    // ------------------------------------------------------------------ types

    struct RiskConfig {
        uint16 maxTradeSizeBps;        // max single trade as % of vault (default 1000 = 10%)
        uint16 dailyLossLimitBps;      // max daily loss as % of vault (default 500 = 5%)
        uint16 maxPositionPerTokenBps; // max per-token exposure as % of vault (default 2500 = 25%)
        uint16 slippageToleranceBps;   // max slippage (default 100 = 1%)
        bool   killSwitch;             // true = all trading frozen
        bool   initialized;            // true once the user has set their config
    }

    // -------------------------------------------------------------- constants

    uint16 public constant BPS = 10_000;

    uint16 public constant DEFAULT_MAX_TRADE_BPS = 1_000;     // 10%
    uint16 public constant DEFAULT_DAILY_LOSS_BPS = 500;      // 5%
    uint16 public constant DEFAULT_MAX_POSITION_BPS = 2_500;  // 25%
    uint16 public constant DEFAULT_SLIPPAGE_BPS = 100;        // 1%

    // ---------------------------------------------------------------- storage

    address public copyVault;
    address public owner;

    mapping(address => RiskConfig) public riskConfigs;
    mapping(address => mapping(address => bool)) public tokenWhitelist;
    mapping(address => mapping(uint256 => uint256)) public dailyLoss;
    mapping(address => mapping(address => uint256)) public tokenPositions;

    // ----------------------------------------------------------------- events

    event RiskConfigUpdated(
        address indexed user,
        uint16 maxTradeSizeBps,
        uint16 dailyLossLimitBps,
        uint16 maxPositionPerTokenBps,
        uint16 slippageToleranceBps
    );
    event KillSwitchToggled(address indexed user, bool frozen);
    event TokenWhitelistUpdated(address indexed user, address indexed token, bool allowed);
    event TradeRecorded(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event CopyVaultSet(address indexed vault);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    // ----------------------------------------------------------------- errors

    error Unauthorized();
    error InvalidBps();
    error ZeroAddress();

    // ------------------------------------------------------------ constructor

    constructor() {
        owner = msg.sender;
    }

    // -------------------------------------------------------------- modifiers

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyCopyVault() {
        if (msg.sender != copyVault) revert Unauthorized();
        _;
    }

    // --------------------------------------------------------- user config

    function setRiskConfig(
        uint16 maxTradeSizeBps,
        uint16 dailyLossLimitBps,
        uint16 maxPositionPerTokenBps,
        uint16 slippageToleranceBps
    ) external {
        if (maxTradeSizeBps == 0 || maxTradeSizeBps > BPS) revert InvalidBps();
        if (dailyLossLimitBps == 0 || dailyLossLimitBps > BPS) revert InvalidBps();
        if (maxPositionPerTokenBps == 0 || maxPositionPerTokenBps > BPS) revert InvalidBps();
        if (slippageToleranceBps == 0 || slippageToleranceBps > BPS) revert InvalidBps();

        RiskConfig storage rc = riskConfigs[msg.sender];
        rc.maxTradeSizeBps = maxTradeSizeBps;
        rc.dailyLossLimitBps = dailyLossLimitBps;
        rc.maxPositionPerTokenBps = maxPositionPerTokenBps;
        rc.slippageToleranceBps = slippageToleranceBps;
        rc.initialized = true;

        emit RiskConfigUpdated(msg.sender, maxTradeSizeBps, dailyLossLimitBps, maxPositionPerTokenBps, slippageToleranceBps);
    }

    function setKillSwitch(bool frozen) external {
        riskConfigs[msg.sender].killSwitch = frozen;
        emit KillSwitchToggled(msg.sender, frozen);
    }

    function setTokenWhitelist(address token, bool allowed) external {
        if (token == address(0)) revert ZeroAddress();
        tokenWhitelist[msg.sender][token] = allowed;
        emit TokenWhitelistUpdated(msg.sender, token, allowed);
    }

    function setTokenWhitelistBatch(address[] calldata tokens, bool allowed) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) revert ZeroAddress();
            tokenWhitelist[msg.sender][tokens[i]] = allowed;
            emit TokenWhitelistUpdated(msg.sender, tokens[i], allowed);
        }
    }

    // ----------------------------------------------------------- validation

    function validateTrade(
        address vault,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 vaultBal
    ) external view returns (bool valid) {
        RiskConfig storage rc = riskConfigs[vault];

        uint16 maxTrade = rc.initialized ? rc.maxTradeSizeBps : DEFAULT_MAX_TRADE_BPS;
        uint16 dailyLossLimit = rc.initialized ? rc.dailyLossLimitBps : DEFAULT_DAILY_LOSS_BPS;
        uint16 maxPosition = rc.initialized ? rc.maxPositionPerTokenBps : DEFAULT_MAX_POSITION_BPS;

        if (rc.killSwitch) return false;

        // Token whitelist check (skip if user hasn't set any whitelist)
        if (rc.initialized) {
            if (tokenIn != address(0) && !tokenWhitelist[vault][tokenIn]) return false;
            if (tokenOut != address(0) && !tokenWhitelist[vault][tokenOut]) return false;
        }

        // Max trade size check
        if (vaultBal > 0) {
            uint256 maxTradeAmount = (vaultBal * maxTrade) / BPS;
            if (amountIn > maxTradeAmount) return false;
        }

        // Daily loss limit check
        uint256 today = block.timestamp / 1 days;
        uint256 todayLoss = dailyLoss[vault][today];
        uint256 maxDailyLossAmount = (vaultBal * dailyLossLimit) / BPS;
        if (todayLoss + amountIn > maxDailyLossAmount) return false;

        // Max position per token check
        if (tokenOut != address(0) && vaultBal > 0) {
            uint256 currentPosition = tokenPositions[vault][tokenOut];
            uint256 maxPositionAmount = (vaultBal * maxPosition) / BPS;
            if (currentPosition + amountIn > maxPositionAmount) return false;
        }

        return true;
    }

    function recordTrade(
        address vault,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) external onlyCopyVault {
        uint256 today = block.timestamp / 1 days;
        dailyLoss[vault][today] += amountIn;

        if (tokenIn != address(0)) {
            if (tokenPositions[vault][tokenIn] >= amountIn) {
                tokenPositions[vault][tokenIn] -= amountIn;
            } else {
                tokenPositions[vault][tokenIn] = 0;
            }
        }
        if (tokenOut != address(0)) {
            tokenPositions[vault][tokenOut] += amountOut;
        }

        emit TradeRecorded(vault, tokenIn, tokenOut, amountIn, amountOut);
    }

    // ------------------------------------------------------------- admin

    function setCopyVault(address vault) external onlyOwner {
        if (vault == address(0)) revert ZeroAddress();
        copyVault = vault;
        emit CopyVaultSet(vault);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ------------------------------------------------------------------ views

    function getRiskConfig(address user) external view returns (
        uint16 maxTradeSizeBps,
        uint16 dailyLossLimitBps,
        uint16 maxPositionPerTokenBps,
        uint16 slippageToleranceBps,
        bool killSwitch,
        bool initialized
    ) {
        RiskConfig storage rc = riskConfigs[user];
        if (!rc.initialized) {
            return (DEFAULT_MAX_TRADE_BPS, DEFAULT_DAILY_LOSS_BPS, DEFAULT_MAX_POSITION_BPS, DEFAULT_SLIPPAGE_BPS, false, false);
        }
        return (rc.maxTradeSizeBps, rc.dailyLossLimitBps, rc.maxPositionPerTokenBps, rc.slippageToleranceBps, rc.killSwitch, true);
    }

    function getDailyLoss(address user) external view returns (uint256) {
        return dailyLoss[user][block.timestamp / 1 days];
    }

    function getTokenPosition(address user, address token) external view returns (uint256) {
        return tokenPositions[user][token];
    }

    function isTokenAllowed(address user, address token) external view returns (bool) {
        if (!riskConfigs[user].initialized) return true;
        return tokenWhitelist[user][token];
    }

    function getSlippageTolerance(address user) external view returns (uint16) {
        RiskConfig storage rc = riskConfigs[user];
        return rc.initialized ? rc.slippageToleranceBps : DEFAULT_SLIPPAGE_BPS;
    }
}
