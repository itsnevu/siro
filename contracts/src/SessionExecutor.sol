// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
interface ISessionVault {
    function owner() external view returns (address);
    function asset() external view returns (address);
    function oracle() external view returns (address);
    function executeTrade(address router,address tokenIn,address tokenOut,uint256 amountIn,uint256 minOut) external returns(uint256);
}
interface ISessionOracle {function quote(address tokenIn,address tokenOut,uint256 amount) external view returns(uint256,uint256);}
/// User-owned scoped signer. Assets remain in the user's guarded vault throughout.
contract SessionExecutor is Ownable2Step, ReentrancyGuard {
    struct Session {address vault; uint128 maxTrade; uint128 maxDaily; uint64 expiry; uint32 maxOracleAge; uint64 generation; bool enabled;}
    mapping(address => Session) public sessions;
    mapping(address => mapping(uint64 => mapping(address => bool))) public tokens;
    mapping(address => mapping(uint64 => mapping(address => bool))) public routers;
    mapping(address => mapping(uint64 => uint256)) public dailySpent;
    mapping(bytes32 => bool) public executed;
    uint64 public ownerEpoch;
    mapping(address=>uint64) public sessionEpoch;
    bool public killed;
    error Denied();
    event SessionGranted(address indexed key,address indexed vault,uint64 generation,uint64 expiry);
    event SessionRevoked(address indexed key);
    event KillSet(bool active);
    event AllSessionsRevoked(uint64 epoch);
    event Executed(bytes32 indexed decisionId,address indexed key,uint256 value,uint256 amountOut);
    constructor(address user) Ownable(user) {}
    function _transferOwnership(address newOwner) internal override {super._transferOwnership(newOwner);++ownerEpoch;}
    function grant(address key,address vault,uint128 maxTrade,uint128 maxDaily,uint64 expiry,uint32 maxOracleAge,address[] calldata assets,address[] calldata venues) external onlyOwner {
        if(key==address(0)||vault==address(0)||ISessionVault(vault).owner()!=owner()||maxTrade==0||maxDaily<maxTrade||expiry<=block.timestamp||maxOracleAge==0||assets.length==0||venues.length==0) revert Denied();
        uint64 generation=sessions[key].generation+1;
        sessions[key]=Session(vault,maxTrade,maxDaily,expiry,maxOracleAge,generation,true);
        sessionEpoch[key]=ownerEpoch;
        for(uint256 i;i<assets.length;++i){if(assets[i]==address(0))revert Denied();tokens[key][generation][assets[i]]=true;}
        for(uint256 i;i<venues.length;++i){if(venues[i]==address(0))revert Denied();routers[key][generation][venues[i]]=true;}
        emit SessionGranted(key,vault,generation,expiry);
    }
    function revoke(address key) external onlyOwner {sessions[key].enabled=false;emit SessionRevoked(key);}
    function setKill(bool active) external onlyOwner {killed=active;emit KillSet(active);}
    /// One transaction invalidates every session key ever granted: each key is bound to the epoch
    /// it was granted in, and execute() requires the current epoch. Keys must be re-granted.
    function revokeAll() external onlyOwner {++ownerEpoch;emit AllSessionsRevoked(ownerEpoch);}
    function execute(bytes32 decisionId,address router,address tokenIn,address tokenOut,uint256 amountIn,uint256 minOut) external nonReentrant returns(uint256 out){
        Session memory s=sessions[msg.sender];uint64 day=uint64(block.timestamp/1 days);
        if(killed||!s.enabled||sessionEpoch[msg.sender]!=ownerEpoch||block.timestamp>=s.expiry||decisionId==bytes32(0)||executed[decisionId]||!tokens[msg.sender][s.generation][tokenIn]||!tokens[msg.sender][s.generation][tokenOut]||!routers[msg.sender][s.generation][router]||amountIn==0||minOut==0)revert Denied();
        ISessionVault vault=ISessionVault(s.vault);if(vault.owner()!=owner())revert Denied();
        uint256 value=amountIn;
        if(tokenIn!=vault.asset()) {uint256 updated;(value,updated)=ISessionOracle(vault.oracle()).quote(tokenIn,vault.asset(),amountIn);if(updated>block.timestamp||block.timestamp-updated>s.maxOracleAge||value==0)revert Denied();}
        if(value>s.maxTrade||dailySpent[msg.sender][day]+value>s.maxDaily)revert Denied();
        executed[decisionId]=true;dailySpent[msg.sender][day]+=value;
        out=vault.executeTrade(router,tokenIn,tokenOut,amountIn,minOut);
        emit Executed(decisionId,msg.sender,value,out);
    }
}
