// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FeeSplitter is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint16 public constant BPS = 10_000;
    uint16 public constant TOTAL_PERFORMANCE_FEE_BPS = 1_500;
    uint16 public constant CREATOR_SHARE_OF_PROFIT_BPS = 1_000;
    uint16 public constant PROTOCOL_SHARE_OF_PROFIT_BPS = 500;

    address public protocolTreasury;
    mapping(address => bool) public approvedCollectors;
    mapping(address => mapping(address => uint256)) public claimable;

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    event CollectorSet(address indexed collector, bool approved);
    event TreasurySet(address indexed treasury);
    event FeeCollected(address indexed token, address indexed creator, uint256 profit, uint256 creatorFee, uint256 protocolFee);
    event Claimed(address indexed token, address indexed recipient, uint256 amount);

    constructor(address initialOwner, address treasury) Ownable(initialOwner) {
        if (treasury == address(0)) revert InvalidAddress();
        protocolTreasury = treasury;
    }

    function setCollector(address collector, bool approved) external onlyOwner {
        if (collector == address(0)) revert InvalidAddress();
        approvedCollectors[collector] = approved;
        emit CollectorSet(collector, approved);
    }

    function setProtocolTreasury(address treasury) external onlyOwner {
        if (treasury == address(0)) revert InvalidAddress();
        protocolTreasury = treasury;
        emit TreasurySet(treasury);
    }

    function collectPerformanceFee(IERC20 token, address creator, uint256 realizedProfit) external nonReentrant returns (uint256 totalFee) {
        if (!approvedCollectors[msg.sender]) revert Unauthorized();
        if (creator == address(0) || address(token) == address(0)) revert InvalidAddress();
        if (realizedProfit == 0) revert InvalidAmount();
        uint256 creatorFee = realizedProfit * CREATOR_SHARE_OF_PROFIT_BPS / BPS;
        uint256 protocolFee = realizedProfit * PROTOCOL_SHARE_OF_PROFIT_BPS / BPS;
        totalFee = creatorFee + protocolFee;
        token.safeTransferFrom(msg.sender, address(this), totalFee);
        claimable[address(token)][creator] += creatorFee;
        claimable[address(token)][protocolTreasury] += protocolFee;
        emit FeeCollected(address(token), creator, realizedProfit, creatorFee, protocolFee);
    }

    function claim(IERC20 token) external nonReentrant returns (uint256 amount) {
        amount = claimable[address(token)][msg.sender];
        if (amount == 0) revert InvalidAmount();
        claimable[address(token)][msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(address(token), msg.sender, amount);
    }
}
