---
status: PLANNED
last_reviewed: 2026-11-15
---

# Proposal: a separate release gate for paper mode

Status: draft, waiting for sign-off. No gate code changes until this is approved.

## 1. Problem: a circular dependency

The engine applies one release gate to both paper and live mode:

- `crates/replay/src/runtime.rs:366` gates `paper` and `live` together (`if ["paper", "live"].contains(...)`). It requires a `walk_forward_report` in `SIRO_VALIDATION_JOURNAL` (`runtime.rs:378`) whose gate passed every check (`runtime.rs:383`, at least 8 checks).
- `crates/replay/src/validation.rs:155` defines the gate. The binding checks are:
  - `walk_forward` needs at least 12 windows (`validation.rs:168`).
  - `oos_publication` needs every window to have an externally verified out-of-sample lock (`validation.rs:215`).
  - `regimes` needs all five regimes (`validation.rs:156`).
  - `net_sharpe` needs a value above 0.8 (`validation.rs:194`).
  - `deflated_sharpe` needs a probability of at least 0.95 (`validation.rs:186`).
  - `parameter_sensitivity` needs every ±20% perturbation (minimum threshold) to survive at least 0.7 of windows (`validation.rs:176`).
- `services/execution/live.mjs:36` checks the same gate again before any live order.

A window is a training period plus one test month (`validation.rs:12`), so 12 windows need more than 13 months of data. An OOS lock must be anchored before its test window starts, so historical data can never satisfy `oos_publication`. Forward test windows are exactly what paper mode would produce, and paper mode cannot run until the gate passes. The gate therefore waits on evidence that only the gated mode can create.

Robinhood Chain mainnet opened in mid-2026. Under today's rules, the first paper run is about a year away. The first live run comes after that.

## 2. Proposed numbers

| Check | Paper gate (proposed) | Live gate (unchanged) |
|---|---|---|
| Walk-forward windows | at least 3 | at least 12 |
| Regimes observed | minimum 2 of the 5 | all 5 |
| Net Sharpe | minimum above 0.5 | minimum above 0.8 |
| Deflated Sharpe probability | not required | minimum 0.95 |
| Parameter sensitivity, net (±20%) | not required | each perturbation survives minimum 0.7 of windows |
| Drawdown, double slippage | as today | as today |
| OOS locks | required for every forward window | required for every window |

## 3. Paper results count toward live

Each completed paper month, run under an OOS lock anchored before it began, is one forward test window. Those windows are appended to the strategy's validation journal and count toward the 12 windows the live gate needs. Paper becomes the way to earn live, instead of something blocked by it.

## 4. Historical regime data

Five regimes need years of history. The on-chain pools have months. Regime labels for training and validation should therefore come from the underlying stocks' exchange history, for example the Yahoo hourly series that `services/ingest/backfill.mjs` already reads as a secondary source. On-chain bars stay the execution and cost reference.

This depends on the dividend and split work (backlog Task 3). A raw, unadjusted price series shows a false crash at every split and a small drop at every dividend, which would mislabel regimes and distort returns. Historical series must be adjusted with the same factors the on-chain `uiMultiplier` encodes before they are used. The v2 oracle source applies the multiplier on chain. The data pipeline needs the equivalent adjustment.

## 5. What does not change

- The live gate, in full.
- `oos_publication`: every forward test window, paper or live, needs an on-chain lock anchored before the window starts. Historical windows never count as published OOS.
- `live.mjs:36` keeps checking the live gate before every order.
- Vault policy, SessionExecutor caps and timelocks are untouched.

## 6. Risks and mitigations

| Change | Risk | Mitigation |
|---|---|---|
| 3 windows for paper | A weak strategy reaches paper and looks good on a short sample | Paper sends no orders. Every paper figure is labelled PAPER with its date range. The live gate is unchanged. |
| 2 regimes | The strategy has never seen a bear or shock regime | Evidence shows which regimes were observed and which are missing. Live still needs all 5. |
| Sharpe threshold above 0.5 | More noise passes | DSR and sensitivity remain required for live. The paper gate status (pass or fail per check) is shown publicly. |
| Underlying exchange data for regimes | Exchange hours differ from 24/7 token trading; adjustment errors | Adjust for dividends and splits, flag disputed hours (as the backfill already does), and keep on-chain bars for execution. |
| Paper windows count for live | Overfitting across paper months | Each paper window is OOS-locked on chain before it starts, so it cannot be re-run with hindsight. |

## 7. Files touched if approved

| File | Change | Effort |
|---|---|---|
| `crates/replay/src/validation.rs` | Add `gate_paper(&Evidence)` beside `gate` | small |
| `crates/replay/src/runtime.rs` | Choose `gate_paper` when mode is `paper` and `gate` when mode is `live` (around line 366) | small |
| `crates/replay/src/study.rs` | Write both gate results into `walk_forward_report` | small |
| `services/execution/live.mjs` | No change (live gate only); add a test that a paper-only pass is rejected | small |
| `services/ingest/` | Adjusted underlying history for regime labelling | medium |
| `tests/` and `crates/replay/tests` | Gate unit tests for both thresholds; a test that paper never unlocks live | medium |
| `src/app/evidence` | Show paper gate status beside live gate status | small |

Total estimate: about 2–4 working days, including tests and review. The live gate code path is not edited.
