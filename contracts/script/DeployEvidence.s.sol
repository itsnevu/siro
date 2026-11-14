// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Script} from "forge-std/Script.sol";
import {Anchor} from "../src/Anchor.sol";
import {SessionExecutor} from "../src/SessionExecutor.sol";
contract DeployEvidence is Script {
    event EvidenceDeployed(address anchor,address sessionExecutor,address anchorOwner,address sessionOwner);
    function run() external returns(Anchor anchor,SessionExecutor executor){
        address anchorOwner=vm.envAddress("SIRO_ANCHOR_OWNER");address sessionOwner=vm.envAddress("SIRO_SESSION_OWNER");
        require(anchorOwner!=address(0)&&sessionOwner!=address(0),"owners required");
        vm.startBroadcast(vm.envUint("SIRO_DEPLOYER_PRIVATE_KEY"));anchor=new Anchor(anchorOwner);executor=new SessionExecutor(sessionOwner);vm.stopBroadcast();
        emit EvidenceDeployed(address(anchor),address(executor),anchorOwner,sessionOwner);
    }
}
