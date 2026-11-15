---
status: LIVE
last_reviewed: 2026-11-15
---

# Ownership map

All privileged roles on Robinhood Chain mainnet (4663), read on chain on 2026-11-15, and the order in which they move to the Safe multisig. Source: `onlyOwner` and similar checks in `contracts/src`. No Safe address is needed to read this document. Step-by-step commands are in `docs/ops/multisig.md`.

Deployer hot key: `0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4`. Anchor hot key: `0xc4822C92707441D1FF50361dDA2593600033B112`.

## Owners today (`owner()` read on chain)

| Contract | Address | Owner | Transfer pattern |
|---|---|---|---|
| SessionExecutor | `0x3933768da40eAd71FCf1104E45483d13112287e8` | deployer | Ownable2Step (transfer, then accept) |
| ChainlinkOracle (v1) | `0x18d197cD6454eF08d80c5FA92209B3aF31926ea9` | deployer | Ownable2Step |
| AgentRegistry | `0x0662564d7Ead0A9eb85E4F17cD21d422d339c459` | deployer | Ownable2Step |
| UniswapV3Adapter | `0x8E662a5D28d089960d601e817aBa430e5981fdd2` | deployer | Ownable2Step |
| SiroZap | `0x6F635334962beadc61c42011B8A892bc23ab7437` | deployer | Ownable2Step |
| GuardedVault agent #1 | `0xB9db625b97a45BF4741BF62CCfE96765E4d0242A` | deployer | Ownable2Step |
| Anchor | `0xbf9f13791c1c5bcd6e342fb500c711e574fb04e0` | anchor hot key | Ownable2Step; stays with the anchor worker |
| GuardedVaultFactory | `0x33f420792328958739e4983A9Bac7FB44297Cf91` | none | No owner; all parameters immutable |

`pendingOwner()` was zero on every contract when this was read.

## Privileged functions held by the owner

| Contract | Function (line) | What it can do |
|---|---|---|
| SessionExecutor | `grant` (32), `revoke` (41), `setKill` (42), `revokeAll` (45) | Create, end and freeze agent session keys |
| ChainlinkOracle | `setFeed` (51), `setSequencerFeed` (58) | Add price feeds (write-once per token) and the sequencer feed (write-once) |
| AgentRegistry | `setFactory` (40), `setCreatorToken` (75); `setAgentStatus` (67) also accepts the owner | Bind the factory once, attach creator tokens, deactivate any agent |
| UniswapV3Adapter | `setRoute` (44) | Add swap routes (write-once per pair) |
| SiroZap | `setWhitelisted` (64) | Change which input tokens the zap accepts |
| GuardedVault #1 | `queuePolicy` (112), `queueTokenPermission` (128), `queueRouterPermission` (129), `queueExecutorPermission` (130), `setKillSwitch` (146) | Queue policy and permission changes (one-day timelock) and pause trading |
| Anchor | `lockStrategy` (17), `anchor` (22) | Publish strategy locks and daily decision roots |

## Roles that are not owner

| Role | Where | Holder | Moves to Safe? |
|---|---|---|---|
| Registry factory | `AgentRegistry.factory` (only it may `registerAgent`, line 47) | GuardedVaultFactory | No; set once and immutable |
| Agent creator | `AgentRegistry` `updateAgent` (60), `setAgentStatus` (70) | Vault creator (deployer for agent #1) | Follows the creator wallet, not ownership |
| Vault executor | `GuardedVault.executors` (`onlyExecutor`, line 82) | SessionExecutor, once its permission is activated | No; it is a contract |
| Session key | `SessionExecutor.sessions` | Executor hot wallet `0x17317456d7B8de21423114EF5786957BA8BCD8cA` | No; re-granted by the Safe after the move |
| Permission activation | `activate*Permission` on the vault | Anyone, after the timelock | Not a role |

## Transfer order

1. Create the Safe with at least 2 owners and a threshold of at least 2.
2. Deployer calls `transferOwnership(safe)` on SessionExecutor, ChainlinkOracle, AgentRegistry, UniswapV3Adapter, SiroZap and GuardedVault #1. Ownership does not change yet; `pendingOwner` becomes the Safe.
3. One Safe batch calls `acceptOwnership()` on all six (`docs/ops/safe-accept-ownership.json`).
4. Read back `owner()` on all six.

**SessionExecutor and the vault must be accepted in the same batch.** `SessionExecutor.execute` reverts unless `vault.owner() == owner()`. If only one of the two moves, agent trading stops until the other one moves.

Between steps 2 and 3, the deployer is still the owner and can cancel by calling `transferOwnership` again. Once step 3 runs, only the Safe can act.

After the move:
- Session keys granted by the deployer stop working, because `sessionEpoch` changes with the owner (`SessionExecutor._transferOwnership` increments `ownerEpoch`). The Safe re-grants the executor session.
- Anchor stays with the anchor hot key, because the worker signs daily. To move it as well, the worker would have to propose roots through the Safe.

Not verified here: the creator of future vaults, because that is whoever calls `createAgent`.
