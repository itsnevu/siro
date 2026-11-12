// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GuardedVault, ITwapOracle} from "./GuardedVault.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// Deploys one GuardedVault per agent with protocol-fixed asset, oracle and timelock,
/// so creators choose only the risk policy and depositors get the same audited code.
contract GuardedVaultFactory {
    uint64 public constant MIN_POLICY_DELAY = 1 days;

    IERC20 public immutable asset;
    ITwapOracle public immutable oracle;
    AgentRegistry public immutable registry;
    uint64 public immutable policyDelay;

    address[] public vaults;
    mapping(address => bool) public isVault;

    error DelayTooShort();
    error InvalidAddress();

    event AgentCreated(uint256 indexed agentId, address indexed creator, address indexed vault);

    constructor(IERC20 asset_, ITwapOracle oracle_, AgentRegistry registry_, uint64 policyDelay_) {
        if (address(asset_) == address(0) || address(oracle_) == address(0) || address(registry_) == address(0)) revert InvalidAddress();
        if (policyDelay_ < MIN_POLICY_DELAY) revert DelayTooShort();
        asset = asset_;
        oracle = oracle_;
        registry = registry_;
        policyDelay = policyDelay_;
    }

    function createAgent(string calldata name, string calldata symbol, GuardedVault.Policy calldata policy, string calldata metadataURI, uint16 creatorFeeBps)
        external returns (uint256 agentId, GuardedVault vault)
    {
        vault = new GuardedVault(asset, name, symbol, msg.sender, oracle, policyDelay, policy);
        vaults.push(address(vault));
        isVault[address(vault)] = true;
        agentId = registry.registerAgent(msg.sender, address(vault), keccak256(abi.encode(policy)), metadataURI, creatorFeeBps);
        emit AgentCreated(agentId, msg.sender, address(vault));
    }

    function vaultCount() external view returns (uint256) { return vaults.length; }
}
