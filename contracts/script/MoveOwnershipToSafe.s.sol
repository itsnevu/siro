// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";

interface ISafeProxyFactory { function createProxyWithNonce(address singleton, bytes memory initializer, uint256 saltNonce) external returns (address); }
interface ISafe { function setup(address[] calldata owners, uint256 threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external; function getOwners() external view returns (address[] memory); function getThreshold() external view returns (uint256); }
interface IOwnable2Step { function owner() external view returns (address); function pendingOwner() external view returns (address); function transferOwnership(address) external; }

/// Step 1 of moving every deployer-owned contract to a Safe multisig (Safe 1.4.1, canonical addresses).
/// Creates the Safe from SAFE_OWNERS / SAFE_THRESHOLD (or reuses SAFE_ADDRESS), then calls
/// transferOwnership(safe) on each contract. Ownership only moves when the Safe executes
/// acceptOwnership() on each one (step 2, a Safe Transaction Builder batch).
/// Vault and SessionExecutor must move together: SessionExecutor requires vault.owner() == its owner.
contract MoveOwnershipToSafe is Script {
    address constant SAFE_L2 = 0x29fcB43b46531BcA003ddC8FCB67FFE91900C762;
    address constant FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;
    address constant FALLBACK = 0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99;

    function targets() public pure returns (address[6] memory t) {
        t[0] = 0x3933768da40eAd71FCf1104E45483d13112287e8; // SessionExecutor
        t[1] = 0x18d197cD6454eF08d80c5FA92209B3aF31926ea9; // ChainlinkOracle
        t[2] = 0x0662564d7Ead0A9eb85E4F17cD21d422d339c459; // AgentRegistry
        t[3] = 0x8E662a5D28d089960d601e817aBa430e5981fdd2; // UniswapV3Adapter
        t[4] = 0x6F635334962beadc61c42011B8A892bc23ab7437; // SiroZap
        t[5] = 0xB9db625b97a45BF4741BF62CCfE96765E4d0242A; // GuardedVault agent #1
    }

    function deploySafe(address[] memory owners, uint256 threshold, uint256 salt) public returns (address safe) {
        require(owners.length >= 2 && threshold >= 2 && threshold <= owners.length, "Use at least 2 owners and threshold >= 2");
        bytes memory init = abi.encodeCall(ISafe.setup, (owners, threshold, address(0), "", FALLBACK, address(0), 0, payable(address(0))));
        safe = ISafeProxyFactory(FACTORY).createProxyWithNonce(SAFE_L2, init, salt);
    }

    function run() external {
        require(block.chainid == 4663, "Unsupported chain");
        require(vm.envOr("ALLOW_MAINNET_DEPLOY", false), "Mainnet requires explicit opt-in");
        uint256 key = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(key);
        address[6] memory t = targets();
        for (uint256 i; i < t.length; ++i) require(IOwnable2Step(t[i]).owner() == deployer, "Deployer is not the owner of every target");

        vm.startBroadcast(key);
        address safe = vm.envOr("SAFE_ADDRESS", address(0));
        if (safe == address(0)) safe = deploySafe(vm.envAddress("SAFE_OWNERS", ","), vm.envUint("SAFE_THRESHOLD"), vm.envOr("SAFE_SALT", uint256(4663)));
        require(ISafe(safe).getThreshold() >= 2, "Safe threshold must be at least 2");
        for (uint256 i; i < t.length; ++i) IOwnable2Step(t[i]).transferOwnership(safe);
        vm.stopBroadcast();

        console.log("Safe", safe);
        console.log("threshold", ISafe(safe).getThreshold());
        for (uint256 i; i < t.length; ++i) console.log("pending owner set on", t[i]);
        console.log("Next: execute acceptOwnership() on every target from the Safe (one batch).");
    }
}
