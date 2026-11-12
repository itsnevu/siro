// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AgentRegistry is Ownable2Step {
    uint16 public constant MAX_CREATOR_FEE_BPS = 1_000;

    struct Agent {
        address creator;
        address vault;
        address creatorToken;
        bytes32 policyHash;
        string metadataURI;
        uint16 creatorFeeBps;
        uint64 createdAt;
        bool active;
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) private _agents;
    /// Only the factory registers, so every listed vault is factory-built and owned by its creator.
    address public factory;
    mapping(address => uint256) public agentIdOfVault;

    error Unauthorized();
    error InvalidAgent();
    error InvalidAddress();
    error FeeTooHigh();

    event FactorySet(address indexed factory);
    event AgentRegistered(uint256 indexed agentId, address indexed creator, address indexed vault, bytes32 policyHash);
    event AgentUpdated(uint256 indexed agentId, bytes32 policyHash, string metadataURI);
    event AgentStatusSet(uint256 indexed agentId, bool active);
    event CreatorTokenSet(uint256 indexed agentId, address indexed token);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setFactory(address factory_) external onlyOwner {
        if (factory_ == address(0) || factory != address(0)) revert InvalidAddress();
        factory = factory_;
        emit FactorySet(factory_);
    }

    function registerAgent(address creator, address vault, bytes32 policyHash, string calldata metadataURI, uint16 creatorFeeBps) external returns (uint256 agentId) {
        if (msg.sender != factory) revert Unauthorized();
        if (creator == address(0) || vault == address(0)) revert InvalidAddress();
        if (policyHash == bytes32(0) || agentIdOfVault[vault] != 0) revert InvalidAgent();
        if (creatorFeeBps > MAX_CREATOR_FEE_BPS) revert FeeTooHigh();
        agentId = nextAgentId++;
        agentIdOfVault[vault] = agentId;
        _agents[agentId] = Agent(creator, vault, address(0), policyHash, metadataURI, creatorFeeBps, uint64(block.timestamp), true);
        emit AgentRegistered(agentId, creator, vault, policyHash);
    }

    function updateAgent(uint256 agentId, bytes32 policyHash, string calldata metadataURI) external {
        Agent storage agent = _agents[agentId];
        if (agent.creator == address(0)) revert InvalidAgent();
        if (msg.sender != agent.creator) revert Unauthorized();
        if (policyHash == bytes32(0)) revert InvalidAgent();
        agent.policyHash = policyHash;
        agent.metadataURI = metadataURI;
        emit AgentUpdated(agentId, policyHash, metadataURI);
    }

    function setAgentStatus(uint256 agentId, bool active) external {
        Agent storage agent = _agents[agentId];
        if (agent.creator == address(0)) revert InvalidAgent();
        if (msg.sender != agent.creator && msg.sender != owner()) revert Unauthorized();
        agent.active = active;
        emit AgentStatusSet(agentId, active);
    }

    function setCreatorToken(uint256 agentId, address token) external onlyOwner {
        Agent storage agent = _agents[agentId];
        if (agent.creator == address(0) || token == address(0) || agent.creatorToken != address(0)) revert InvalidAgent();
        agent.creatorToken = token;
        emit CreatorTokenSet(agentId, token);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory agent = _agents[agentId];
        if (agent.creator == address(0)) revert InvalidAgent();
        return agent;
    }
}
