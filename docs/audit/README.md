---
status: TESTING
last_reviewed: 2026-11-15
---

# Siro audit package

This package covers the contracts that hold or move user funds on Robinhood Chain mainnet (chain ID 4663). Scope is frozen at the commit that tags this document. Changes after that commit are out of scope unless the scope is re-frozen.

## Scope

| Contract | File | nSLOC | Deployed | Role |
|---|---|---|---|---|
| GuardedVault | `contracts/src/GuardedVault.sol` | 215 | per agent (agent #1 `0xB9db625b97a45BF4741BF62CCfE96765E4d0242A`) | ERC-4626 vault: policy, one-day timelocked permissions, trading through allowed routers only |
| GuardedVaultFactory | `contracts/src/GuardedVaultFactory.sol` | 34 | `0x33f420792328958739e4983A9Bac7FB44297Cf91` | Creates vaults and registers them |
| SessionExecutor | `contracts/src/SessionExecutor.sol` | 53 | `0x3933768da40ead71fcf1104e45483d13112287e8` | Scoped session keys: per-trade and daily caps, expiry, token and router allowlists, revoke-all |
| SiroZap | `contracts/src/SiroZap.sol` | 110 | `0x6F635334962beadc61c42011B8A892bc23ab7437` | User swap into the vault asset and deposit, in one transaction |
| ChainlinkOracle | `contracts/src/ChainlinkOracle.sol` | 75 | `0x18d197cD6454eF08d80c5FA92209B3aF31926ea9` (v1) | Chainlink USD feeds, write-once; v2 source adds the stock `uiMultiplier` |
| UniswapV3Adapter | `contracts/src/UniswapV3Adapter.sol` | 66 | `0x8E662a5D28d089960d601e817aBa430e5981fdd2` | Write-once Uniswap v3 routes used by vaults |
| AgentRegistry | `contracts/src/AgentRegistry.sol` | 72 | `0x0662564d7Ead0A9eb85E4F17cD21d422d339c459` | Agent records and policy hashes |
| Anchor | `contracts/src/Anchor.sol` | 41 | `0xbf9f13791c1c5bcd6e342fb500c711e574fb04e0` | Daily decision roots and strategy locks; holds no funds |

The minimum scope is GuardedVault, SessionExecutor and SiroZap (378 nSLOC). The full table is 666 nSLOC.

Out of scope: `SiroCopyVault`, `SiroRiskGuard` and `SiroLeaderboard`. These are legacy contracts with known unsafe behaviour, they are never deployed, and their issues are reproduced in `contracts/test/ReadinessAudit.t.sol`. Also out of scope: the Uniswap v3 and Chainlink contracts themselves.

## Architecture

```
user ──deposit/withdraw──► GuardedVault (ERC-4626, asset USDG) ◄──creates── GuardedVaultFactory ──► AgentRegistry
user ──ETH/WETH──► SiroZap ──SwapRouter02──► USDG ──deposit──► GuardedVault
engine hot key ──execute(decisionId)──► SessionExecutor ──executeTrade──► GuardedVault ──swap──► UniswapV3Adapter ──► Uniswap v3 pool
GuardedVault ──quote──► ChainlinkOracle ──► Chainlink feeds (+ Robinhood oraclePaused / uiMultiplier)
anchor hot key ──anchor(day, root)──► Anchor
```

## Trust assumptions

1. Every owner is currently the deployer hot key `0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4`. The exception is Anchor, which is owned by the anchor hot key. Ownership is scheduled to move to a Safe multisig, which is backlog task 1.
2. Chainlink feeds are correct within their heartbeat. Robinhood sets `oraclePaused()` during corporate actions.
3. Robinhood Chain has no sequencer uptime feed yet. `setSequencerFeed` is write-once and is wired when Chainlink publishes the feed.
4. The vault asset (USDG) is a standard 6-decimal ERC-20 with no transfer fees.
5. Policy changes and permission grants wait `policyDelay` (one day) before they take effect.

## Threat model

| Actor | Goal | Main control | Where to look |
|---|---|---|---|
| Compromised engine hot key | Drain a vault through trades | SessionExecutor caps; vault policy (`maxTradeBps`, `maxAllocationBps`, `maxDailyLossBps`, `maxSlippageBps`, cooldown); allowlisted routers and tokens; revoke-all; kill switch | `SessionExecutor.execute`, `GuardedVault.executeTrade` |
| Compromised owner key | Change policy or permissions to extract funds | One-day timelock gives depositors time to exit (`redeem`, `redeemInKind`) | `queue*` / `activate*` |
| Oracle manipulation or staleness | Mint cheap shares or exit at a stale price | Chainlink-only prices; `maxOracleDelay`; `_requireFreshHoldings` on deposit and withdraw; `redeemInKind` exits without an oracle | `ChainlinkOracle`, `GuardedVault._freshQuote` |
| MEV / sandwich on zap or trades | Extract slippage | `minOut` and `minSharesOut` on the zap; vault `maxSlippageBps` against the oracle quote | `SiroZap.swapAndDeposit`, `executeTrade` |
| First depositor / donation | Inflate the share price | `_decimalsOffset = 6` virtual shares | `GuardedVault` |
| Reentrancy via tokens or router | Re-enter during a half-converted state | `nonReentrant` on deposit, withdraw and trade; balance-delta accounting in the zap | all |
| Malicious token in the zap | Steal approvals or leftovers | Input whitelist (owner); zap holds no balance between calls | `SiroZap` |

Questions for auditors:
- Can rounding in `withdraw` and `redeem` leave share dust that is impossible to redeem?
- Is `_requireFreshHoldings` complete for every path that reads the share price?
- Can a session key bypass the daily cap across a day boundary?

## Reproducible build

```
git clone https://github.com/itsnevu/siro && cd siro && git checkout <frozen commit>
cd contracts && forge build                                   # solc 0.8.28, optimizer on, 200 runs
forge test --no-match-path 'test/fork/*'                      # 154 tests, no network
RH_RPC_URL=<archive RPC> forge test --match-path 'test/fork/*' # mainnet fork tests
```

Deployed bytecode can be checked against source. SiroZap is verified on Sourcify with a full match.

## Platform options

These are estimates to start a conversation, not quotes. Ask each platform for a written quote against the nSLOC above.

| Option | Typical shape | Duration | Notes |
|---|---|---|---|
| Audit competition (Code4rena, Sherlock, Cantina) | Prize pool, many wardens | 1–2 weeks contest plus judging | Wide coverage; findings are public after the contest |
| Private audit firm (solo or small team) | Fixed fee | 1–2 weeks for this size | Deeper on the core contracts; a named firm in the report |
| Bug bounty (Immunefi) | Rewards scaled to funds at risk | Ongoing | Complements an audit, does not replace one; run it after the fixes |

Suggested order: a private audit of the minimum scope, fixes, then a bug bounty while TVL is small.
