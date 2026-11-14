// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IFactory { function isVault(address) external view returns (bool); }
interface IGuarded { function owner() external view returns (address); function trackedAssetCount() external view returns (uint256); }

/// Read-only pre-flight for funding agent vault #1: simulates a 1 USDG deposit from the deployer
/// on a mainnet fork (the deployer holds no USDG yet, so the fork credits it). Nothing is broadcast.
/// Run: RH_RPC_URL=<rpc> forge test --match-contract VaultDepositPreflight -vv
contract VaultDepositPreflight is Test {
    address constant VAULT = 0xB9db625b97a45BF4741BF62CCfE96765E4d0242A;
    address constant FACTORY = 0x33f420792328958739e4983A9Bac7FB44297Cf91;
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant DEPLOYER = 0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4;

    function setUp() public { vm.createSelectFork(vm.envString("RH_RPC_URL")); }

    function test_preflight() public {
        IERC4626 vault = IERC4626(VAULT);
        console.log("block", block.number);
        console.log("asset", vault.asset());
        console.log("isVault", IFactory(FACTORY).isVault(VAULT));
        console.log("owner", IGuarded(VAULT).owner());
        console.log("trackedAssets", IGuarded(VAULT).trackedAssetCount());
        console.log("totalAssets", vault.totalAssets());
        console.log("totalSupply", vault.totalSupply());
        console.log("maxDeposit(deployer)", vault.maxDeposit(DEPLOYER));
        console.log("previewDeposit(1 USDG)", vault.previewDeposit(1e6));
        assertEq(vault.asset(), USDG);
        assertTrue(IFactory(FACTORY).isVault(VAULT));

        deal(USDG, DEPLOYER, 1e6);
        vm.startPrank(DEPLOYER);
        IERC20(USDG).approve(VAULT, 1e6);
        uint256 shares = vault.deposit(1e6, DEPLOYER);
        vm.stopPrank();
        console.log("simulated deposit 1 USDG -> shares", shares);
        assertGt(shares, 0);
        assertEq(vault.balanceOf(DEPLOYER), shares);
    }
}
