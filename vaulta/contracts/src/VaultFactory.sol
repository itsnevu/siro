// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {IRouterRegistry} from "./interfaces/IRouterRegistry.sol";
import {GuardedVault} from "./GuardedVault.sol";
import {FeeSplitter} from "./FeeSplitter.sol";

/// @title VaultDeployer
/// @notice Holds the GuardedVault creation code so the factory stays under the contract size limit.
/// @dev Only the factory that created it can deploy through it.
contract VaultDeployer {
    address public immutable factory;

    error NotFactory();

    constructor() {
        factory = msg.sender;
    }

    function deploy(GuardedVault.InitParams calldata params) external returns (address) {
        if (msg.sender != factory) revert NotFactory();
        return address(new GuardedVault(params));
    }
}

/// @title VaultFactory
/// @notice Creates the GuardedVault and FeeSplitter for an agent and links the vault in the registry.
/// @dev Everything a depositor needs to trust is fixed here at deployment and identical for every
///      vault: the asset, the oracle, the router registry, the performance fee, the fee split and the
///      timelock. The factory has no owner and nothing can be changed afterwards.
///      A vault that was not created by this factory is never linked in the registry; integrations
///      should resolve vaults through `AgentRegistry.vaultOf` only.
contract VaultFactory {
    uint256 public constant BPS = 10_000;

    struct Config {
        IAgentRegistry registry;
        IERC20 asset;
        IPriceOracle oracle;
        IRouterRegistry routerRegistry;
        address computeFund;
        address buybackBurn;
        uint16 performanceFeeBps;
        uint16 creatorBps;
        uint16 computeFundBps;
        uint16 buybackBurnBps;
        uint64 timelock;
    }

    IAgentRegistry public immutable registry;
    IERC20 public immutable asset;
    IPriceOracle public immutable oracle;
    IRouterRegistry public immutable routerRegistry;
    address public immutable computeFund;
    address public immutable buybackBurn;
    uint16 public immutable performanceFeeBps;
    uint16 public immutable creatorBps;
    uint16 public immutable computeFundBps;
    uint16 public immutable buybackBurnBps;
    uint64 public immutable timelock;
    VaultDeployer public immutable vaultDeployer;

    mapping(uint256 agentId => address) public feeSplitterOf;
    address[] public vaults;

    error ZeroAddress();
    error InvalidConfig();
    error NotAgentOwner();
    error AgentNotActive();
    error VaultAlreadyExists();

    event VaultCreated(uint256 indexed agentId, address indexed owner, address vault, address feeSplitter);

    constructor(Config memory c) {
        if (
            address(c.registry) == address(0) || address(c.asset) == address(0) || address(c.oracle) == address(0)
                || address(c.routerRegistry) == address(0) || c.computeFund == address(0) || c.buybackBurn == address(0)
        ) revert ZeroAddress();
        if (uint256(c.creatorBps) + c.computeFundBps + c.buybackBurnBps != BPS || c.timelock == 0) revert InvalidConfig();
        registry = c.registry;
        asset = c.asset;
        oracle = c.oracle;
        routerRegistry = c.routerRegistry;
        computeFund = c.computeFund;
        buybackBurn = c.buybackBurn;
        performanceFeeBps = c.performanceFeeBps;
        creatorBps = c.creatorBps;
        computeFundBps = c.computeFundBps;
        buybackBurnBps = c.buybackBurnBps;
        timelock = c.timelock;
        vaultDeployer = new VaultDeployer();
    }

    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }

    /// @notice What the agent owner chooses for their vault. Everything else is fixed by the factory.
    struct VaultParams {
        string name;
        string symbol;
        GuardedVault.Limits limits;
        /// @dev NAV level at which deposits stop.
        uint256 depositCap;
        /// @dev Stock tokens the agent may trade from day one (the asset is always allowed).
        address[] tokens;
        /// @dev Swap adapters the agent may use from day one. Each must be protocol-approved.
        address[] routers;
    }

    /// @notice Creates the vault for an agent. Caller must own the agent. One vault per agent.
    function createVault(uint256 agentId, VaultParams calldata v) external returns (address vault, address feeSplitter) {
        if (msg.sender != registry.ownerOf(agentId)) revert NotAgentOwner();
        if (!registry.isActive(agentId)) revert AgentNotActive();
        if (registry.vaultOf(agentId) != address(0)) revert VaultAlreadyExists();

        feeSplitter =
            address(new FeeSplitter(msg.sender, computeFund, buybackBurn, creatorBps, computeFundBps, buybackBurnBps));

        GuardedVault.InitParams memory p;
        p.asset = asset;
        p.name = v.name;
        p.symbol = v.symbol;
        p.registry = registry;
        p.agentId = agentId;
        p.oracle = oracle;
        p.routerRegistry = routerRegistry;
        p.feeRecipient = feeSplitter;
        p.performanceFeeBps = performanceFeeBps;
        p.timelock = timelock;
        p.depositCap = v.depositCap;
        p.limits = v.limits;
        p.tokens = v.tokens;
        p.routers = v.routers;
        vault = vaultDeployer.deploy(p);

        feeSplitterOf[agentId] = feeSplitter;
        vaults.push(vault);
        registry.setVault(agentId, vault);
        emit VaultCreated(agentId, msg.sender, vault, feeSplitter);
    }
}
