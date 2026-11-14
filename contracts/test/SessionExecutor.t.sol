// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Test} from "forge-std/Test.sol";
import {SessionExecutor} from "../src/SessionExecutor.sol";
contract OwnedSessionVault {
    address public owner;address public asset=address(1);address public oracle=address(3);
    constructor(address user){owner=user;}
    function executeTrade(address,address,address,uint256 amount,uint256)external pure returns(uint256){return amount;}
}
contract SessionExecutorTest is Test {
    SessionExecutor executor; OwnedSessionVault vault; address key=address(44);address router=address(9);
    function setUp()public{vm.warp(1 days);vault=new OwnedSessionVault(address(this));executor=new SessionExecutor(address(this));grant();}
    function grant()internal{address[]memory assets=new address[](2);assets[0]=address(1);assets[1]=address(2);address[]memory venues=new address[](1);venues[0]=router;executor.grant(key,address(vault),100,150,uint64(block.timestamp+1 days),3600,assets,venues);}
    function execute(bytes32 id,uint256 value)internal{vm.prank(key);executor.execute(id,router,address(1),address(2),value,1);}
    function testScopeIdempotencyDailyLimitExpiryAndKill()public{
        execute(bytes32(uint256(1)),100);
        vm.expectRevert();execute(bytes32(uint256(1)),1);
        vm.expectRevert();execute(bytes32(uint256(2)),51);
        executor.setKill(true);vm.expectRevert();execute(bytes32(uint256(3)),1);executor.setKill(false);
        executor.revoke(key);vm.expectRevert();execute(bytes32(uint256(3)),1);
        grant();vm.warp(block.timestamp+1 days);vm.expectRevert();execute(bytes32(uint256(3)),1);
    }
    function testRevokeAllStopsEveryKeyImmediately()public{
        address other=address(55);
        address[]memory assets=new address[](2);assets[0]=address(1);assets[1]=address(2);address[]memory venues=new address[](1);venues[0]=router;
        executor.grant(other,address(vault),100,150,uint64(block.timestamp+1 days),3600,assets,venues);
        execute(bytes32(uint256(20)),10);
        vm.prank(other);executor.execute(bytes32(uint256(21)),router,address(1),address(2),10,1);
        executor.revokeAll();
        vm.expectRevert();execute(bytes32(uint256(22)),10);
        vm.prank(other);vm.expectRevert();executor.execute(bytes32(uint256(23)),router,address(1),address(2),10,1);
        vm.prank(key);vm.expectRevert();executor.revokeAll();
        grant();execute(bytes32(uint256(24)),10);
    }
    function testUnauthorizedAssetAndRouter()public{vm.prank(key);vm.expectRevert();executor.execute(bytes32(uint256(1)),address(999),address(1),address(2),1,1);}
    function testFuzzTradeCap(uint128 amount)public{vm.assume(amount>100);vm.expectRevert();execute(bytes32(uint256(9)),amount);}
}
