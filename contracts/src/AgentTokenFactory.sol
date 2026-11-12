// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

contract AgentToken is ERC20, ERC20Capped, ERC20Permit, Ownable {
    constructor(string memory name, string memory symbol, uint256 cap, address creator)
        ERC20(name, symbol) ERC20Capped(cap) ERC20Permit(name) Ownable(creator)
    {
        _mint(creator, cap);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Capped) {
        super._update(from, to, value);
    }
}

contract AgentTokenFactory {
    AgentRegistry public immutable registry;
    mapping(uint256 => address) public tokenForAgent;

    error Unauthorized();
    error AlreadyCreated();
    error InvalidSupply();
    event AgentTokenCreated(uint256 indexed agentId, address indexed token, address indexed creator, uint256 supply);

    constructor(AgentRegistry registry_) { registry = registry_; }

    function create(uint256 agentId, string calldata name, string calldata symbol, uint256 fixedSupply) external returns (address token) {
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        if (agent.creator != msg.sender) revert Unauthorized();
        if (tokenForAgent[agentId] != address(0)) revert AlreadyCreated();
        if (fixedSupply == 0) revert InvalidSupply();
        token = address(new AgentToken(name, symbol, fixedSupply, msg.sender));
        tokenForAgent[agentId] = token;
        emit AgentTokenCreated(agentId, token, msg.sender, fixedSupply);
    }
}
