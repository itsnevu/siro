// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";

interface IGuardedVaultPermissions {
    function pendingTokenPermission(address) external view returns (bool allowed, uint64 validAfter, bool exists);
    function pendingRouterPermission(address) external view returns (bool allowed, uint64 validAfter, bool exists);
    function pendingExecutorPermission(address) external view returns (bool allowed, uint64 validAfter, bool exists);
    function activateTokenPermission(address token) external;
    function activateRouterPermission(address router) external;
    function activateExecutorPermission(address executor) external;
    function allowedTokens(address) external view returns (bool);
    function allowedRouters(address) external view returns (bool);
    function executors(address) external view returns (bool);
}

/// Activates the queued token, router and executor permissions of a vault once the one-day timelock
/// has passed. Activation is permissionless and moves no funds (gas only). Refuses to run early.
/// Env: SIRO_VAULT, SIRO_ADAPTER, SIRO_SESSION_EXECUTOR, SIRO_TOKENS (comma list incl. USDG)
contract ActivatePermissions is Script {
    function run() external {
        require(block.chainid == 4663, "Unsupported chain");
        IGuardedVaultPermissions v = IGuardedVaultPermissions(vm.envAddress("SIRO_VAULT"));
        address router = vm.envAddress("SIRO_ADAPTER");
        address executor = vm.envAddress("SIRO_SESSION_EXECUTOR");
        address[] memory tokens = vm.envAddress("SIRO_TOKENS", ",");

        uint64 latest;
        for (uint256 i; i < tokens.length; ++i) { (,uint64 t, bool e) = v.pendingTokenPermission(tokens[i]); if (e && t > latest) latest = t; }
        { (,uint64 t, bool e) = v.pendingRouterPermission(router); if (e && t > latest) latest = t; }
        { (,uint64 t, bool e) = v.pendingExecutorPermission(executor); if (e && t > latest) latest = t; }
        console.log("now", block.timestamp);
        console.log("timelock ends", latest);
        require(block.timestamp >= latest, "Timelock still active");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        for (uint256 i; i < tokens.length; ++i) { (,, bool e) = v.pendingTokenPermission(tokens[i]); if (e) v.activateTokenPermission(tokens[i]); }
        { (,, bool e) = v.pendingRouterPermission(router); if (e) v.activateRouterPermission(router); }
        { (,, bool e) = v.pendingExecutorPermission(executor); if (e) v.activateExecutorPermission(executor); }
        vm.stopBroadcast();

        for (uint256 i; i < tokens.length; ++i) require(v.allowedTokens(tokens[i]), "token not active");
        require(v.allowedRouters(router), "router not active");
        require(v.executors(executor), "executor not active");
        console.log("all permissions active");
    }
}
