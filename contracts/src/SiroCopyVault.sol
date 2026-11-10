// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SiroCopyVault
 * @notice Non-custodial copy-trading vaults for the Siro platform.
 *
 *         Each depositor owns a personal vault (keyed by their address). An AI keeper
 *         agent can execute swaps on their behalf through whitelisted DEX routers, but
 *         can never transfer, approve, or withdraw funds to external addresses. The
 *         depositor can pause or withdraw at any time without permission.
 *
 * @dev Dual-mode: native USDC on Arc (usdcToken == address(0), amounts as msg.value
 *      with 18 decimals) or ERC-20 mode on Robinhood Chain (USDG, 6 decimals, pulled
 *      with transferFrom).
 *
 *      Fee model:
 *        - 15% performance fee on new profit above the high-water mark.
 *        - Of that 15%, 10% goes to the leaders the vault follows, 5% to the protocol.
 *        - Fees are collected on withdrawal or can be harvested by the protocol.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface ISiroRiskGuard {
    function validateTrade(
        address vault,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 vaultBalance
    ) external view returns (bool);

    function recordTrade(
        address vault,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) external;
}

interface ISiroLeaderboard {
    function updateFollowerCount(address leader, bool increment) external;
}

contract SiroCopyVault {
    // ------------------------------------------------------------------ types

    struct Vault {
        uint256 deposited;
        uint256 highWaterMark;
        uint256 totalWithdrawn;
        uint256 totalFeePaid;
        address[] leaders;
        bool paused;
        uint256 createdAt;
    }

    // -------------------------------------------------------------- constants

    uint16 public constant BPS = 10_000;
    uint16 public constant PERF_FEE_BPS = 1_500;       // 15%
    uint16 public constant LEADER_SHARE_BPS = 1_000;    // 10% of vault profit
    uint16 public constant PROTOCOL_SHARE_BPS = 500;    // 5% of vault profit
    uint8  public constant MAX_LEADERS = 5;

    // Allowed swap function selectors (4-byte signatures)
    // Common DEX selectors: swapExactTokensForTokens, swapExactETHForTokens, etc.
    mapping(bytes4 => bool) public allowedSelectors;

    // ---------------------------------------------------------------- storage

    IERC20 public immutable usdcToken;

    address public owner;
    address public keeper;

    ISiroRiskGuard public riskGuard;
    ISiroLeaderboard public leaderboard;

    mapping(address => bool) public whitelistedRouters;

    mapping(address => Vault) internal _vaults;
    mapping(address => bool) public hasVault;

    uint256 public protocolFees;
    mapping(address => uint256) public leaderFees;
    mapping(address => uint256) public vaultBalance;

    address[] public vaultOwners;
    mapping(address => uint256) internal _vaultOwnerIndex;

    uint256 private _lock = 1;

    // ----------------------------------------------------------------- events

    event VaultCreated(address indexed owner, uint256 amount, address[] leaders, uint256 timestamp);
    event Deposited(address indexed owner, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed owner, uint256 amount, uint256 fee, uint256 remaining);
    event VaultPaused(address indexed owner);
    event VaultResumed(address indexed owner);
    event LeadersUpdated(address indexed owner, address[] oldLeaders, address[] newLeaders);
    event SwapExecuted(
        address indexed vaultOwner,
        address indexed router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);
    event RiskGuardUpdated(address indexed oldGuard, address indexed newGuard);
    event LeaderboardUpdated(address indexed oldBoard, address indexed newBoard);
    event RouterWhitelisted(address indexed router, bool allowed);
    event SelectorAllowed(bytes4 indexed selector, bool allowed);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);
    event ProtocolFeesCollected(address indexed to, uint256 amount);
    event LeaderFeeClaimed(address indexed leader, uint256 amount);
    event PerformanceFeeCharged(address indexed vaultOwner, uint256 profit, uint256 leaderFee, uint256 protocolFee);

    // ----------------------------------------------------------------- errors

    error InvalidAmount();
    error InvalidLeaderCount();
    error DuplicateLeader();
    error LeaderIsSelf();
    error VaultAlreadyExists();
    error NoVault();
    error VaultPausedError();
    error VaultNotPaused();
    error Unauthorized();
    error RouterNotWhitelisted();
    error SelectorNotAllowed();
    error RiskCheckFailed();
    error TransferFailed();
    error UnexpectedValue();
    error NothingToClaim();
    error SwapFailed();
    error Reentrancy();
    error ZeroAddress();

    // -------------------------------------------------------------- modifiers

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert Unauthorized();
        _;
    }

    modifier vaultExists(address user) {
        if (!hasVault[user]) revert NoVault();
        _;
    }

    // ------------------------------------------------------------ constructor

    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
        owner = msg.sender;
    }

    // --------------------------------------------------------- vault lifecycle

    function createVault(address[] calldata leaders, uint256 amount) external payable nonReentrant {
        if (hasVault[msg.sender]) revert VaultAlreadyExists();
        if (amount == 0) revert InvalidAmount();
        _validateLeaders(leaders);
        _pullFunds(amount);

        Vault storage v = _vaults[msg.sender];
        v.deposited = amount;
        v.highWaterMark = amount;
        v.leaders = leaders;
        v.createdAt = block.timestamp;
        hasVault[msg.sender] = true;
        vaultBalance[msg.sender] = amount;

        _vaultOwnerIndex[msg.sender] = vaultOwners.length;
        vaultOwners.push(msg.sender);

        // Update follower counts on leaderboard
        if (address(leaderboard) != address(0)) {
            for (uint256 i = 0; i < leaders.length; i++) {
                leaderboard.updateFollowerCount(leaders[i], true);
            }
        }

        emit VaultCreated(msg.sender, amount, leaders, block.timestamp);
    }

    function deposit(uint256 amount) external payable nonReentrant vaultExists(msg.sender) {
        if (amount == 0) revert InvalidAmount();
        _pullFunds(amount);

        Vault storage v = _vaults[msg.sender];
        v.deposited += amount;
        vaultBalance[msg.sender] += amount;

        if (vaultBalance[msg.sender] > v.highWaterMark) {
            v.highWaterMark = vaultBalance[msg.sender];
        }

        emit Deposited(msg.sender, amount, vaultBalance[msg.sender]);
    }

    function withdraw(uint256 amount) external nonReentrant vaultExists(msg.sender) {
        uint256 bal = vaultBalance[msg.sender];
        if (amount == type(uint256).max) amount = bal;
        if (amount == 0 || amount > bal) revert InvalidAmount();

        Vault storage v = _vaults[msg.sender];

        uint256 totalFee = _chargePerformanceFee(msg.sender);

        bal = vaultBalance[msg.sender];
        if (amount > bal) amount = bal;

        vaultBalance[msg.sender] -= amount;
        v.totalWithdrawn += amount;

        if (vaultBalance[msg.sender] > 0 && bal > 0) {
            v.highWaterMark = (v.highWaterMark * vaultBalance[msg.sender]) / bal;
        } else {
            v.highWaterMark = 0;
        }

        _pushFunds(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, totalFee, vaultBalance[msg.sender]);

        if (vaultBalance[msg.sender] == 0) {
            _removeVaultOwner(msg.sender);
            hasVault[msg.sender] = false;

            // Decrement follower counts
            if (address(leaderboard) != address(0)) {
                for (uint256 i = 0; i < v.leaders.length; i++) {
                    leaderboard.updateFollowerCount(v.leaders[i], false);
                }
            }
        }
    }

    function pauseVault() external vaultExists(msg.sender) {
        Vault storage v = _vaults[msg.sender];
        if (v.paused) revert VaultPausedError();
        v.paused = true;
        emit VaultPaused(msg.sender);
    }

    function resumeVault() external vaultExists(msg.sender) {
        Vault storage v = _vaults[msg.sender];
        if (!v.paused) revert VaultNotPaused();
        v.paused = false;
        emit VaultResumed(msg.sender);
    }

    function setLeaders(address[] calldata newLeaders) external vaultExists(msg.sender) {
        _validateLeaders(newLeaders);
        Vault storage v = _vaults[msg.sender];
        address[] memory oldLeaders = v.leaders;

        // Decrement old leader follower counts
        if (address(leaderboard) != address(0)) {
            for (uint256 i = 0; i < oldLeaders.length; i++) {
                leaderboard.updateFollowerCount(oldLeaders[i], false);
            }
        }

        v.leaders = newLeaders;

        // Increment new leader follower counts
        if (address(leaderboard) != address(0)) {
            for (uint256 i = 0; i < newLeaders.length; i++) {
                leaderboard.updateFollowerCount(newLeaders[i], true);
            }
        }

        emit LeadersUpdated(msg.sender, oldLeaders, newLeaders);
    }

    // -------------------------------------------------------- keeper execution

    struct SwapParams {
        address vaultOwner;
        address router;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
    }

    function executeSwap(
        SwapParams calldata p,
        bytes calldata swapData
    ) external onlyKeeper nonReentrant vaultExists(p.vaultOwner) {
        Vault storage v = _vaults[p.vaultOwner];
        if (v.paused) revert VaultPausedError();
        if (!whitelistedRouters[p.router]) revert RouterNotWhitelisted();
        if (p.amountIn == 0) revert InvalidAmount();
        if (p.amountIn > vaultBalance[p.vaultOwner]) revert InvalidAmount();

        // Validate swap function selector
        if (swapData.length < 4) revert SelectorNotAllowed();
        if (!allowedSelectors[bytes4(swapData[:4])]) revert SelectorNotAllowed();

        // RiskGuard check
        if (address(riskGuard) != address(0)) {
            if (!riskGuard.validateTrade(p.vaultOwner, p.tokenIn, p.tokenOut, p.amountIn, vaultBalance[p.vaultOwner])) {
                revert RiskCheckFailed();
            }
        }

        uint256 amountOut = _doSwap(p, swapData);

        // Enforce minimum output (slippage protection)
        if (amountOut < p.minAmountOut) revert SwapFailed();

        // Update vault balance tracking
        _updateBalance(p.vaultOwner, p.tokenIn, p.tokenOut, p.amountIn, amountOut);

        // Record trade in RiskGuard for daily loss / position tracking
        if (address(riskGuard) != address(0)) {
            riskGuard.recordTrade(p.vaultOwner, p.tokenIn, p.tokenOut, p.amountIn, amountOut);
        }

        emit SwapExecuted(p.vaultOwner, p.router, p.tokenIn, p.tokenOut, p.amountIn, amountOut);
    }

    function _doSwap(SwapParams calldata p, bytes calldata swapData) internal returns (uint256 amountOut) {
        uint256 balBefore = p.tokenOut == address(0)
            ? address(this).balance
            : IERC20(p.tokenOut).balanceOf(address(this));

        if (p.tokenIn != address(0)) {
            IERC20(p.tokenIn).approve(p.router, 0);
            IERC20(p.tokenIn).approve(p.router, p.amountIn);
        }

        uint256 value = p.tokenIn == address(0) ? p.amountIn : 0;
        (bool ok,) = p.router.call{value: value}(swapData);
        if (!ok) revert SwapFailed();

        if (p.tokenIn != address(0)) {
            IERC20(p.tokenIn).approve(p.router, 0);
        }

        uint256 balAfter = p.tokenOut == address(0)
            ? address(this).balance
            : IERC20(p.tokenOut).balanceOf(address(this));

        amountOut = balAfter - balBefore;
    }

    function _updateBalance(address vaultOwner, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut) internal {
        address usdcAddr = address(usdcToken);
        if (tokenIn == usdcAddr || (tokenIn == address(0) && usdcAddr == address(0))) {
            vaultBalance[vaultOwner] -= amountIn;
        }
        if (tokenOut == usdcAddr || (tokenOut == address(0) && usdcAddr == address(0))) {
            vaultBalance[vaultOwner] += amountOut;
        }
    }

    // ------------------------------------------------------------- admin

    function setKeeper(address newKeeper) external onlyOwner {
        if (newKeeper == address(0)) revert ZeroAddress();
        emit KeeperUpdated(keeper, newKeeper);
        keeper = newKeeper;
    }

    function setRiskGuard(address newGuard) external onlyOwner {
        emit RiskGuardUpdated(address(riskGuard), newGuard);
        riskGuard = ISiroRiskGuard(newGuard);
    }

    function setLeaderboard(address newBoard) external onlyOwner {
        emit LeaderboardUpdated(address(leaderboard), newBoard);
        leaderboard = ISiroLeaderboard(newBoard);
    }

    function setRouterWhitelist(address router, bool allowed) external onlyOwner {
        if (router == address(0)) revert ZeroAddress();
        whitelistedRouters[router] = allowed;
        emit RouterWhitelisted(router, allowed);
    }

    function setAllowedSelector(bytes4 selector, bool allowed) external onlyOwner {
        allowedSelectors[selector] = allowed;
        emit SelectorAllowed(selector, allowed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    function collectProtocolFees(address to) external onlyOwner nonReentrant {
        uint256 amount = protocolFees;
        if (amount == 0) revert NothingToClaim();
        protocolFees = 0;
        _pushFunds(to, amount);
        emit ProtocolFeesCollected(to, amount);
    }

    // ----------------------------------------------------------- leader fees

    function claimLeaderFees() external nonReentrant {
        uint256 amount = leaderFees[msg.sender];
        if (amount == 0) revert NothingToClaim();
        leaderFees[msg.sender] = 0;
        _pushFunds(msg.sender, amount);
        emit LeaderFeeClaimed(msg.sender, amount);
    }

    // ------------------------------------------------------------------ views

    function getVault(address user) external view returns (
        uint256 deposited,
        uint256 balance,
        uint256 highWaterMark,
        uint256 totalWithdrawn,
        uint256 totalFeePaid,
        address[] memory leaders,
        bool paused,
        uint256 createdAt
    ) {
        Vault storage v = _vaults[user];
        return (
            v.deposited,
            vaultBalance[user],
            v.highWaterMark,
            v.totalWithdrawn,
            v.totalFeePaid,
            v.leaders,
            v.paused,
            v.createdAt
        );
    }

    function getVaultLeaders(address user) external view returns (address[] memory) {
        return _vaults[user].leaders;
    }

    function getVaultCount() external view returns (uint256) {
        return vaultOwners.length;
    }

    function isVaultPaused(address user) external view returns (bool) {
        return _vaults[user].paused;
    }

    // -------------------------------------------------------------- internals

    function _validateLeaders(address[] calldata leaders) internal view {
        if (leaders.length == 0 || leaders.length > MAX_LEADERS) revert InvalidLeaderCount();
        for (uint256 i = 0; i < leaders.length; i++) {
            if (leaders[i] == msg.sender) revert LeaderIsSelf();
            if (leaders[i] == address(0)) revert ZeroAddress();
            for (uint256 j = i + 1; j < leaders.length; j++) {
                if (leaders[i] == leaders[j]) revert DuplicateLeader();
            }
        }
    }

    function _chargePerformanceFee(address user) internal returns (uint256 totalFee) {
        Vault storage v = _vaults[user];
        uint256 bal = vaultBalance[user];

        if (bal <= v.highWaterMark) return 0;

        uint256 profit = bal - v.highWaterMark;
        totalFee = (profit * PERF_FEE_BPS) / BPS;

        uint256 leaderShare = (profit * LEADER_SHARE_BPS) / BPS;
        uint256 protocolShare = totalFee - leaderShare;

        if (v.leaders.length > 0 && leaderShare > 0) {
            uint256 perLeader = leaderShare / v.leaders.length;
            uint256 distributed = 0;
            for (uint256 i = 0; i < v.leaders.length; i++) {
                leaderFees[v.leaders[i]] += perLeader;
                distributed += perLeader;
            }
            // Remainder goes to first leader, not protocol
            uint256 remainder = leaderShare - distributed;
            if (remainder > 0) {
                leaderFees[v.leaders[0]] += remainder;
            }
        } else {
            protocolShare += leaderShare;
        }

        protocolFees += protocolShare;
        vaultBalance[user] -= totalFee;
        v.totalFeePaid += totalFee;
        v.highWaterMark = vaultBalance[user];

        emit PerformanceFeeCharged(user, profit, leaderShare, protocolShare);
    }

    function _removeVaultOwner(address user) internal {
        uint256 idx = _vaultOwnerIndex[user];
        uint256 last = vaultOwners.length - 1;
        if (idx != last) {
            address moved = vaultOwners[last];
            vaultOwners[idx] = moved;
            _vaultOwnerIndex[moved] = idx;
        }
        vaultOwners.pop();
        delete _vaultOwnerIndex[user];
    }

    function _pullFunds(uint256 amount) internal {
        if (address(usdcToken) == address(0)) {
            if (msg.value != amount) revert InvalidAmount();
        } else {
            if (msg.value != 0) revert UnexpectedValue();
            if (!usdcToken.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        }
    }

    function _pushFunds(address to, uint256 amount) internal {
        if (address(usdcToken) != address(0)) {
            if (!usdcToken.transfer(to, amount)) revert TransferFailed();
        } else {
            (bool ok,) = to.call{value: amount, gas: 30_000}("");
            if (!ok) revert TransferFailed();
        }
    }

    // Only accept native value from routers during swaps (lock == 2 means inside nonReentrant)
    receive() external payable {
        if (_lock != 2) revert UnexpectedValue();
    }
}
