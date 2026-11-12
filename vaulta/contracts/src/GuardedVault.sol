// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {IGuardedRouter} from "./interfaces/IGuardedRouter.sol";
import {IRouterRegistry} from "./interfaces/IRouterRegistry.sol";

/// @title GuardedVault
/// @notice ERC-4626 vault for one trading agent. Depositors hold shares; the agent's executor key can
///         do exactly one thing, `executeTrade`, and every call is checked against limits that live
///         in this contract. The executor can never withdraw, transfer or approve funds.
///
/// @dev WHAT IS ENFORCED ON EVERY TRADE
///        - caller is the agent's executor (read live from AgentRegistry) and the agent is Active
///        - vault is not paused
///        - router is approved by the protocol RouterRegistry AND whitelisted here
///        - both tokens are whitelisted here
///        - notional (oracle value of the input) <= maxTradeSize
///        - notional traded in any rolling 24 hours <= dailyNotionalCap
///        - `minOut` is worth at least notional * (1 - maxSlippageBps) at the oracle price, and the
///          vault's own balance must actually grow by `minOut` (the router's word is not trusted)
///        - the bought position stays <= maxConcentrationBps of NAV
///        - if share price is below drawdownMark * (1 - maxDrawdownBps), the vault pauses itself
///
///      OWNER POWERS (owner = AgentRegistry.ownerOf(agentId), read live)
///        Instant:   kill(), tighten limits, remove a token or router, lower or raise the deposit cap,
///                   unwind positions to USDG while paused, book donated balances.
///        Timelocked: unpause, loosen limits, add a token, add a router.
///        Never:     withdraw depositor funds, change the fee, the oracle or the fee recipient.
///
///      ACCOUNTING
///        NAV counts only balances this contract has booked itself (deposits, withdrawals, trades).
///        Tokens sent to the vault directly are ignored until the owner calls `sync`. That removes
///        donation-based share-price manipulation and stops a 1-wei transfer of a stock token from
///        blocking NAV while that token's price feed is closed for the weekend.
///
///      EXITS
///        `withdraw` / `redeem` pay USDG up to the vault's idle USDG and need a live price for any
///        open position. `redeemInKind` pays a pro-rata slice of every holding, needs no price and
///        works while paused, killed, or with the oracle down. It is the exit that cannot be blocked.
///
///      PERFORMANCE FEE
///        Charged only on share price above the high-water mark, minted as shares to the fee recipient
///        (a FeeSplitter). The high-water mark never decreases, including across pause and unpause.
contract GuardedVault is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────── constants ───────────────────────────────

    uint256 public constant BPS = 10_000;
    /// @notice Ceilings no owner can exceed, whatever limits they choose.
    uint16 public constant MAX_SLIPPAGE_BPS = 500;
    uint16 public constant MAX_DRAWDOWN_BPS = 5_000;
    uint16 public constant MAX_PERFORMANCE_FEE_BPS = 3_000;
    uint256 public constant MAX_TRACKED_TOKENS = 16;

    uint256 private constant PRICE_SCALE = 1e18;
    /// @dev 25 hourly buckets cover the current hour plus the 24 before it, so any trade made in the
    ///      last 24 hours is always still counted. The window is never shorter than 24h.
    uint256 private constant WINDOW_HOURS = 25;

    // ─────────────────────────────── types ───────────────────────────────

    struct Limits {
        /// @dev Largest single trade, in asset units, valued at the oracle price.
        uint256 maxTradeSize;
        /// @dev Largest total notional in any rolling 24 hours, in asset units.
        uint256 dailyNotionalCap;
        /// @dev Share-price fall from the drawdown mark that pauses the vault.
        uint16 maxDrawdownBps;
        /// @dev Largest share of NAV a single non-asset position may reach through a trade.
        uint16 maxConcentrationBps;
        /// @dev Largest loss against the oracle price accepted on a single trade.
        uint16 maxSlippageBps;
    }

    struct InitParams {
        IERC20 asset;
        string name;
        string symbol;
        IAgentRegistry registry;
        uint256 agentId;
        IPriceOracle oracle;
        IRouterRegistry routerRegistry;
        address feeRecipient;
        uint16 performanceFeeBps;
        uint64 timelock;
        uint256 depositCap;
        Limits limits;
        address[] tokens;
        address[] routers;
    }

    /// @notice A depositor's own stop: exit if share price falls this far below their reference price.
    struct DepositorGuard {
        uint128 referencePrice;
        uint16 maxDrawdownBps;
        bool inKindFallback;
    }

    // ─────────────────────────────── storage ───────────────────────────────

    IAgentRegistry public immutable registry;
    uint256 public immutable agentId;
    IPriceOracle public immutable oracle;
    IRouterRegistry public immutable routerRegistry;
    address public immutable feeRecipient;
    uint16 public immutable performanceFeeBps;
    /// @notice Delay applied to unpausing, loosening limits and adding tokens or routers.
    uint64 public immutable timelock;

    Limits public limits;
    Limits public pendingLimits;
    uint64 public pendingLimitsAt;

    /// @notice Deposits stop once NAV reaches this many asset units.
    uint256 public depositCap;

    bool public paused;
    uint64 public unpauseAt;

    /// @notice Share price (1e18-scaled) above which the performance fee applies. Never decreases.
    uint256 public highWaterMark;
    /// @notice Share-price peak since the last unpause. Drawdown is measured from here.
    uint256 public drawdownMark;

    /// @notice Booked USDG. Withdrawals are limited to this.
    uint256 public idleAssets;
    /// @notice Booked balance of each non-asset token.
    mapping(address token => uint256) public positionOf;

    mapping(address token => bool) public allowedTokens;
    mapping(address router => bool) public allowedRouters;
    mapping(address token => uint64) public tokenScheduledAt;
    mapping(address router => uint64) public routerScheduledAt;

    address[] public trackedTokens;
    mapping(address token => bool) public isTracked;

    mapping(address depositor => DepositorGuard) public depositorGuards;

    uint256[WINDOW_HOURS] private _notionalByHour;
    uint64 private _lastTradeHour;

    // ─────────────────────────────── errors ───────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error ZeroShares();
    error InvalidConfig();
    error InvalidLimits();
    error NotOwner();
    error NotExecutor();
    error AgentNotActive();
    error VaultPaused();
    error NotPaused();
    error TokenNotAllowed(address token);
    error TokenNotSupportedByOracle(address token);
    error TokenStillHeld(address token);
    error RouterNotAllowed(address router);
    error RouterNotApprovedByProtocol(address router);
    error InsufficientBookedBalance(address token, uint256 booked, uint256 needed);
    error TradeTooLarge(uint256 notional, uint256 maxTradeSize);
    error DailyCapExceeded(uint256 wouldUse, uint256 dailyNotionalCap);
    error SlippageTooHigh();
    error Overspent(uint256 spent, uint256 amountIn);
    error ConcentrationExceeded(uint256 positionValue, uint256 maxValue);
    error DrawdownNotBreached();
    error NothingScheduled();
    error TimelockActive(uint64 readyAt);
    error TooManyTokens();
    error NothingToSync();
    error GuardNotSet();
    error GuardNotTriggered();
    error InvalidGuard();
    error NothingToRedeem();

    // ─────────────────────────────── events ───────────────────────────────

    event TradeExecuted(
        address indexed router,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 notional
    );
    event Unwound(address indexed router, address indexed token, uint256 amountIn, uint256 assetsOut);
    event Killed(address indexed by);
    event AutoPaused(uint256 sharePrice, uint256 drawdownMark);
    event UnpauseScheduled(uint64 readyAt);
    event Unpaused(uint256 newDrawdownMark);
    event LimitsSet(Limits limits);
    event LimitsScheduled(Limits limits, uint64 readyAt);
    event DepositCapSet(uint256 depositCap);
    event TokenScheduled(address indexed token, uint64 readyAt);
    event TokenAllowed(address indexed token);
    event TokenRemoved(address indexed token);
    event TokenUntracked(address indexed token);
    event RouterScheduled(address indexed router, uint64 readyAt);
    event RouterAllowed(address indexed router);
    event RouterRemoved(address indexed router);
    event PerformanceFeeTaken(uint256 feeShares, uint256 newHighWaterMark);
    event MarksInitialised(uint256 sharePrice);
    event Synced(address indexed token, uint256 amount);
    event RedeemedInKind(address indexed owner, address indexed receiver, uint256 shares, uint256[] amounts);
    event DepositorGuardSet(address indexed depositor, uint16 maxDrawdownBps, uint256 referencePrice, bool inKindFallback);
    event DepositorGuardCleared(address indexed depositor);
    event GuardedExit(address indexed depositor, address indexed triggeredBy, uint256 assetsOut, uint256 sharesInKind);

    // ─────────────────────────────── construction ───────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != registry.ownerOf(agentId)) revert NotOwner();
        _;
    }

    /// @dev The initial token and router whitelists are chosen before any deposit exists, so they do
    ///      not go through the timelock. Every later addition does.
    constructor(InitParams memory p) ERC20(p.name, p.symbol) ERC4626(p.asset) {
        if (
            address(p.registry) == address(0) || address(p.oracle) == address(0)
                || address(p.routerRegistry) == address(0) || p.feeRecipient == address(0)
        ) revert ZeroAddress();
        if (p.performanceFeeBps > MAX_PERFORMANCE_FEE_BPS || !p.registry.exists(p.agentId)) revert InvalidConfig();
        _validateLimits(p.limits);

        registry = p.registry;
        agentId = p.agentId;
        oracle = p.oracle;
        routerRegistry = p.routerRegistry;
        feeRecipient = p.feeRecipient;
        performanceFeeBps = p.performanceFeeBps;
        timelock = p.timelock;

        limits = p.limits;
        depositCap = p.depositCap;
        emit LimitsSet(p.limits);
        emit DepositCapSet(p.depositCap);

        allowedTokens[address(p.asset)] = true;
        emit TokenAllowed(address(p.asset));
        for (uint256 i; i < p.tokens.length; ++i) {
            _allowToken(p.tokens[i]);
        }
        for (uint256 i; i < p.routers.length; ++i) {
            _allowRouter(p.routers[i]);
        }
    }

    // ─────────────────────────────── ERC-4626 ───────────────────────────────

    /// @dev Virtual-share offset: makes the classic first-depositor inflation attack unprofitable.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    /// @notice Booked USDG plus the oracle value of every booked position.
    /// @dev Reverts if any open position cannot be priced. A vault holding only USDG never calls the oracle.
    function totalAssets() public view override returns (uint256 total) {
        total = idleAssets;
        uint256 n = trackedTokens.length;
        for (uint256 i; i < n; ++i) {
            address token = trackedTokens[i];
            uint256 amount = positionOf[token];
            if (amount != 0) total += oracle.valueOf(token, amount);
        }
    }

    /// @notice Zero while paused, while the agent is not active, or while NAV cannot be priced.
    function maxDeposit(address) public view override returns (uint256) {
        if (paused || !registry.isActive(agentId)) return 0;
        (bool ok, uint256 nav) = _tryTotalAssets();
        if (!ok) return 0;
        uint256 cap = depositCap;
        return nav >= cap ? 0 : cap - nav;
    }

    function maxMint(address receiver) public view override returns (uint256) {
        uint256 assets = maxDeposit(receiver);
        return assets == 0 ? 0 : convertToShares(assets);
    }

    /// @notice USDG `owner_` can withdraw right now: their entitlement, capped by idle USDG.
    ///         Zero when NAV cannot be priced; use `redeemInKind` then.
    function maxWithdraw(address owner_) public view override returns (uint256) {
        (bool ok,) = _tryTotalAssets();
        if (!ok) return 0;
        uint256 entitled = convertToAssets(balanceOf(owner_));
        uint256 idle = idleAssets;
        return entitled < idle ? entitled : idle;
    }

    function maxRedeem(address owner_) public view override returns (uint256) {
        (bool ok,) = _tryTotalAssets();
        if (!ok) return 0;
        uint256 byIdle = convertToShares(idleAssets);
        uint256 balance = balanceOf(owner_);
        return balance < byIdle ? balance : byIdle;
    }

    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        _takePerformanceFee();
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver) public override nonReentrant returns (uint256) {
        _takePerformanceFee();
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner_) public override nonReentrant returns (uint256) {
        _takePerformanceFee();
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(uint256 shares, address receiver, address owner_) public override nonReentrant returns (uint256) {
        _takePerformanceFee();
        return super.redeem(shares, receiver, owner_);
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        if (shares == 0) revert ZeroShares();
        bool first = totalSupply() == 0;
        idleAssets += assets;
        super._deposit(caller, receiver, assets, shares);
        if (first) {
            uint256 price = sharePrice();
            highWaterMark = price;
            drawdownMark = price;
            emit MarksInitialised(price);
        }
    }

    function _withdraw(address caller, address receiver, address owner_, uint256 assets, uint256 shares)
        internal
        override
    {
        idleAssets -= assets;
        super._withdraw(caller, receiver, owner_, assets, shares);
    }

    // ─────────────────────────────── trading ───────────────────────────────

    /// @notice Swaps `amountIn` of `tokenIn` for `tokenOut` through a whitelisted router. Executor only.
    /// @dev If the vault is already past its drawdown limit, this pauses the vault and returns 0
    ///      without trading (the pause must persist, so it does not revert).
    /// @param minOut Minimum `tokenOut` the vault must receive. Must be within `maxSlippageBps` of the
    ///        oracle value of the input.
    /// @param data Routing hints passed through to the router adapter.
    function executeTrade(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        bytes calldata data
    ) external nonReentrant returns (uint256 amountOut) {
        if (msg.sender != registry.executorOf(agentId)) revert NotExecutor();
        if (!registry.isActive(agentId)) revert AgentNotActive();
        if (paused) revert VaultPaused();
        _requireRouter(router);
        if (!allowedTokens[tokenIn]) revert TokenNotAllowed(tokenIn);
        if (!allowedTokens[tokenOut] || tokenIn == tokenOut) revert TokenNotAllowed(tokenOut);
        if (amountIn == 0) revert ZeroAmount();

        uint256 price = _takePerformanceFee();
        if (_isBreached(price)) {
            _autoPause(price);
            return 0;
        }

        Limits memory l = limits;
        uint256 notional = _value(tokenIn, amountIn);
        if (notional == 0) revert ZeroAmount();
        if (notional > l.maxTradeSize) revert TradeTooLarge(notional, l.maxTradeSize);
        _consumeDailyCap(notional, l.dailyNotionalCap);
        if (_value(tokenOut, minOut) < (notional * (BPS - l.maxSlippageBps)) / BPS) revert SlippageTooHigh();

        amountOut = _swap(router, tokenIn, tokenOut, amountIn, minOut, data);
        emit TradeExecuted(router, tokenIn, tokenOut, amountIn, amountOut, notional);

        uint256 nav = totalAssets();
        if (tokenOut != asset()) {
            uint256 positionValue = _value(tokenOut, positionOf[tokenOut]);
            uint256 maxValue = (nav * l.maxConcentrationBps) / BPS;
            if (positionValue > maxValue) revert ConcentrationExceeded(positionValue, maxValue);
        }

        uint256 priceAfter = (nav * PRICE_SCALE) / totalSupply();
        if (_isBreached(priceAfter)) _autoPause(priceAfter);
    }

    /// @notice Pauses the vault if its share price is past the drawdown limit. Anyone may call.
    function checkDrawdown() external nonReentrant {
        if (paused) revert VaultPaused();
        uint256 price = _takePerformanceFee();
        if (!_isBreached(price)) revert DrawdownNotBreached();
        _autoPause(price);
    }

    /// @notice While paused, the owner can sell a position back to USDG so depositors can withdraw.
    /// @dev Only sells into the asset, only through an approved router, and only at a price within
    ///      `maxSlippageBps` of the oracle. If the oracle has no price, this reverts: depositors still
    ///      have `redeemInKind`, and the owner can retry when the market reopens.
    function unwind(address router, address token, uint256 amountIn, uint256 minAssetsOut, bytes calldata data)
        external
        onlyOwner
        nonReentrant
        returns (uint256 assetsOut)
    {
        if (!paused) revert NotPaused();
        _requireRouter(router);
        address base = asset();
        if (token == base || !isTracked[token]) revert TokenNotAllowed(token);
        if (amountIn == 0) revert ZeroAmount();
        if (minAssetsOut < (_value(token, amountIn) * (BPS - limits.maxSlippageBps)) / BPS) revert SlippageTooHigh();

        assetsOut = _swap(router, token, base, amountIn, minAssetsOut, data);
        emit Unwound(router, token, amountIn, assetsOut);
    }

    // ─────────────────────────────── kill switch ───────────────────────────────

    /// @notice Stops trading and new deposits immediately. Withdrawals and in-kind redemption stay open.
    function kill() external onlyOwner {
        paused = true;
        unpauseAt = 0;
        emit Killed(msg.sender);
    }

    /// @notice Starts the unpause timelock.
    function scheduleUnpause() external onlyOwner {
        if (!paused) revert NotPaused();
        uint64 readyAt = uint64(block.timestamp) + timelock;
        unpauseAt = readyAt;
        emit UnpauseScheduled(readyAt);
    }

    /// @notice Resumes trading once the timelock has passed. Drawdown is measured from the current
    ///         share price from here on. The performance-fee high-water mark is NOT reset.
    function executeUnpause() external onlyOwner {
        if (!paused) revert NotPaused();
        uint64 readyAt = unpauseAt;
        if (readyAt == 0) revert NothingScheduled();
        if (block.timestamp < readyAt) revert TimelockActive(readyAt);
        paused = false;
        unpauseAt = 0;
        uint256 price = sharePrice();
        drawdownMark = price;
        emit Unpaused(price);
    }

    // ─────────────────────────────── limits ───────────────────────────────

    /// @notice Changes the limits. If every field is at or below its current value the change applies
    ///         immediately; otherwise it is scheduled behind the timelock and replaces any pending change.
    function setLimits(Limits calldata next) external onlyOwner {
        _validateLimits(next);
        Limits memory current = limits;
        bool tightening = next.maxTradeSize <= current.maxTradeSize && next.dailyNotionalCap <= current.dailyNotionalCap
            && next.maxDrawdownBps <= current.maxDrawdownBps && next.maxConcentrationBps <= current.maxConcentrationBps
            && next.maxSlippageBps <= current.maxSlippageBps;
        if (tightening) {
            limits = next;
            delete pendingLimits;
            pendingLimitsAt = 0;
            emit LimitsSet(next);
        } else {
            uint64 readyAt = uint64(block.timestamp) + timelock;
            pendingLimits = next;
            pendingLimitsAt = readyAt;
            emit LimitsScheduled(next, readyAt);
        }
    }

    /// @notice Applies a scheduled loosening once its timelock has passed. Anyone may call.
    function executeLimits() external {
        uint64 readyAt = pendingLimitsAt;
        if (readyAt == 0) revert NothingScheduled();
        if (block.timestamp < readyAt) revert TimelockActive(readyAt);
        Limits memory next = pendingLimits;
        limits = next;
        delete pendingLimits;
        pendingLimitsAt = 0;
        emit LimitsSet(next);
    }

    /// @notice Sets the NAV level at which deposits stop. Does not affect existing deposits.
    function setDepositCap(uint256 depositCap_) external onlyOwner {
        depositCap = depositCap_;
        emit DepositCapSet(depositCap_);
    }

    // ─────────────────────────────── whitelists ───────────────────────────────

    function scheduleToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (!oracle.isSupported(token)) revert TokenNotSupportedByOracle(token);
        uint64 readyAt = uint64(block.timestamp) + timelock;
        tokenScheduledAt[token] = readyAt;
        emit TokenScheduled(token, readyAt);
    }

    function executeToken(address token) external {
        uint64 readyAt = tokenScheduledAt[token];
        if (readyAt == 0) revert NothingScheduled();
        if (block.timestamp < readyAt) revert TimelockActive(readyAt);
        delete tokenScheduledAt[token];
        _allowToken(token);
    }

    /// @notice Stops trading in `token` immediately. An open position stays booked and valued, and can
    ///         still be sold with `unwind`.
    function removeToken(address token) external onlyOwner {
        if (token == asset()) revert TokenNotAllowed(token);
        allowedTokens[token] = false;
        delete tokenScheduledAt[token];
        emit TokenRemoved(token);
    }

    /// @notice Frees a tracking slot for a removed token with no booked position.
    function untrackToken(address token) external onlyOwner {
        if (!isTracked[token] || allowedTokens[token]) revert TokenNotAllowed(token);
        if (positionOf[token] != 0) revert TokenStillHeld(token);
        uint256 n = trackedTokens.length;
        for (uint256 i; i < n; ++i) {
            if (trackedTokens[i] == token) {
                trackedTokens[i] = trackedTokens[n - 1];
                trackedTokens.pop();
                break;
            }
        }
        isTracked[token] = false;
        emit TokenUntracked(token);
    }

    function scheduleRouter(address router) external onlyOwner {
        if (!routerRegistry.isApproved(router)) revert RouterNotApprovedByProtocol(router);
        uint64 readyAt = uint64(block.timestamp) + timelock;
        routerScheduledAt[router] = readyAt;
        emit RouterScheduled(router, readyAt);
    }

    function executeRouter(address router) external {
        uint64 readyAt = routerScheduledAt[router];
        if (readyAt == 0) revert NothingScheduled();
        if (block.timestamp < readyAt) revert TimelockActive(readyAt);
        delete routerScheduledAt[router];
        _allowRouter(router);
    }

    function removeRouter(address router) external onlyOwner {
        allowedRouters[router] = false;
        delete routerScheduledAt[router];
        emit RouterRemoved(router);
    }

    /// @notice Books tokens that were sent to the vault directly, adding them to NAV for all holders.
    /// @dev Owner only: if anyone could book dust, a stale price feed could be used to block NAV.
    function sync(address token) external onlyOwner nonReentrant returns (uint256 amount) {
        address base = asset();
        if (token != base && !(isTracked[token] && allowedTokens[token])) revert TokenNotAllowed(token);
        uint256 booked = token == base ? idleAssets : positionOf[token];
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance <= booked) revert NothingToSync();
        amount = balance - booked;
        _credit(token, amount);
        emit Synced(token, amount);
    }

    // ─────────────────────────────── fees ───────────────────────────────

    /// @notice Takes any performance fee due and raises the marks. Anyone may call.
    function harvest() external nonReentrant returns (uint256 price) {
        price = _takePerformanceFee();
    }

    // ─────────────────────────────── exits that cannot be blocked ───────────────────────────────

    /// @notice Burns `shares` and sends the caller's pro-rata slice of every booked holding to `receiver`.
    /// @dev Needs no oracle and works in every state. The fee harvest is best effort: if the oracle is
    ///      down it is skipped rather than allowed to block the exit.
    /// @param skip Tokens to leave behind, forfeiting the caller's slice of them to the remaining
    ///        holders. Use it only if a token cannot be transferred (for example it is frozen by its issuer).
    /// @return amounts Amount paid per token: index 0 is the asset, then `trackedTokens` in order.
    function redeemInKind(uint256 shares, address receiver, address[] calldata skip)
        external
        returns (uint256[] memory amounts)
    {
        if (receiver == address(0)) revert ZeroAddress();
        try this.harvest() {} catch {}
        amounts = _redeemInKindGuarded(msg.sender, shares, receiver, skip);
    }

    // ─────────────────────────────── depositor guard ───────────────────────────────

    /// @notice Sets your own stop. If share price falls more than `maxDrawdownBps` below today's share
    ///         price, anyone can trigger your exit; the proceeds can only go to you.
    /// @param maxDrawdownBps Your limit. Pass 0 to remove the guard.
    /// @param inKindFallback If true, whatever cannot be paid in USDG (not enough idle USDG) is paid
    ///        in kind, so the exit is always complete. If false, the remainder stays in the vault.
    function setDepositorGuard(uint16 maxDrawdownBps, bool inKindFallback) external {
        if (maxDrawdownBps == 0) {
            delete depositorGuards[msg.sender];
            emit DepositorGuardCleared(msg.sender);
            return;
        }
        if (maxDrawdownBps >= BPS) revert InvalidGuard();
        uint256 price = sharePrice();
        if (price == 0 || price > type(uint128).max) revert InvalidGuard();
        depositorGuards[msg.sender] = DepositorGuard(uint128(price), maxDrawdownBps, inKindFallback);
        emit DepositorGuardSet(msg.sender, maxDrawdownBps, price, inKindFallback);
    }

    /// @notice Executes `depositor`'s exit once their guard has been hit. Anyone may call.
    function guardedExit(address depositor) external nonReentrant returns (uint256 assetsOut, uint256 sharesInKind) {
        DepositorGuard memory guard = depositorGuards[depositor];
        if (guard.maxDrawdownBps == 0) revert GuardNotSet();
        if (balanceOf(depositor) == 0) revert NothingToRedeem();
        uint256 price = _takePerformanceFee();
        if (price * BPS >= uint256(guard.referencePrice) * (BPS - guard.maxDrawdownBps)) revert GuardNotTriggered();
        delete depositorGuards[depositor];

        uint256 shares = maxRedeem(depositor);
        if (shares != 0) {
            assetsOut = previewRedeem(shares);
            _withdraw(depositor, depositor, depositor, assetsOut, shares);
        }
        uint256 remaining = balanceOf(depositor);
        if (remaining != 0 && guard.inKindFallback) {
            sharesInKind = remaining;
            _redeemInKind(depositor, remaining, depositor, new address[](0));
        }
        emit GuardedExit(depositor, msg.sender, assetsOut, sharesInKind);
    }

    // ─────────────────────────────── views ───────────────────────────────

    /// @notice The agent's owner, read live from the registry.
    function owner() external view returns (address) {
        return registry.ownerOf(agentId);
    }

    /// @notice The only address allowed to call `executeTrade`, read live from the registry.
    function executor() external view returns (address) {
        return registry.executorOf(agentId);
    }

    /// @notice Assets per share, 1e18-scaled. Zero while the vault is empty.
    function sharePrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? 0 : (totalAssets() * PRICE_SCALE) / supply;
    }

    function trackedTokensLength() external view returns (uint256) {
        return trackedTokens.length;
    }

    /// @notice Notional that counts against the rolling 24h cap right now.
    function dailyNotionalUsed() public view returns (uint256 used) {
        uint64 hour = uint64(block.timestamp / 1 hours);
        uint64 last = _lastTradeHour;
        if (last == 0 || hour - last >= WINDOW_HOURS) return 0;
        for (uint256 i; i < WINDOW_HOURS; ++i) {
            // The hour each slot currently holds, counting back from the last trade.
            uint64 slotHour = last - uint64((last + WINDOW_HOURS - i) % WINDOW_HOURS);
            if (hour - slotHour < WINDOW_HOURS) used += _notionalByHour[i];
        }
    }

    /// @notice The most a compromised executor could lose to bad execution in 24 hours:
    ///         the daily cap times the slippage limit. Market moves on open positions are separate
    ///         and are bounded by the drawdown limit.
    function worstCaseDailyExecutionLoss() external view returns (uint256) {
        return (limits.dailyNotionalCap * limits.maxSlippageBps) / BPS;
    }

    // ─────────────────────────────── internals ───────────────────────────────

    function _tryTotalAssets() private view returns (bool ok, uint256 nav) {
        try this.totalAssets() returns (uint256 value) {
            return (true, value);
        } catch {
            return (false, 0);
        }
    }

    function _value(address token, uint256 amount) private view returns (uint256) {
        return token == asset() ? amount : oracle.valueOf(token, amount);
    }

    function _requireRouter(address router) private view {
        if (!allowedRouters[router]) revert RouterNotAllowed(router);
        if (!routerRegistry.isApproved(router)) revert RouterNotApprovedByProtocol(router);
    }

    function _isBreached(uint256 price) private view returns (bool) {
        uint256 mark = drawdownMark;
        if (mark == 0 || totalSupply() == 0) return false;
        return price * BPS < mark * (BPS - limits.maxDrawdownBps);
    }

    function _autoPause(uint256 price) private {
        paused = true;
        emit AutoPaused(price, drawdownMark);
    }

    /// @dev Mints fee shares for any gain above the high-water mark, then raises both marks.
    ///      Returns the share price after the fee (0 if the vault is empty).
    function _takePerformanceFee() private returns (uint256 price) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        uint256 nav = totalAssets();
        price = (nav * PRICE_SCALE) / supply;

        uint256 mark = highWaterMark;
        if (price > mark) {
            uint256 feeShares;
            if (performanceFeeBps != 0 && mark != 0) {
                uint256 profit = ((price - mark) * supply) / PRICE_SCALE;
                uint256 feeAssets = (profit * performanceFeeBps) / BPS;
                // Shares that are worth `feeAssets` after they dilute everyone, the recipient included.
                feeShares = (feeAssets * supply) / (nav - feeAssets);
                if (feeShares != 0) {
                    _mint(feeRecipient, feeShares);
                    price = (nav * PRICE_SCALE) / (supply + feeShares);
                }
            }
            highWaterMark = price;
            emit PerformanceFeeTaken(feeShares, price);
        }
        if (price > drawdownMark) drawdownMark = price;
    }

    /// @dev Adds `notional` to the current hour and reverts if the last 24 hours would exceed `cap`.
    function _consumeDailyCap(uint256 notional, uint256 cap) private {
        uint64 hour = uint64(block.timestamp / 1 hours);
        uint64 last = _lastTradeHour;
        if (last != 0 && hour != last) {
            uint64 gap = hour - last;
            if (gap >= WINDOW_HOURS) {
                for (uint256 i; i < WINDOW_HOURS; ++i) {
                    _notionalByHour[i] = 0;
                }
            } else {
                for (uint64 k = 1; k <= gap; ++k) {
                    _notionalByHour[(last + k) % WINDOW_HOURS] = 0;
                }
            }
        }
        _lastTradeHour = hour;

        uint256 used = notional;
        for (uint256 i; i < WINDOW_HOURS; ++i) {
            used += _notionalByHour[i];
        }
        if (used > cap) revert DailyCapExceeded(used, cap);
        _notionalByHour[hour % WINDOW_HOURS] += notional;
    }

    /// @dev The only place the vault hands tokens to a router. Approves exactly `amountIn`, then
    ///      trusts nothing but its own balances.
    function _swap(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        bytes calldata data
    ) private returns (uint256 received) {
        uint256 booked = tokenIn == asset() ? idleAssets : positionOf[tokenIn];
        if (amountIn > booked) revert InsufficientBookedBalance(tokenIn, booked, amountIn);

        uint256 inBefore = IERC20(tokenIn).balanceOf(address(this));
        uint256 outBefore = IERC20(tokenOut).balanceOf(address(this));

        IERC20(tokenIn).forceApprove(router, amountIn);
        IGuardedRouter(router).swap(tokenIn, tokenOut, amountIn, minOut, address(this), data);
        IERC20(tokenIn).forceApprove(router, 0);

        uint256 inAfter = IERC20(tokenIn).balanceOf(address(this));
        uint256 spent = inAfter >= inBefore ? 0 : inBefore - inAfter;
        if (spent > amountIn) revert Overspent(spent, amountIn);
        received = IERC20(tokenOut).balanceOf(address(this)) - outBefore;
        if (received < minOut) revert SlippageTooHigh();

        _debit(tokenIn, spent);
        _credit(tokenOut, received);
    }

    function _credit(address token, uint256 amount) private {
        if (token == asset()) idleAssets += amount;
        else positionOf[token] += amount;
    }

    function _debit(address token, uint256 amount) private {
        if (token == asset()) idleAssets -= amount;
        else positionOf[token] -= amount;
    }

    function _redeemInKindGuarded(address owner_, uint256 shares, address receiver, address[] calldata skip)
        private
        nonReentrant
        returns (uint256[] memory)
    {
        return _redeemInKind(owner_, shares, receiver, skip);
    }

    function _redeemInKind(address owner_, uint256 shares, address receiver, address[] memory skip)
        private
        returns (uint256[] memory amounts)
    {
        if (shares == 0) revert ZeroAmount();
        // Same virtual shares as the ERC-4626 conversions, so in-kind and USDG exits agree.
        uint256 supply = totalSupply() + 10 ** _decimalsOffset();
        _burn(owner_, shares);

        address base = asset();
        uint256 n = trackedTokens.length;
        amounts = new uint256[](n + 1);
        for (uint256 i; i <= n; ++i) {
            address token = i == 0 ? base : trackedTokens[i - 1];
            if (_contains(skip, token)) continue;
            uint256 booked = i == 0 ? idleAssets : positionOf[token];
            uint256 amount = (booked * shares) / supply;
            if (amount == 0) continue;
            amounts[i] = amount;
            _debit(token, amount);
            IERC20(token).safeTransfer(receiver, amount);
        }
        emit RedeemedInKind(owner_, receiver, shares, amounts);
    }

    function _contains(address[] memory list, address item) private pure returns (bool) {
        for (uint256 i; i < list.length; ++i) {
            if (list[i] == item) return true;
        }
        return false;
    }

    function _allowToken(address token) private {
        if (token == address(0)) revert ZeroAddress();
        if (token == asset()) return;
        if (!oracle.isSupported(token)) revert TokenNotSupportedByOracle(token);
        if (!isTracked[token]) {
            if (trackedTokens.length >= MAX_TRACKED_TOKENS) revert TooManyTokens();
            isTracked[token] = true;
            trackedTokens.push(token);
        }
        allowedTokens[token] = true;
        emit TokenAllowed(token);
    }

    function _allowRouter(address router) private {
        if (!routerRegistry.isApproved(router)) revert RouterNotApprovedByProtocol(router);
        allowedRouters[router] = true;
        emit RouterAllowed(router);
    }

    function _validateLimits(Limits memory l) private pure {
        if (
            l.maxTradeSize == 0 || l.dailyNotionalCap < l.maxTradeSize || l.maxDrawdownBps == 0
                || l.maxDrawdownBps > MAX_DRAWDOWN_BPS || l.maxConcentrationBps == 0 || l.maxConcentrationBps > BPS
                || l.maxSlippageBps == 0 || l.maxSlippageBps > MAX_SLIPPAGE_BPS
        ) revert InvalidLimits();
    }
}
