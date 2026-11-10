// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SiroLeaderboard
 * @notice Onchain leaderboard that tracks leader performance for the Siro copy-trading
 *         platform. Anyone can register as a leader. Stats are updated by the keeper
 *         (verified by the CopyVault contract) as trades settle.
 */
contract SiroLeaderboard {
    // ------------------------------------------------------------------ types

    struct Leader {
        address wallet;
        string  name;
        int256  totalPnl;           // cumulative PnL in bps
        uint256 sharpeScore;        // scaled by 100 (e.g. 182 = 1.82)
        uint256 maxDrawdown;        // in bps
        uint256 followerCount;
        uint256 totalVolume;
        uint256 tradeCount;
        uint256 registeredAt;
        bool    active;
    }

    // ---------------------------------------------------------------- storage

    address public copyVault;
    address public owner;

    address[] public leaderAddresses;
    mapping(address => Leader) public leaders;
    mapping(address => bool) public isLeader;
    mapping(address => bool) public updaters;

    // ----------------------------------------------------------------- events

    event LeaderRegistered(address indexed leader, string name, uint256 timestamp);
    event LeaderNameUpdated(address indexed leader, string newName);
    event LeaderDeactivated(address indexed leader);
    event LeaderReactivated(address indexed leader);
    event StatsUpdated(
        address indexed leader,
        int256 totalPnl,
        uint256 sharpeScore,
        uint256 maxDrawdown,
        uint256 totalVolume,
        uint256 tradeCount
    );
    event FollowerCountUpdated(address indexed leader, uint256 newCount);
    event UpdaterSet(address indexed updater, bool allowed);
    event CopyVaultSet(address indexed vault);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    // ----------------------------------------------------------------- errors

    error Unauthorized();
    error AlreadyRegistered();
    error NotRegistered();
    error NameTooLong();
    error ZeroAddress();

    // -------------------------------------------------------------- constants

    uint256 public constant MAX_NAME_BYTES = 64;

    // ------------------------------------------------------------ constructor

    constructor() {
        owner = msg.sender;
    }

    // -------------------------------------------------------------- modifiers

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyUpdater() {
        if (!updaters[msg.sender] && msg.sender != owner && msg.sender != copyVault) revert Unauthorized();
        _;
    }

    // -------------------------------------------------- leader registration

    function register(string calldata name) external {
        if (isLeader[msg.sender]) revert AlreadyRegistered();
        if (bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();

        Leader storage l = leaders[msg.sender];
        l.wallet = msg.sender;
        l.name = name;
        l.registeredAt = block.timestamp;
        l.active = true;
        isLeader[msg.sender] = true;
        leaderAddresses.push(msg.sender);

        emit LeaderRegistered(msg.sender, name, block.timestamp);
    }

    function setName(string calldata name) external {
        if (!isLeader[msg.sender]) revert NotRegistered();
        if (bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();
        leaders[msg.sender].name = name;
        emit LeaderNameUpdated(msg.sender, name);
    }

    function deactivate() external {
        if (!isLeader[msg.sender]) revert NotRegistered();
        leaders[msg.sender].active = false;
        emit LeaderDeactivated(msg.sender);
    }

    function reactivate() external {
        if (!isLeader[msg.sender]) revert NotRegistered();
        leaders[msg.sender].active = true;
        emit LeaderReactivated(msg.sender);
    }

    // --------------------------------------------------------- stats updates

    function updateStats(
        address leader,
        int256 totalPnl,
        uint256 sharpeScore,
        uint256 maxDrawdown,
        uint256 volume,
        uint256 trades
    ) external onlyUpdater {
        if (!isLeader[leader]) revert NotRegistered();

        Leader storage l = leaders[leader];
        l.totalPnl = totalPnl;
        l.sharpeScore = sharpeScore;
        l.maxDrawdown = maxDrawdown;
        l.totalVolume += volume;
        l.tradeCount += trades;

        emit StatsUpdated(leader, totalPnl, sharpeScore, maxDrawdown, l.totalVolume, l.tradeCount);
    }

    function updateFollowerCount(address leader, bool increment) external {
        if (msg.sender != copyVault && !updaters[msg.sender] && msg.sender != owner) revert Unauthorized();
        if (!isLeader[leader]) revert NotRegistered();

        Leader storage l = leaders[leader];
        if (increment) {
            l.followerCount++;
        } else if (l.followerCount > 0) {
            l.followerCount--;
        }

        emit FollowerCountUpdated(leader, l.followerCount);
    }

    // ------------------------------------------------------------- admin

    function setCopyVault(address vault) external onlyOwner {
        if (vault == address(0)) revert ZeroAddress();
        copyVault = vault;
        emit CopyVaultSet(vault);
    }

    function setUpdater(address updater, bool allowed) external onlyOwner {
        if (updater == address(0)) revert ZeroAddress();
        updaters[updater] = allowed;
        emit UpdaterSet(updater, allowed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ------------------------------------------------------------------ views

    function getLeaderStats(address leader) external view returns (Leader memory) {
        return leaders[leader];
    }

    function getLeaderCount() external view returns (uint256) {
        return leaderAddresses.length;
    }

    /**
     * @notice Get active leaders, paginated. Not sorted on-chain — sort by PnL off-chain.
     */
    function getActiveLeaders(uint256 offset, uint256 limit) external view returns (Leader[] memory list) {
        uint256 total = leaderAddresses.length;
        if (offset >= total || limit == 0) return new Leader[](0);

        uint256 count = 0;
        Leader[] memory temp = new Leader[](limit);

        for (uint256 i = offset; i < total && count < limit; i++) {
            address addr = leaderAddresses[i];
            if (leaders[addr].active) {
                temp[count] = leaders[addr];
                count++;
            }
        }

        list = new Leader[](count);
        for (uint256 i = 0; i < count; i++) {
            list[i] = temp[i];
        }
    }

    function getLeaders(uint256 offset, uint256 limit) external view returns (Leader[] memory list) {
        uint256 total = leaderAddresses.length;
        if (offset >= total || limit == 0) return new Leader[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        list = new Leader[](end - offset);
        for (uint256 i = 0; i < list.length; i++) {
            list[i] = leaders[leaderAddresses[offset + i]];
        }
    }
}
