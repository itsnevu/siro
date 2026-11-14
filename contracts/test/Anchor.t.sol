// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Test} from "forge-std/Test.sol";
import {Anchor} from "../src/Anchor.sol";
contract AnchorTest is Test {
    function testAppendOnlyAndTamper() public {
        vm.warp(3 days);
        Anchor a = new Anchor(address(this));
        bytes32 l = sha256("decision-a"); bytes32 r = sha256("decision-b");
        a.anchor(1,sha256(abi.encodePacked(l,r)));
        bytes32[] memory siblings = new bytes32[](1); siblings[0]=r;
        bool[] memory left = new bool[](1);
        assertTrue(a.verify(1,l,siblings,left));
        assertFalse(a.verify(1,sha256("tampered"),siblings,left));
        vm.expectRevert(); a.anchor(1,l);
        vm.prank(address(99)); vm.expectRevert(); a.anchor(2,l);
    }
    function testWitnessIsFirstTimestampOnlyAndPermissionless() public {
        vm.warp(1_000);
        Anchor a = new Anchor(address(this));
        bytes32 l = sha256("commit-a"); bytes32 r = sha256("commit-b");
        bytes32 root = sha256(abi.encodePacked(l,r));
        vm.prank(address(77)); a.witness(root);
        assertEq(a.witnessedAt(root), 1_000);
        vm.warp(5_000); vm.expectRevert(); a.witness(root);
        assertEq(a.witnessedAt(root), 1_000);
        vm.expectRevert(); a.witness(bytes32(0));
        bytes32[] memory siblings = new bytes32[](1); siblings[0]=r;
        bool[] memory left = new bool[](1);
        assertEq(a.verifyWitness(root,l,siblings,left), 1_000);
        assertEq(a.verifyWitness(root,sha256("late"),siblings,left), 0);
        assertEq(a.verifyWitness(sha256("unwitnessed"),l,siblings,left), 0);
    }
}
