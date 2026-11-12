// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface ITwapOracle {
    function quote(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut, uint256 updatedAt);
}

interface IGuardedSwapRouter {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient) external returns (uint256 amountOut);
}

contract GuardedVault is ERC4626, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant BPS = 10_000;
    uint256 public constant MAX_TRACKED_ASSETS = 32;

    struct Policy {
        uint16 maxTradeBps;
        uint16 maxAllocationBps;
        uint16 maxDailyLossBps;
        uint16 maxSlippageBps;
        uint32 cooldown;
        uint32 maxOracleDelay;
    }

    struct PendingPolicy { Policy value; uint64 validAfter; }
    struct PendingPermission { bool allowed; uint64 validAfter; bool exists; }

    ITwapOracle public immutable oracle;
    uint64 public immutable policyDelay;
    Policy public policy;
    PendingPolicy public pendingPolicy;
    bool public killSwitch;
    uint64 public lastExecution;
    uint64 public lossDay;
    uint256 public dailyLossAssets;

    mapping(address => bool) public executors;
    mapping(address => bool) public allowedTokens;
    mapping(address => bool) public allowedRouters;
    mapping(address => PendingPermission) public pendingTokenPermission;
    mapping(address => PendingPermission) public pendingRouterPermission;
    mapping(address => PendingPermission) public pendingExecutorPermission;
    address[] public trackedAssets;

    error Unauthorized();
    error InvalidPolicy();
    error InvalidAddress();
    error TimelockActive();
    error PermissionNotQueued();
    error TradingPaused();
    error TokenNotAllowed();
    error RouterNotAllowed();
    error CooldownActive();
    error TradeTooLarge();
    error StaleOracle();
    error SlippageExceeded();
    error AllocationExceeded();
    error DailyLossExceeded();
    error AssetLimitReached();
    error InvalidShares();

    event PolicyQueued(bytes32 indexed policyHash, uint64 validAfter);
    event PolicyActivated(bytes32 indexed policyHash);
    event PermissionQueued(bytes32 indexed kind, address indexed account, bool allowed, uint64 validAfter);
    event PermissionActivated(bytes32 indexed kind, address indexed account, bool allowed);
    event KillSwitchSet(bool active);
    event RedeemedInKind(address indexed caller, address indexed receiver, address indexed owner, uint256 shares);
    event TradeExecuted(address indexed executor, address indexed router, address indexed tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 lossAssets);

    modifier onlyExecutor() { if (!executors[msg.sender]) revert Unauthorized(); _; }

    constructor(IERC20 asset_, string memory name_, string memory symbol_, address owner_, ITwapOracle oracle_, uint64 policyDelay_, Policy memory initialPolicy)
        ERC20(name_, symbol_) ERC4626(asset_) Ownable(owner_)
    {
        if (address(asset_) == address(0) || address(oracle_) == address(0) || owner_ == address(0)) revert InvalidAddress();
        _validatePolicy(initialPolicy);
        oracle = oracle_;
        policyDelay = policyDelay_;
        policy = initialPolicy;
        allowedTokens[address(asset_)] = true;
        trackedAssets.push(address(asset_));
    }

    function totalAssets() public view override returns (uint256 value) {
        address base = asset();
        value = IERC20(base).balanceOf(address(this));
        for (uint256 i; i < trackedAssets.length; ++i) {
            address token = trackedAssets[i];
            // Disallowing a token only stops new trades into it; held units still count,
            // otherwise toggling permission would let the owner mint cheap shares.
            if (token == base) continue;
            uint256 balance = IERC20(token).balanceOf(address(this));
            if (balance == 0) continue;
            (uint256 quoted,) = oracle.quote(token, base, balance);
            value += quoted;
        }
    }

    function queuePolicy(Policy calldata nextPolicy) external onlyOwner {
        _validatePolicy(nextPolicy);
        uint64 validAfter = uint64(block.timestamp) + policyDelay;
        pendingPolicy = PendingPolicy(nextPolicy, validAfter);
        emit PolicyQueued(keccak256(abi.encode(nextPolicy)), validAfter);
    }

    function activatePolicy() external {
        uint64 validAfter = pendingPolicy.validAfter;
        if (validAfter == 0) revert PermissionNotQueued();
        if (block.timestamp < validAfter) revert TimelockActive();
        policy = pendingPolicy.value;
        delete pendingPolicy;
        emit PolicyActivated(keccak256(abi.encode(policy)));
    }

    function queueTokenPermission(address token, bool allowed) external onlyOwner { _queuePermission(pendingTokenPermission, token, allowed, keccak256("TOKEN")); }
    function queueRouterPermission(address router, bool allowed) external onlyOwner { _queuePermission(pendingRouterPermission, router, allowed, keccak256("ROUTER")); }
    function queueExecutorPermission(address executor, bool allowed) external onlyOwner { _queuePermission(pendingExecutorPermission, executor, allowed, keccak256("EXECUTOR")); }

    function activateTokenPermission(address token) external {
        bool allowed = _activatePermission(pendingTokenPermission, token, keccak256("TOKEN"));
        if (allowed && !allowedTokens[token]) {
            if (trackedAssets.length >= MAX_TRACKED_ASSETS) revert AssetLimitReached();
            trackedAssets.push(token);
        }
        allowedTokens[token] = allowed;
    }

    function activateRouterPermission(address router) external { allowedRouters[router] = _activatePermission(pendingRouterPermission, router, keccak256("ROUTER")); }
    function activateExecutorPermission(address executor) external { executors[executor] = _activatePermission(pendingExecutorPermission, executor, keccak256("EXECUTOR")); }

    function setKillSwitch(bool active) external onlyOwner { killSwitch = active; emit KillSwitchSet(active); }

    function executeTrade(address router, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)
        external onlyExecutor nonReentrant returns (uint256 amountOut)
    {
        if (killSwitch) revert TradingPaused();
        if (!allowedRouters[router]) revert RouterNotAllowed();
        if (!allowedTokens[tokenIn] || !allowedTokens[tokenOut] || tokenIn == tokenOut) revert TokenNotAllowed();
        if (block.timestamp < uint256(lastExecution) + policy.cooldown) revert CooldownActive();

        uint256 valueBefore = _freshQuote(tokenIn, asset(), amountIn);
        uint256 vaultValueBefore = totalAssets();
        if (amountIn == 0 || valueBefore > vaultValueBefore * policy.maxTradeBps / BPS) revert TradeTooLarge();
        uint256 expectedOut = _freshQuote(tokenIn, tokenOut, amountIn);
        if (minAmountOut < expectedOut * (BPS - policy.maxSlippageBps) / BPS) revert SlippageExceeded();

        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));
        IERC20(tokenIn).forceApprove(router, amountIn);
        IGuardedSwapRouter(router).swap(tokenIn, tokenOut, amountIn, minAmountOut, address(this));
        IERC20(tokenIn).forceApprove(router, 0);
        amountOut = IERC20(tokenOut).balanceOf(address(this)) - balanceBefore;
        if (amountOut < minAmountOut) revert SlippageExceeded();

        uint256 valueAfter = _freshQuote(tokenOut, asset(), amountOut);
        uint256 loss = valueBefore > valueAfter ? valueBefore - valueAfter : 0;
        _recordLoss(loss, vaultValueBefore);
        uint256 tokenOutValue = _freshQuote(tokenOut, asset(), IERC20(tokenOut).balanceOf(address(this)));
        if (tokenOut != asset() && tokenOutValue > totalAssets() * policy.maxAllocationBps / BPS) revert AllocationExceeded();
        lastExecution = uint64(block.timestamp);
        emit TradeExecuted(msg.sender, router, tokenIn, tokenOut, amountIn, amountOut, loss);
    }

    /// Exit that never depends on the oracle, the kill switch or market liquidity:
    /// burns `shares` for the same fraction of every asset the vault holds.
    function redeemInKind(uint256 shares, address receiver, address shareOwner)
        external nonReentrant returns (uint256[] memory amounts)
    {
        if (shares == 0) revert InvalidShares();
        if (receiver == address(0)) revert InvalidAddress();
        if (msg.sender != shareOwner) _spendAllowance(shareOwner, msg.sender, shares);
        uint256 supply = totalSupply();
        _burn(shareOwner, shares);

        uint256 count = trackedAssets.length;
        amounts = new uint256[](count);
        for (uint256 i; i < count; ++i) {
            IERC20 token = IERC20(trackedAssets[i]);
            uint256 amount = Math.mulDiv(token.balanceOf(address(this)), shares, supply);
            amounts[i] = amount;
            if (amount != 0) token.safeTransfer(receiver, amount);
        }
        emit RedeemedInKind(msg.sender, receiver, shareOwner, shares);
    }

    function trackedAssetCount() external view returns (uint256) { return trackedAssets.length; }

    // Share-price-sensitive entry points share the trade lock, so a router cannot
    // deposit or redeem while a swap has the vault half-converted.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override nonReentrant {
        super._deposit(caller, receiver, assets, shares);
    }

    function _withdraw(address caller, address receiver, address shareOwner, uint256 assets, uint256 shares) internal override nonReentrant {
        super._withdraw(caller, receiver, shareOwner, assets, shares);
    }

    // 1e6 virtual shares per asset unit makes a first-deposit donation attack cost far more than it can steal.
    function _decimalsOffset() internal pure override returns (uint8) { return 6; }

    function _recordLoss(uint256 loss, uint256 vaultValue) private {
        uint64 today = uint64(block.timestamp / 1 days);
        if (lossDay != today) { lossDay = today; dailyLossAssets = 0; }
        dailyLossAssets += loss;
        if (dailyLossAssets > vaultValue * policy.maxDailyLossBps / BPS) revert DailyLossExceeded();
    }

    function _freshQuote(address tokenIn, address tokenOut, uint256 amount) private view returns (uint256 amountOut) {
        if (tokenIn == tokenOut) return amount;
        uint256 updatedAt;
        (amountOut, updatedAt) = oracle.quote(tokenIn, tokenOut, amount);
        if (amountOut == 0 || updatedAt > block.timestamp || block.timestamp - updatedAt > policy.maxOracleDelay) revert StaleOracle();
    }

    function _validatePolicy(Policy memory value) private pure {
        if (value.maxTradeBps == 0 || value.maxTradeBps > BPS || value.maxAllocationBps == 0 || value.maxAllocationBps > BPS || value.maxDailyLossBps == 0 || value.maxDailyLossBps > BPS || value.maxSlippageBps == 0 || value.maxSlippageBps > 2_000 || value.maxOracleDelay == 0) revert InvalidPolicy();
    }

    function _queuePermission(mapping(address => PendingPermission) storage queue, address account, bool allowed, bytes32 kind) private {
        if (account == address(0)) revert InvalidAddress();
        uint64 validAfter = uint64(block.timestamp) + policyDelay;
        queue[account] = PendingPermission(allowed, validAfter, true);
        emit PermissionQueued(kind, account, allowed, validAfter);
    }

    function _activatePermission(mapping(address => PendingPermission) storage queue, address account, bytes32 kind) private returns (bool allowed) {
        PendingPermission memory pending = queue[account];
        if (!pending.exists) revert PermissionNotQueued();
        if (block.timestamp < pending.validAfter) revert TimelockActive();
        allowed = pending.allowed;
        delete queue[account];
        emit PermissionActivated(kind, account, allowed);
    }
}
