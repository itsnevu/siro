// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IUniswapV2Factory, IUniswapV2Pair} from "./interfaces/external/IUniswapV2.sol";
import {AgentToken} from "./AgentToken.sol";
import {FeeSplitter} from "./FeeSplitter.sol";

/// @title AgentTokenFactory
/// @notice Launchpad. An agent whose record shows at least 14 verified days can launch one token.
/// @dev What a launch does, in one transaction:
///        1. Checks the caller owns the agent, the agent is active, has >= MIN_VERIFIED_DAYS and no token yet.
///        2. Takes the creator's USDG seed. `launchFeeBps` of it goes to a new immutable FeeSplitter
///           (creator / compute fund / buyback and burn) and is distributed immediately.
///        3. Deploys a fixed-supply ERC-20 and pairs the ENTIRE supply with the remaining USDG on Uniswap V2.
///        4. Mints the LP tokens to the dead address. Liquidity can never be withdrawn.
///      The creator receives no token allocation; like everyone else they buy on the open market.
///      Liquidity is added by transferring to the pair and calling `mint` directly rather than through
///      the router, so a pair that someone created or pre-funded in advance cannot block the launch.
///      There is no owner and no configuration after deployment.
contract AgentTokenFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint32 public constant MIN_VERIFIED_DAYS = 14;
    uint256 public constant TOKEN_SUPPLY = 1_000_000_000e18;
    uint256 public constant MAX_LAUNCH_FEE_BPS = 1_000;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    IAgentRegistry public immutable registry;
    IERC20 public immutable usdg;
    IUniswapV2Factory public immutable dexFactory;
    address public immutable computeFund;
    address public immutable buybackBurn;
    uint16 public immutable creatorBps;
    uint16 public immutable computeFundBps;
    uint16 public immutable buybackBurnBps;
    uint16 public immutable launchFeeBps;
    uint256 public immutable minSeed;

    struct Launch {
        address token;
        address pair;
        address feeSplitter;
        uint64 launchedAt;
    }

    mapping(uint256 agentId => Launch) public launches;
    uint256[] public launchedAgentIds;

    error ZeroAddress();
    error InvalidFee();
    error NotAgentOwner();
    error AgentNotActive();
    error NotEnoughVerifiedDays(uint32 have, uint32 need);
    error AlreadyLaunched();
    error SeedTooSmall(uint256 seed, uint256 minSeed);

    event AgentTokenLaunched(
        uint256 indexed agentId,
        address indexed token,
        address indexed creator,
        address pair,
        address feeSplitter,
        uint256 usdgLiquidity,
        uint256 launchFee,
        uint256 lpLocked
    );

    constructor(
        IAgentRegistry registry_,
        IERC20 usdg_,
        IUniswapV2Factory dexFactory_,
        address computeFund_,
        address buybackBurn_,
        uint16[3] memory splitBps,
        uint16 launchFeeBps_,
        uint256 minSeed_
    ) {
        if (
            address(registry_) == address(0) || address(usdg_) == address(0) || address(dexFactory_) == address(0)
                || computeFund_ == address(0) || buybackBurn_ == address(0)
        ) revert ZeroAddress();
        if (launchFeeBps_ > MAX_LAUNCH_FEE_BPS || minSeed_ == 0) revert InvalidFee();
        if (uint256(splitBps[0]) + splitBps[1] + splitBps[2] != BPS) revert InvalidFee();
        registry = registry_;
        usdg = usdg_;
        dexFactory = dexFactory_;
        computeFund = computeFund_;
        buybackBurn = buybackBurn_;
        creatorBps = splitBps[0];
        computeFundBps = splitBps[1];
        buybackBurnBps = splitBps[2];
        launchFeeBps = launchFeeBps_;
        minSeed = minSeed_;
    }

    function launchCount() external view returns (uint256) {
        return launchedAgentIds.length;
    }

    /// @notice Launches the token for `agentId`. The caller must have approved `usdgSeed` USDG.
    /// @param usdgSeed Total USDG the creator puts in: launch fee plus pool liquidity.
    function launchAgentToken(uint256 agentId, string calldata name_, string calldata symbol_, uint256 usdgSeed)
        external
        nonReentrant
        returns (address token, address pair)
    {
        if (msg.sender != registry.ownerOf(agentId)) revert NotAgentOwner();
        if (!registry.isActive(agentId)) revert AgentNotActive();
        uint32 verified = registry.verifiedDays(agentId);
        if (verified < MIN_VERIFIED_DAYS) revert NotEnoughVerifiedDays(verified, MIN_VERIFIED_DAYS);
        if (launches[agentId].token != address(0)) revert AlreadyLaunched();
        if (usdgSeed < minSeed) revert SeedTooSmall(usdgSeed, minSeed);

        uint256 fee = (usdgSeed * launchFeeBps) / BPS;
        uint256 liquidityUsdg = usdgSeed - fee;

        token = address(new AgentToken(name_, symbol_, agentId, TOKEN_SUPPLY, address(this)));
        FeeSplitter splitter =
            new FeeSplitter(msg.sender, computeFund, buybackBurn, creatorBps, computeFundBps, buybackBurnBps);

        pair = dexFactory.getPair(token, address(usdg));
        if (pair == address(0)) pair = dexFactory.createPair(token, address(usdg));

        launches[agentId] =
            Launch({token: token, pair: pair, feeSplitter: address(splitter), launchedAt: uint64(block.timestamp)});
        launchedAgentIds.push(agentId);

        usdg.safeTransferFrom(msg.sender, address(this), usdgSeed);
        if (fee != 0) {
            usdg.safeTransfer(address(splitter), fee);
            splitter.distribute(usdg);
        }
        IERC20(token).safeTransfer(pair, TOKEN_SUPPLY);
        usdg.safeTransfer(pair, liquidityUsdg);
        uint256 lpLocked = IUniswapV2Pair(pair).mint(DEAD);

        emit AgentTokenLaunched(agentId, token, msg.sender, pair, address(splitter), liquidityUsdg, fee, lpLocked);
    }
}
