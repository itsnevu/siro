// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
/// SHA-256 ordered trees, independent of OpenZeppelin's sorted keccak trees.
contract Anchor is Ownable2Step {
    struct Root { bytes32 value; uint64 timestamp; }
    mapping(uint64 => Root) public dailyRoots;
    mapping(bytes32 => uint64) public strategyLockedAt;
    /// Publication witness: first block timestamp at which a commitment batch root was public.
    mapping(bytes32 => uint64) public witnessedAt;
    error InvalidAnchor();
    event Anchored(uint64 indexed day, bytes32 indexed root, uint64 timestamp);
    event Witnessed(bytes32 indexed root, uint64 timestamp);
    event StrategyLocked(bytes32 indexed hash, uint64 indexed windowStart, uint64 windowEnd, uint64 timestamp);
    constructor(address owner_) Ownable(owner_) {}
    function lockStrategy(bytes32 hash, uint64 windowStart, uint64 windowEnd) external onlyOwner {
        if(hash==bytes32(0)||strategyLockedAt[hash]!=0||windowStart<=block.timestamp||windowEnd<=windowStart)revert InvalidAnchor();
        strategyLockedAt[hash]=uint64(block.timestamp);
        emit StrategyLocked(hash,windowStart,windowEnd,uint64(block.timestamp));
    }
    function anchor(uint64 day, bytes32 root) external onlyOwner {
        if (root == bytes32(0) || dailyRoots[day].value != bytes32(0) || day >= block.timestamp / 1 days) revert InvalidAnchor();
        dailyRoots[day] = Root(root, uint64(block.timestamp));
        emit Anchored(day, root, uint64(block.timestamp));
    }
    /// Permissionless on purpose: anyone, including third parties, may witness a root.
    /// The first timestamp is immutable, so a later call can neither backdate nor erase it.
    function witness(bytes32 root) external {
        if (root == bytes32(0) || witnessedAt[root] != 0) revert InvalidAnchor();
        witnessedAt[root] = uint64(block.timestamp);
        emit Witnessed(root, uint64(block.timestamp));
    }
    function verifyWitness(bytes32 root, bytes32 leaf, bytes32[] calldata siblings, bool[] calldata left) external view returns (uint64) {
        if (siblings.length != left.length || witnessedAt[root] == 0) return 0;
        bytes32 current = leaf;
        for (uint256 i; i < siblings.length; ++i) current = left[i] ? sha256(abi.encodePacked(siblings[i], current)) : sha256(abi.encodePacked(current, siblings[i]));
        return current == root ? witnessedAt[root] : 0;
    }
    function verify(uint64 day, bytes32 leaf, bytes32[] calldata siblings, bool[] calldata left) external view returns (bool) {
        if (siblings.length != left.length || dailyRoots[day].value == bytes32(0)) return false;
        bytes32 current = leaf;
        for (uint256 i; i < siblings.length; ++i) current = left[i] ? sha256(abi.encodePacked(siblings[i], current)) : sha256(abi.encodePacked(current, siblings[i]));
        return current == dailyRoots[day].value;
    }
}
