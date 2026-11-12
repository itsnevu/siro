// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice One record per agent: owner, executor key, vault, strategy hash, status and verified days.
/// @dev Design notes:
///      - `strategyHash` is immutable. A different strategy is a different agent with its own record,
///        so a track record can never be moved onto rules it was not earned with.
///      - `verifiedDays` is written only by the DecisionLog. It is a streak: the log clears it when an
///        hourly commit is missed.
///      - The deployer wires the DecisionLog and VaultFactory once each and has no other power.
///        After wiring there is no admin.
///      - GuardedVault reads `ownerOf` and `executorOf` live, so transferring an agent or rotating its
///        executor here takes effect in the vault immediately.
contract AgentRegistry is IAgentRegistry {
    address public immutable deployer;
    address public decisionLog;
    address public vaultFactory;

    /// @notice Number of agents registered. Agent ids run from 1 to `agentCount`.
    uint256 public agentCount;

    mapping(uint256 agentId => Agent) private _agents;
    mapping(uint256 agentId => address) public pendingOwner;

    error NotDeployer();
    error NotAgentOwner();
    error NotPendingOwner();
    error NotDecisionLog();
    error NotVaultFactory();
    error AlreadyWired();
    error ZeroAddress();
    error EmptyStrategyHash();
    error UnknownAgent();
    error AgentRetired();
    error VaultAlreadySet();
    error StatusUnchanged();

    event DecisionLogWired(address indexed decisionLog);
    event VaultFactoryWired(address indexed vaultFactory);
    event AgentRegistered(uint256 indexed agentId, address indexed owner, bytes32 strategyHash, string metadataURI);
    event ExecutorSet(uint256 indexed agentId, address indexed executor);
    event MetadataURISet(uint256 indexed agentId, string metadataURI);
    event VaultSet(uint256 indexed agentId, address indexed vault);
    event StatusChanged(uint256 indexed agentId, Status status);
    event VerifiedDaysChanged(uint256 indexed agentId, uint32 verifiedDays);
    event OwnershipTransferStarted(uint256 indexed agentId, address indexed from, address indexed to);
    event OwnershipTransferred(uint256 indexed agentId, address indexed from, address indexed to);

    modifier onlyAgentOwner(uint256 agentId) {
        if (msg.sender != _agents[agentId].owner) revert NotAgentOwner();
        _;
    }

    constructor() {
        deployer = msg.sender;
    }

    // ─────────────────────────────── one-time wiring ───────────────────────────────

    /// @notice Sets the only contract allowed to change verified days. Callable once.
    function wireDecisionLog(address decisionLog_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (decisionLog != address(0)) revert AlreadyWired();
        if (decisionLog_ == address(0)) revert ZeroAddress();
        decisionLog = decisionLog_;
        emit DecisionLogWired(decisionLog_);
    }

    /// @notice Sets the only contract allowed to link vaults to agents. Callable once.
    function wireVaultFactory(address vaultFactory_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (vaultFactory != address(0)) revert AlreadyWired();
        if (vaultFactory_ == address(0)) revert ZeroAddress();
        vaultFactory = vaultFactory_;
        emit VaultFactoryWired(vaultFactory_);
    }

    // ─────────────────────────────── agent lifecycle ───────────────────────────────

    /// @inheritdoc IAgentRegistry
    function registerAgent(bytes32 strategyHash, string calldata metadataURI) external returns (uint256 agentId) {
        agentId = _register(strategyHash, metadataURI);
    }

    /// @notice Registers an agent and sets its executor in one transaction.
    function registerAgentWithExecutor(bytes32 strategyHash, string calldata metadataURI, address executor)
        external
        returns (uint256 agentId)
    {
        agentId = _register(strategyHash, metadataURI);
        _setExecutor(agentId, executor);
    }

    /// @notice Sets the key allowed to commit decisions and trade for the agent. Takes effect immediately,
    ///         so a compromised key can be replaced without waiting.
    function setExecutor(uint256 agentId, address executor) external onlyAgentOwner(agentId) {
        _setExecutor(agentId, executor);
    }

    /// @notice Updates display metadata. Does not affect the strategy hash or the record.
    function setMetadataURI(uint256 agentId, string calldata metadataURI) external onlyAgentOwner(agentId) {
        _agents[agentId].metadataURI = metadataURI;
        emit MetadataURISet(agentId, metadataURI);
    }

    /// @notice Stops commits and trading for the agent until `resume` is called.
    function pause(uint256 agentId) external onlyAgentOwner(agentId) {
        _setStatus(agentId, Status.Paused);
    }

    function resume(uint256 agentId) external onlyAgentOwner(agentId) {
        _setStatus(agentId, Status.Active);
    }

    /// @notice Permanently retires the agent. Cannot be undone.
    function retire(uint256 agentId) external onlyAgentOwner(agentId) {
        _setStatus(agentId, Status.Retired);
    }

    /// @notice Starts a two-step ownership transfer. The new owner must call `acceptAgent`.
    function transferAgent(uint256 agentId, address newOwner) external onlyAgentOwner(agentId) {
        pendingOwner[agentId] = newOwner;
        emit OwnershipTransferStarted(agentId, msg.sender, newOwner);
    }

    function acceptAgent(uint256 agentId) external {
        if (msg.sender != pendingOwner[agentId]) revert NotPendingOwner();
        address previous = _agents[agentId].owner;
        delete pendingOwner[agentId];
        _agents[agentId].owner = msg.sender;
        emit OwnershipTransferred(agentId, previous, msg.sender);
    }

    // ─────────────────────────────── privileged hooks ───────────────────────────────

    /// @inheritdoc IAgentRegistry
    function setVault(uint256 agentId, address vault) external {
        if (msg.sender != vaultFactory) revert NotVaultFactory();
        Agent storage agent = _existing(agentId);
        if (vault == address(0)) revert ZeroAddress();
        if (agent.vault != address(0)) revert VaultAlreadySet();
        agent.vault = vault;
        emit VaultSet(agentId, vault);
    }

    /// @inheritdoc IAgentRegistry
    function incrementVerifiedDays(uint256 agentId) external {
        if (msg.sender != decisionLog) revert NotDecisionLog();
        Agent storage agent = _existing(agentId);
        uint32 next = agent.verifiedDays + 1;
        agent.verifiedDays = next;
        emit VerifiedDaysChanged(agentId, next);
    }

    /// @inheritdoc IAgentRegistry
    function resetVerifiedDays(uint256 agentId) external {
        if (msg.sender != decisionLog) revert NotDecisionLog();
        Agent storage agent = _existing(agentId);
        agent.verifiedDays = 0;
        emit VerifiedDaysChanged(agentId, 0);
    }

    // ─────────────────────────────── views ───────────────────────────────

    /// @inheritdoc IAgentRegistry
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return _existing(agentId);
    }

    /// @inheritdoc IAgentRegistry
    function exists(uint256 agentId) public view returns (bool) {
        return _agents[agentId].owner != address(0);
    }

    /// @inheritdoc IAgentRegistry
    function ownerOf(uint256 agentId) external view returns (address) {
        return _agents[agentId].owner;
    }

    /// @inheritdoc IAgentRegistry
    function executorOf(uint256 agentId) external view returns (address) {
        return _agents[agentId].executor;
    }

    /// @inheritdoc IAgentRegistry
    function vaultOf(uint256 agentId) external view returns (address) {
        return _agents[agentId].vault;
    }

    /// @inheritdoc IAgentRegistry
    function statusOf(uint256 agentId) external view returns (Status) {
        return _existing(agentId).status;
    }

    /// @inheritdoc IAgentRegistry
    function isActive(uint256 agentId) external view returns (bool) {
        Agent storage agent = _agents[agentId];
        return agent.owner != address(0) && agent.status == Status.Active;
    }

    /// @inheritdoc IAgentRegistry
    function verifiedDays(uint256 agentId) external view returns (uint32) {
        return _agents[agentId].verifiedDays;
    }

    // ─────────────────────────────── internals ───────────────────────────────

    function _register(bytes32 strategyHash, string calldata metadataURI) private returns (uint256 agentId) {
        if (strategyHash == bytes32(0)) revert EmptyStrategyHash();
        agentId = ++agentCount;
        _agents[agentId] = Agent({
            owner: msg.sender,
            executor: address(0),
            vault: address(0),
            strategyHash: strategyHash,
            metadataURI: metadataURI,
            createdAt: uint64(block.timestamp),
            verifiedDays: 0,
            status: Status.Active
        });
        emit AgentRegistered(agentId, msg.sender, strategyHash, metadataURI);
    }

    function _setExecutor(uint256 agentId, address executor) private {
        _agents[agentId].executor = executor;
        emit ExecutorSet(agentId, executor);
    }

    function _setStatus(uint256 agentId, Status status) private {
        Agent storage agent = _agents[agentId];
        if (agent.status == Status.Retired) revert AgentRetired();
        if (agent.status == status) revert StatusUnchanged();
        agent.status = status;
        emit StatusChanged(agentId, status);
    }

    function _existing(uint256 agentId) private view returns (Agent storage agent) {
        agent = _agents[agentId];
        if (agent.owner == address(0)) revert UnknownAgent();
    }
}
