# Funding log: agent vault #1, tranche 1

- **Date (block time):** 2026-11-14 21:59:25 UTC (blocks 114479280 to 114479289)
- **Chain:** Robinhood Chain mainnet (4663)
- **Vault:** `0xB9db625b97a45BF4741BF62CCfE96765E4d0242A` (agent #1, asset USDG)
- **Funder and share receiver:** deployer `0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4`, which is also the vault owner and the SessionExecutor owner
- **Script:** `contracts/script/FundVault.s.sol` with `FUND_ETH_WEI=20000000000000000` and the defaults: 0.5% slippage, 0.01 ETH reserve, 25–50 USDG deposit range
- **Approved budget:** 0.02 ETH for this step (Step C). The C+D ceiling is 0.03 ETH.

## Pre-flight (read-only)

| Check | Result |
|---|---|
| Fork simulation: 1 USDG deposit from the deployer (`test/fork/VaultDepositPreflight.t.sol`) | passed, 1e12 shares |
| `vault.asset()` | USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| `factory.isVault(vault)` | true |
| Minimum deposit or shares | none; `maxDeposit` = uint256 max |
| Pending permission timelock | does not block deposits |

## Execution

| Step | Tx | Gas | Status |
|---|---|---|---|
| Swap 0.02 ETH to USDG via SwapRouter02 `multicall(deadline = now+60s)`, WETH/USDG fee tier 0.01% (pool `0x52e65B17…71Ca`) | `0x338ec1a749be2ca78af4d43c19fec6b258ffec04e38465830b993a29308bd74b` | 157,946 | success |
| Approve USDG to the vault | `0x8184e9e05be11cbc546605dfe0d4aa74c9647f0c87314997f05de74f08a37369` | 57,988 | success |
| Deposit into the vault | `0x1f5fb59050cbda828389b0e20b9e8dea4ee3904c8dc001fcb6d92a6240fd4ee9` | 129,269 | success |

Total gas cost: **0.000006974 ETH**.

## Numbers

| Item | Value |
|---|---|
| Quote at broadcast (best tier 0.01%) | 35.421552 USDG |
| Quotes at 0.05% / 0.30% | 35.406393 / 35.315649 USDG |
| minOut on chain (quote − 0.5%) | 35.244444 USDG |
| **Actual USDG received** (Transfer pool → deployer) | **35.426113 USDG** |
| **Fill vs quote** | **+0.0129%** (better than quote; well within the 1% limit) |
| **Deposited** (fixed at minOut) | **35.244444 USDG** |
| **Shares received** | **35,244,444,000,000** (vault `_decimalsOffset` = 6) |
| USDG left on the deployer (fill above minOut) | 0.181669 USDG |
| Vault `totalAssets()` after | 35.244444 USDG |
| Deployer ETH before / after | 0.063435471 / **0.043428497 ETH** (reserve floor 0.01 ETH) |

The dry run shown for approval, a few minutes earlier, quoted 35.467386 USDG. The script re-quotes at broadcast, so the on-chain minOut was set from the fresher 35.421552 quote.

## Step D: SiroZap smoke test

- **Tx:** `0x163f46808b368575bee28486f30b71a3bbe483a43bb587e2951ab5241b154c2f` (block 114481077), status success
- **Call:** `SiroZap(0x6F63…7437).swapAndDeposit(vault #1, native ETH, 0.002 ETH, fee 100, minOut 3.518482, minSharesOut 3,518,482,000,000, deadline now+60s, receiver deployer)`, with `msg.value` exactly 0.002 ETH
- **Pre-send checks:** `eth_call` simulation returned 3,535,651,000,000 shares; `estimateGas` returned 316,593

| Item | Value |
|---|---|
| Quotes at 0.01% / 0.05% / 0.30% | 3.536163 / 3.534336 / 3.525962 USDG (best: 0.01%) |
| minOut (quote − 0.5%) | 3.518482 USDG |
| **Fill** (pool → zap) | **3.535866 USDG**, which is **−0.0084%** vs quote |
| Deposited (zap → vault) | 3.535866 USDG (the full fill) |
| **Shares minted to the receiver** | **3,535,866,000,000** (deployer shares: 35,244,444,000,000 → 38,780,310,000,000) |
| Gas | 250,170 (≈ 0.000005067 ETH) |
| Zap leftovers after the tx | ETH 0, WETH 0, USDG 0; USDG→vault allowance 0; WETH→router allowance 0 |
| Vault `totalAssets()` after | 38.780310 USDG |
| Deployer ETH after | 0.041423430 ETH |

Total spent in Steps C and D: 0.022 ETH in swaps plus ≈ 0.000012 ETH in gas. The budget ceiling was 0.03 ETH.
