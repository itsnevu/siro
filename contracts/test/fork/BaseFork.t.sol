// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RobinhoodChain} from "../../config/RobinhoodChain.sol";

abstract contract RobinhoodForkTest is Test {
    uint256 internal rhFork;

    IERC20 internal usdg;
    IERC20 internal weth;

    function setUp() public virtual {
        string memory rpcUrl = vm.envString("RH_RPC_URL");
        uint256 pinBlock = vm.envOr("RH_FORK_BLOCK", uint256(0));
        rhFork = pinBlock > 0 ? vm.createFork(rpcUrl, pinBlock) : vm.createFork(rpcUrl);
        vm.selectFork(rhFork);

        usdg = IERC20(RobinhoodChain.USDG);
        weth = IERC20(RobinhoodChain.WETH);
    }

    function _dealUsdg(address to, uint256 amount) internal {
        deal(RobinhoodChain.USDG, to, amount);
    }

    function _dealWeth(address to, uint256 amount) internal {
        deal(RobinhoodChain.WETH, to, amount);
    }
}

contract RobinhoodForkSmokeTest is RobinhoodForkTest {
    function test_forkIsActive() public view {
        assertGt(block.number, 0, "fork not active");
        assertEq(block.chainid, RobinhoodChain.CHAIN_ID, "wrong chain");
    }

    function test_usdgExists() public view {
        assertGt(usdg.totalSupply(), 0, "USDG has no supply");
    }

    function test_wethExists() public view {
        assertGt(weth.totalSupply(), 0, "WETH has no supply");
    }

    function test_dealUsdg() public {
        address alice = makeAddr("alice");
        uint256 amount = 1_000e6;
        _dealUsdg(alice, amount);
        assertEq(usdg.balanceOf(alice), amount);
    }

    function test_dealWeth() public {
        address alice = makeAddr("alice");
        uint256 amount = 10e18;
        _dealWeth(alice, amount);
        assertEq(weth.balanceOf(alice), amount);
    }
}
