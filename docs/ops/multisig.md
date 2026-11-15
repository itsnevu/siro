---
status: PLANNED
last_reviewed: 2026-11-15
---

# Move ownership to a Safe multisig

Every contract below is currently owned by the deployer hot key `0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4`. All of them use Ownable2Step, so ownership changes only when the new owner accepts it.

| Contract | Address |
|---|---|
| SessionExecutor | `0x3933768da40eAd71FCf1104E45483d13112287e8` |
| ChainlinkOracle | `0x18d197cD6454eF08d80c5FA92209B3aF31926ea9` |
| AgentRegistry | `0x0662564d7Ead0A9eb85E4F17cD21d422d339c459` |
| UniswapV3Adapter | `0x8E662a5D28d089960d601e817aBa430e5981fdd2` |
| SiroZap | `0x6F635334962beadc61c42011B8A892bc23ab7437` |
| GuardedVault agent #1 | `0xB9db625b97a45BF4741BF62CCfE96765E4d0242A` |

Anchor is owned by the anchor hot key on purpose, because the anchor worker signs daily roots. GuardedVaultFactory has no owner.

## Decisions needed before running

1. **Signers:** at least two addresses, each held by a different person or device. Prefer hardware wallets.
2. **Threshold:** at least 2. The script refuses to run otherwise.

## Steps

1. Rehearse on a fork with `RH_RPC_URL=… forge test --match-contract MoveOwnershipToSafeFork -vv`. This creates a Safe, transfers, accepts, checks the agent wiring, and checks that the deployer loses admin rights.
2. Run step 1 on mainnet: `SAFE_OWNERS=a,b,c SAFE_THRESHOLD=2 ALLOW_MAINNET_DEPLOY=true forge script script/MoveOwnershipToSafe.s.sol --rpc-url $RH_RPC_URL`. Do a dry run first, then run it again with `--broadcast`. Gas only.
3. In the Safe app, run Transaction Builder and load `docs/ops/safe-accept-ownership.json`. Signers approve the batch and one of them executes it.
4. Read back `owner()` on every contract. Each one must return the Safe address.

SessionExecutor only runs vaults whose owner equals its own owner, so the vault and the executor move in the same batch. Session grants and revocations then need Safe signatures.
