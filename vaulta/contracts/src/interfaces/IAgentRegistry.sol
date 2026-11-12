// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry
/// @notice Source of truth for who owns an agent, which key may act for it and how long its record is.
interface IAgentRegistry {
    /// @dev `Active` is the zero value, so every status check must also check that the agent exists.
    ///      Use `isActive`, which does both.
    enum Status {
        Active,
        Paused,
        Retired
    }

    struct Agent {
        address owner;
        address executor;
        address vault;
        bytes32 strategyHash;
        string metadataURI;
        uint64 createdAt;
        uint32 verifiedDays;
        Status status;
    }

    function registerAgent(bytes32 strategyHash, string calldata metadataURI) external returns (uint256 agentId);

    function getAgent(uint256 agentId) external view returns (Agent memory);

    function exists(uint256 agentId) external view returns (bool);

    function ownerOf(uint256 agentId) external view returns (address);

    function executorOf(uint256 agentId) external view returns (address);

    function vaultOf(uint256 agentId) external view returns (address);

    function statusOf(uint256 agentId) external view returns (Status);

    /// @notice True only if the agent exists and its status is Active.
    function isActive(uint256 agentId) external view returns (bool);

    function verifiedDays(uint256 agentId) external view returns (uint32);

    /// @notice Links the agent to its vault. Only the vault factory, once per agent.
    function setVault(uint256 agentId, address vault) external;

    /// @notice Credits one verified day. Only the decision log.
    function incrementVerifiedDays(uint256 agentId) external;

    /// @notice Clears the verified-day streak after a missed epoch. Only the decision log.
    function resetVerifiedDays(uint256 agentId) external;
}
