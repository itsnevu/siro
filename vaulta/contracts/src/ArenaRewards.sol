// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title ArenaRewards
/// @notice Weekly Arena seasons. After a season ends, the owner posts a Merkle root of the prizes and
///         funds it in the same transaction. Winners claim with a proof.
/// @dev Trust model: the owner (treasury multisig, ideally behind the timelock) decides the root, so
///      scoring is not enforced onchain. What IS enforced:
///        - results can only be posted after the season's end time, once, and cannot be changed;
///        - the prize pool is pulled from the poster when the root is posted, so a posted season is
///          always fully funded and total claims can never exceed it;
///        - `scoresURI` and `scoringScriptHash` are published with the root so anyone can rerun the
///          open-source scoring script on public data and check the root;
///        - unclaimed prizes can be swept only after the claim deadline.
///      Leaf: keccak256(bytes.concat(keccak256(abi.encode(seasonId, index, account, amount)))).
contract ArenaRewards is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint64 public constant MIN_CLAIM_WINDOW = 14 days;

    IERC20 public immutable prizeToken;

    struct Season {
        uint64 startTime;
        uint64 endTime;
        uint64 claimDeadline;
        bytes32 merkleRoot;
        uint256 totalPrize;
        uint256 claimed;
        bytes32 scoringScriptHash;
        string scoresURI;
    }

    uint256 public seasonCount;
    mapping(uint256 seasonId => Season) private _seasons;
    mapping(uint256 seasonId => mapping(uint256 wordIndex => uint256)) private _claimedBitmap;

    error ZeroAddress();
    error InvalidSeasonTimes();
    error UnknownSeason();
    error SeasonNotEnded();
    error ResultsAlreadyPosted();
    error ResultsNotPosted();
    error EmptyResults();
    error ClaimWindowTooShort();
    error AlreadyClaimed();
    error InvalidProof();
    error ClaimWindowClosed();
    error ClaimWindowOpen();
    error ExceedsPrizePool();

    event SeasonCreated(uint256 indexed seasonId, uint64 startTime, uint64 endTime);
    event ResultsPosted(
        uint256 indexed seasonId,
        bytes32 merkleRoot,
        uint256 totalPrize,
        uint64 claimDeadline,
        bytes32 scoringScriptHash,
        string scoresURI
    );
    event Claimed(uint256 indexed seasonId, uint256 indexed index, address indexed account, uint256 amount);
    event UnclaimedSwept(uint256 indexed seasonId, address indexed to, uint256 amount);

    constructor(address owner_, IERC20 prizeToken_) Ownable(owner_) {
        if (address(prizeToken_) == address(0)) revert ZeroAddress();
        prizeToken = prizeToken_;
    }

    function getSeason(uint256 seasonId) external view returns (Season memory) {
        if (seasonId == 0 || seasonId > seasonCount) revert UnknownSeason();
        return _seasons[seasonId];
    }

    function isClaimed(uint256 seasonId, uint256 index) public view returns (bool) {
        return (_claimedBitmap[seasonId][index >> 8] >> (index & 0xff)) & 1 == 1;
    }

    /// @notice Announces a season. Season ids start at 1.
    function createSeason(uint64 startTime, uint64 endTime) external onlyOwner returns (uint256 seasonId) {
        if (endTime <= startTime || endTime <= block.timestamp) revert InvalidSeasonTimes();
        seasonId = ++seasonCount;
        Season storage season = _seasons[seasonId];
        season.startTime = startTime;
        season.endTime = endTime;
        emit SeasonCreated(seasonId, startTime, endTime);
    }

    /// @notice Posts final results and funds them. Pulls `totalPrize` of the prize token from the caller.
    /// @param scoringScriptHash Hash (for example the git commit) of the scoring script that produced the root.
    /// @param scoresURI Where the full score table and the Merkle tree are published.
    function postResults(
        uint256 seasonId,
        bytes32 merkleRoot,
        uint256 totalPrize,
        uint64 claimDeadline,
        bytes32 scoringScriptHash,
        string calldata scoresURI
    ) external onlyOwner nonReentrant {
        if (seasonId == 0 || seasonId > seasonCount) revert UnknownSeason();
        Season storage season = _seasons[seasonId];
        if (block.timestamp < season.endTime) revert SeasonNotEnded();
        if (season.merkleRoot != bytes32(0)) revert ResultsAlreadyPosted();
        if (merkleRoot == bytes32(0) || totalPrize == 0) revert EmptyResults();
        if (claimDeadline < block.timestamp + MIN_CLAIM_WINDOW) revert ClaimWindowTooShort();

        season.merkleRoot = merkleRoot;
        season.totalPrize = totalPrize;
        season.claimDeadline = claimDeadline;
        season.scoringScriptHash = scoringScriptHash;
        season.scoresURI = scoresURI;
        emit ResultsPosted(seasonId, merkleRoot, totalPrize, claimDeadline, scoringScriptHash, scoresURI);

        prizeToken.safeTransferFrom(msg.sender, address(this), totalPrize);
    }

    /// @notice Claims a prize. Anyone may submit the claim; the tokens always go to `account`.
    function claim(uint256 seasonId, uint256 index, address account, uint256 amount, bytes32[] calldata proof)
        external
        nonReentrant
    {
        Season storage season = _seasons[seasonId];
        bytes32 root = season.merkleRoot;
        if (root == bytes32(0)) revert ResultsNotPosted();
        if (block.timestamp > season.claimDeadline) revert ClaimWindowClosed();
        if (isClaimed(seasonId, index)) revert AlreadyClaimed();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(seasonId, index, account, amount))));
        if (!MerkleProof.verifyCalldata(proof, root, leaf)) revert InvalidProof();

        uint256 claimed = season.claimed + amount;
        if (claimed > season.totalPrize) revert ExceedsPrizePool();
        season.claimed = claimed;
        _claimedBitmap[seasonId][index >> 8] |= (1 << (index & 0xff));
        emit Claimed(seasonId, index, account, amount);

        prizeToken.safeTransfer(account, amount);
    }

    /// @notice After the claim deadline, returns what was not claimed.
    function sweepUnclaimed(uint256 seasonId, address to) external onlyOwner nonReentrant returns (uint256 amount) {
        if (to == address(0)) revert ZeroAddress();
        Season storage season = _seasons[seasonId];
        if (season.merkleRoot == bytes32(0)) revert ResultsNotPosted();
        if (block.timestamp <= season.claimDeadline) revert ClaimWindowOpen();
        amount = season.totalPrize - season.claimed;
        season.claimed = season.totalPrize;
        emit UnclaimedSwept(seasonId, to, amount);
        if (amount != 0) prizeToken.safeTransfer(to, amount);
    }
}
