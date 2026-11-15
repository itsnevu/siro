---
status: PLANNED
last_reviewed: 2026-11-15
---

# Spec: usage-based rewards (Vault V2)

Goal: the more Siro is used, the more its users and strategy creators earn. Rewards are paid from real protocol fees, never from new token emissions. This is the next goal after agent trading runs end to end. Nothing here is built yet.

Rewards are fee rebates for using the product. They are not yield for holding deposits or tokens. Get a legal review before announcing anything.

## Where the money comes from

GuardedVaultV2 charges a performance fee on new profit only. A high-water mark (HWM) per vault means no fee is taken while the vault is still recovering a loss.

```
on each fee checkpoint (daily, and on withdraw):
  pps = totalAssets / totalSupply            (price per share)
  if pps > hwm:
      profit = (pps - hwm) * totalSupply
      fee    = profit * performanceFeeBps / 10_000
      mint fee shares to FeeSplitter (dilution, no asset transfer)
      hwm    = pps after fee
```

Taking the fee as minted shares keeps the vault fully invested and avoids selling stock tokens to pay it.

Example parameters, for discussion only:
- performance fee: contoh 15% of new profit
- creator share of the fee: contoh two thirds
- protocol share of the fee: contoh one third

`FeeSplitter.sol` (in the repo, not deployed) already encodes a creator/protocol split and `claimable` balances. V2 points to it.

## Rebate pool

Part of the protocol share goes to a rebate pool in USDG. Each weekly epoch:

1. The engine reads its journals and computes usage per wallet: zap deposit volume, vault days held, and strategies followed.
2. It builds a Merkle tree of `(wallet, amount)` with the same SHA-256 ordered tree that Anchor already uses, and anchors the root on chain.
3. A `RebateDistributor` contract stores the root per epoch. Users claim with a proof. Unclaimed amounts roll into the next epoch after a deadline.

Tiers scale the rebate with usage. The thresholds are examples:

| Tier | Monthly zap volume (contoh) | Rebate (contoh) |
|---|---|---|
| Base | below contoh 1,000 USDG | none |
| Active | contoh 1,000 USDG and up | contoh 10% of gross fees paid |
| Power | contoh 10,000 USDG and up | contoh 25% of gross fees paid |

## Creator earnings

A strategy creator earns the creator share of fees from every vault that follows their strategy. More followers and better net results mean more earnings. `AgentRegistry.creatorFeeBps` (deployed, capped at contoh 10%) already records each creator's rate.

## Contracts

| Contract | New or existing | Notes |
|---|---|---|
| GuardedVaultV2 | new | V1 plus HWM fee checkpoint; same policy, timelock and oracle checks; fee shares minted to FeeSplitter |
| GuardedVaultFactoryV2 | new | Deploys V2 vaults; deployed V1 vaults stay fee-free forever |
| FeeSplitter | existing source, deploy | Creator and protocol split; protocol share forwards part to the rebate pool |
| RebateDistributor | new | Merkle root per epoch, `claim(epoch, amount, proof)`, deadline and rollover |
| ChainlinkOracle v2 | existing source | Already includes the stock `uiMultiplier` fix |

## App

- **Rewards page:** your tier, your volume this month, claimable rebates per epoch, a Claim button, and your claim history.
- **Creator page:** followers, fees earned, and claimable creator balance.
- **Evidence:** total fees taken, rebates paid, and the epoch roots, each with its date range.
- **Before deposit:** the vault page shows the fee clearly on V2 vaults.

## Tests required before deploy

- HWM: no fee while recovering, fee only on new highs, correct after deposits and withdrawals mid-period.
- Fee shares never exceed profit; rounding never favours the fee recipient.
- Merkle: a valid claim pays once; double claims and wrong proofs revert; rollover after the deadline.
- Fork test: a V2 vault on mainnet with real USDG and the v2 oracle.
- An audit of V2, FeeSplitter and RebateDistributor (see `docs/audit/README.md`).

## Open decisions

1. Fee level and split (the numbers above are examples).
2. Tier thresholds and rebate rates.
3. Epoch length (weekly is proposed).
4. Who signs the epoch roots: the anchor key, or the Safe.
5. Legal review outcome and the public wording.
