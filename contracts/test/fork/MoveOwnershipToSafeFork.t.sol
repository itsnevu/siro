// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MoveOwnershipToSafe, IOwnable2Step} from "../../script/MoveOwnershipToSafe.s.sol";

interface IAccept { function acceptOwnership() external; }
interface IExec { function owner() external view returns (address); function setKill(bool) external; }

/// Mainnet fork rehearsal of the multisig move: real Safe 1.4.1 factory, real contracts.
/// Run: RH_RPC_URL=<rpc> forge test --match-contract MoveOwnershipToSafeFork -vv
contract MoveOwnershipToSafeFork is Test {
    address constant DEPLOYER = 0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4;

    function test_fullMoveKeepsAgentWiring() public {
        vm.createSelectFork(vm.envString("RH_RPC_URL"));
        MoveOwnershipToSafe s = new MoveOwnershipToSafe();
        address[] memory owners = new address[](3);
        owners[0] = makeAddr("signer1"); owners[1] = makeAddr("signer2"); owners[2] = makeAddr("signer3");
        address safe = s.deploySafe(owners, 2, 99);
        address[6] memory t = s.targets();

        vm.startPrank(DEPLOYER);
        for (uint256 i; i < t.length; ++i) IOwnable2Step(t[i]).transferOwnership(safe);
        vm.stopPrank();
        for (uint256 i; i < t.length; ++i) {
            assertEq(IOwnable2Step(t[i]).owner(), DEPLOYER, "owner must not change before accept");
            assertEq(IOwnable2Step(t[i]).pendingOwner(), safe);
        }

        // Step 2: the Safe accepts (simulated as the Safe executing each call).
        vm.startPrank(safe);
        for (uint256 i; i < t.length; ++i) IAccept(t[i]).acceptOwnership();
        vm.stopPrank();
        for (uint256 i; i < t.length; ++i) assertEq(IOwnable2Step(t[i]).owner(), safe);

        // SessionExecutor only runs vaults whose owner equals its own owner: still true after the move.
        assertEq(IExec(t[0]).owner(), IOwnable2Step(t[5]).owner());
        // The deployer hot key has lost admin rights; the Safe has them.
        vm.prank(DEPLOYER); vm.expectRevert(); IExec(t[0]).setKill(true);
        vm.prank(safe); IExec(t[0]).setKill(false);
    }

    function test_rejectsSingleSignerSafe() public {
        vm.createSelectFork(vm.envString("RH_RPC_URL"));
        MoveOwnershipToSafe s = new MoveOwnershipToSafe();
        address[] memory owners = new address[](1);
        owners[0] = makeAddr("solo");
        vm.expectRevert(bytes("Use at least 2 owners and threshold >= 2"));
        s.deploySafe(owners, 1, 1);
    }
}
