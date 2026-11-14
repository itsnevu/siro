// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Test} from "forge-std/Test.sol";
import {GuardedVault} from "../src/GuardedVault.sol";
import {SessionExecutor} from "../src/SessionExecutor.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockTwapOracle,MockGuardedRouter} from "./GuardedVault.t.sol";
contract SessionVaultIntegrationTest is Test {
    MockERC20 base;MockERC20 stock;MockTwapOracle oracle;MockGuardedRouter router;
    GuardedVault vault;SessionExecutor executor;address key=address(42);
    function setUp()public {
        vm.warp(2 days);base=new MockERC20("Base","BASE",6);stock=new MockERC20("Stock","STOCK",18);
        oracle=new MockTwapOracle(address(base));oracle.setPrice(address(stock),100e6);router=new MockGuardedRouter(oracle);
        vault=new GuardedVault(base,"User Vault","UV",address(this),oracle,0,GuardedVault.Policy(1000,4000,1000,500,0,3600));
        executor=new SessionExecutor(address(this));
        vault.queueExecutorPermission(address(executor),true);vault.activateExecutorPermission(address(executor));
        vault.queueTokenPermission(address(stock),true);vault.activateTokenPermission(address(stock));
        vault.queueRouterPermission(address(router),true);vault.activateRouterPermission(address(router));
        address[]memory tokens=new address[](2);tokens[0]=address(base);tokens[1]=address(stock);address[]memory venues=new address[](1);venues[0]=address(router);
        executor.grant(key,address(vault),100e6,150e6,uint64(block.timestamp+1 days),3600,tokens,venues);
        base.mint(address(this),1000e6);base.approve(address(vault),1000e6);vault.deposit(1000e6,address(this));
    }
    function trade(uint256 id,uint256 amount)internal{vm.prank(key);executor.execute(bytes32(id),address(router),address(base),address(stock),amount,amount*1e12*95/10000);}
    function testRealVaultKeepsCustodyAndKillRollsBackSessionSpend()public{
        trade(1,100e6);assertEq(base.balanceOf(address(vault)),900e6);assertEq(stock.balanceOf(address(vault)),1e18);assertEq(base.balanceOf(address(executor)),0);assertEq(stock.balanceOf(address(executor)),0);
        vault.setKillSwitch(true);vm.expectRevert();trade(2,1e6);assertFalse(executor.executed(bytes32(uint256(2))));assertEq(executor.dailySpent(key,uint64(block.timestamp/1 days)),100e6);
    }
    function testOwnershipTransferInvalidatesOldSessions()public{
        address next=address(999);vault.transferOwnership(next);executor.transferOwnership(next);vm.startPrank(next);vault.acceptOwnership();executor.acceptOwnership();vm.stopPrank();
        vm.expectRevert();trade(1,1e6);
    }
}
