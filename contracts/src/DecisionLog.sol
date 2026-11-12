// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract DecisionLog is Ownable2Step {
    struct Decision {
        uint256 agentId;
        address submitter;
        bytes32 root;
        bytes32 executionHash;
        uint64 timestamp;
    }

    uint256 public nextDecisionId = 1;
    mapping(uint256 => Decision) public decisions;
    mapping(address => bool) public submitters;

    error Unauthorized();
    error InvalidDecision();
    event SubmitterSet(address indexed submitter, bool allowed);
    event DecisionCommitted(uint256 indexed decisionId, uint256 indexed agentId, bytes32 indexed root, bytes32 executionHash, address submitter);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setSubmitter(address submitter, bool allowed) external onlyOwner {
        if (submitter == address(0)) revert InvalidDecision();
        submitters[submitter] = allowed;
        emit SubmitterSet(submitter, allowed);
    }

    function commit(uint256 agentId, bytes32 root, bytes32 executionHash) external returns (uint256 decisionId) {
        if (!submitters[msg.sender]) revert Unauthorized();
        if (agentId == 0 || root == bytes32(0)) revert InvalidDecision();
        decisionId = nextDecisionId++;
        decisions[decisionId] = Decision(agentId, msg.sender, root, executionHash, uint64(block.timestamp));
        emit DecisionCommitted(decisionId, agentId, root, executionHash, msg.sender);
    }

    function verify(uint256 decisionId, bytes32 leaf, bytes32[] calldata proof) external view returns (bool) {
        bytes32 root = decisions[decisionId].root;
        if (root == bytes32(0)) return false;
        return MerkleProof.verifyCalldata(proof, root, leaf);
    }
}
