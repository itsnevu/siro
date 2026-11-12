// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title DecisionLog
/// @notice Proof of Decision. Every hour an agent's executor commits one Merkle root covering the
///         decisions it made that hour. A committed root can never be replaced or removed.
/// @dev Rules that make the record hard to fake:
///      - One commit per agent per epoch (epoch = hour index, unix seconds / 3600).
///      - A commit for hour H is accepted only during hour H or hour H+1. Older hours cannot be
///        back-filled, so a root always predates the outcome of the decisions it covers by at most
///        two hours.
///      - Epochs must increase. 24 consecutive epochs credit one verified day in the registry.
///        A skipped epoch clears the agent's verified days.
///      Leaf (must match packages/shared/src/decision.ts):
///        keccak256(abi.encode(agentId, epoch, ticker, action, size, inputsHash, reasonHash))
///      Tree: OpenZeppelin sorted-pair hashing.
contract DecisionLog {
    uint64 public constant EPOCH_SECONDS = 1 hours;
    uint32 public constant EPOCHS_PER_VERIFIED_DAY = 24;
    uint256 public constant MAX_BATCH = 256;

    IAgentRegistry public immutable registry;

    struct Progress {
        uint64 lastEpoch;
        /// @dev Consecutive epochs committed without a gap, ending at `lastEpoch`.
        uint32 streak;
        /// @dev Total epochs ever committed. Never reset.
        uint32 totalCommits;
    }

    mapping(uint256 agentId => mapping(uint64 epoch => bytes32 root)) public roots;
    mapping(uint256 agentId => Progress) public progress;

    error NotExecutor();
    error AgentNotActive();
    error EmptyCommit();
    error EpochInFuture(uint64 epoch, uint64 currentEpoch);
    error EpochTooOld(uint64 epoch, uint64 currentEpoch);
    error EpochNotIncreasing(uint64 epoch, uint64 lastEpoch);
    error LengthMismatch();
    error BatchTooLarge();

    event DecisionsCommitted(uint256 indexed agentId, uint64 indexed epoch, bytes32 root, uint32 count);
    event StreakBroken(uint256 indexed agentId, uint64 lastEpoch, uint64 epoch);

    constructor(IAgentRegistry registry_) {
        registry = registry_;
    }

    /// @notice The hour index right now.
    function currentEpoch() public view returns (uint64) {
        return uint64(block.timestamp / EPOCH_SECONDS);
    }

    /// @notice Commits the Merkle root of an agent's decisions for one epoch.
    /// @param decisionCount Number of leaves under `root`. Informational; emitted for indexers.
    function commit(uint256 agentId, uint64 epoch, bytes32 root, uint32 decisionCount) external {
        _commit(agentId, epoch, root, decisionCount);
    }

    /// @notice Commits one epoch for several agents that share the calling executor.
    function commitBatch(
        uint256[] calldata agentIds,
        uint64 epoch,
        bytes32[] calldata roots_,
        uint32[] calldata decisionCounts
    ) external {
        uint256 n = agentIds.length;
        if (n != roots_.length || n != decisionCounts.length) revert LengthMismatch();
        if (n > MAX_BATCH) revert BatchTooLarge();
        for (uint256 i; i < n; ++i) {
            _commit(agentIds[i], epoch, roots_[i], decisionCounts[i]);
        }
    }

    /// @notice True if `leaf` is included in the root committed for (`agentId`, `epoch`).
    function verify(uint256 agentId, uint64 epoch, bytes32 leaf, bytes32[] calldata proof) external view returns (bool) {
        bytes32 root = roots[agentId][epoch];
        if (root == bytes32(0)) return false;
        return MerkleProof.verifyCalldata(proof, root, leaf);
    }

    /// @notice The canonical leaf for a decision. Offchain code must produce the same bytes.
    /// @param action 0 = HOLD, 1 = BUY, 2 = SELL.
    /// @param size Trade notional in asset units.
    function leafOf(
        uint256 agentId,
        uint64 epoch,
        string calldata ticker,
        uint8 action,
        uint256 size,
        bytes32 inputsHash,
        bytes32 reasonHash
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(agentId, epoch, ticker, action, size, inputsHash, reasonHash));
    }

    function _commit(uint256 agentId, uint64 epoch, bytes32 root, uint32 decisionCount) private {
        if (msg.sender != registry.executorOf(agentId)) revert NotExecutor();
        if (!registry.isActive(agentId)) revert AgentNotActive();
        if (root == bytes32(0) || decisionCount == 0) revert EmptyCommit();

        uint64 nowEpoch = currentEpoch();
        if (epoch > nowEpoch) revert EpochInFuture(epoch, nowEpoch);
        if (epoch + 1 < nowEpoch) revert EpochTooOld(epoch, nowEpoch);

        Progress memory p = progress[agentId];
        if (epoch <= p.lastEpoch) revert EpochNotIncreasing(epoch, p.lastEpoch);

        bool first = p.lastEpoch == 0;
        bool continuous = !first && epoch == p.lastEpoch + 1;
        uint32 streak = continuous ? p.streak + 1 : 1;

        progress[agentId] = Progress({lastEpoch: epoch, streak: streak, totalCommits: p.totalCommits + 1});
        roots[agentId][epoch] = root;
        emit DecisionsCommitted(agentId, epoch, root, decisionCount);

        if (!first && !continuous) {
            emit StreakBroken(agentId, p.lastEpoch, epoch);
            if (registry.verifiedDays(agentId) != 0) registry.resetVerifiedDays(agentId);
        }
        if (streak % EPOCHS_PER_VERIFIED_DAY == 0) registry.incrementVerifiedDays(agentId);
    }
}
