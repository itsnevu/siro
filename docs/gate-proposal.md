---
status: PLANNED
last_reviewed: 2026-11-15
---

# Proposal: a separate release gate for paper mode

Status: draft, revision 2, waiting for review. No gate code changes until this is approved.

## 1. Problem: a circular dependency

The engine applies one release gate to both paper and live mode. Each reference below quotes the code exactly; every line number was rechecked on 2026-11-15 and none had shifted.

`crates/replay/src/runtime.rs:366-368`
```
    let release_gate = if ["paper", "live"].contains(&c.mode.as_str()) {
        let path = PathBuf::from(std::env::var("SIRO_VALIDATION_JOURNAL")?);
        let history = ledger::read_events(&path)?;
```
Role: paper and live share the same gate; a paper run cannot start without validation evidence.

`crates/replay/src/runtime.rs:376-378`
```
                        && e.payload["agent_id"] == leg.strategy.agent_id
                })
                .ok_or("walk-forward release evidence missing")?;
```
Role: with no `walk_forward_report` for the leg, the run fails. This is the error the paper job hit on 2026-11-15.

`crates/replay/src/runtime.rs:380-384`
```
                || !report.payload["gate"]["checks"]
                    .as_array()
                    .is_some_and(|checks| {
                        checks.len() >= 8 && checks.iter().all(|c| c["passed"] == true)
                    })
```
Role: every check (at least 8) must pass. There is no partial pass for paper.

`crates/replay/src/validation.rs:155-157`
```
pub fn gate(e: &Evidence) -> Gate {
    let required = ["bull", "bear", "long_chop", "vol_shock", "gap_news"];
    let checks = vec![
```
Role: one gate function with all five regimes required.

`crates/replay/src/validation.rs:166-169`
```
        Check {
            name: "walk_forward".into(),
            passed: e.windows >= 12,
            detail: format!("{} windows; minimum 12", e.windows),
```
Role: at least 12 windows. A window is training months plus one test month (`validation.rs:18-27`), so more than 13 months of data.

`crates/replay/src/validation.rs:184-187`
```
                && e.independent_trials <= e.trials
                && e.dsr_probability
                    .is_some_and(|p| p.is_finite() && (0.95..=1.).contains(&p)),
            detail: format!(
```
Role: deflated Sharpe probability of at least 0.95.

`crates/replay/src/validation.rs:193-195`
```
            name: "net_sharpe".into(),
            passed: e.net_sharpe.is_some_and(|s| s.is_finite() && s > 0.8),
            detail: format!("net Sharpe {:?}; must exceed .8", e.net_sharpe),
```
Role: net Sharpe above 0.8.

`crates/replay/src/validation.rs:213-216`
```
        Check {
            name: "oos_publication".into(),
            passed: e.windows >= 12 && e.externally_verified_oos_locks == e.windows,
            detail: format!(
```
Role: every window needs an externally verified out-of-sample lock. `study.rs:179` marks a lock published after its test window started as `"historical"`, and `verify_lock` (`study.rs:172`) does not count such a lock. Historical data can therefore never satisfy this check.

`services/execution/live.mjs:36`
```
if(!validation?.gate?.passed||!validation.windows.some(w=>w.strategy_hash===decision.strategy_hash))throw new Error("Frozen strategy did not pass the complete release gate");
```
Role: an independent second check before any live order.

Conclusion: forward, OOS-locked test windows are exactly what paper mode would produce. Paper cannot run until the gate passes. The gate waits on evidence that only the gated mode can create.

## 2. Required answer: can the 3 paper windows come from historical data?

**Answer: yes for the paper gate, no for the live gate.** Historical windows may open the paper gate. They are recorded with `"historical": true` and never count toward the 12 live windows. Only forward windows, locked on chain before they start, count toward live.

Data availability on chain (checked 2026-11-15 with `eth_getCode` at sampled blocks): the AAPL/USDG pool did not exist at block 20,000,000 (2026-07-26) and did exist at block 40,000,000 (2026-08-18). The NVDA/USDG pool appeared between 2026-07-08 and 2026-07-26. The exact creation blocks are BELUM_VERIFIKASI; only these brackets were sampled.

| Choice | When paper can start | If the choice is wrong |
|---|---|---|
| **A. Historical windows allowed (on-chain data only, 1 training month)** | On-chain data starts about 2026-08-18 for the latest leg. Three windows of one training month and one test month need data to about 2026-12-18. Paper earliest about **2026-12-18**, after the backfill is finished. | Strategies tuned on a short history reach paper. Cost: misleading paper numbers, no money at risk, possible loss of trust. Live is unaffected. |
| **B. Historical windows allowed, training on underlying exchange history (adjusted)** | Training data is not the bottleneck. Test windows still use on-chain bars: 3 test months from about 2026-08-18 end about **2026-11-18**. Paper earliest about late **2026-11**, after the adjusted-history work (section 5) is done. | Same as A, plus a risk of mislabelled regimes if dividend or split adjustment is wrong. |
| **C. Forward windows only** | The first window can start the first month after a lock is anchored (2026-12-01 at the earliest). Three test months end about **2027-03-01**. | Paper waits about 3 more months with nothing to show on Evidence beyond backtests. No money risk. |

Recommendation: **B**, with A as the fallback if the adjusted-history work slips. Live keeps requiring forward, locked windows in every case.

## 3. Proposed numbers

| Check | Paper gate (proposed) | Live gate (unchanged) |
|---|---|---|
| Walk-forward windows | at least 3, historical allowed | at least 12, forward and locked |
| Regimes observed | minimum 2 of the 5 | all 5 |
| Net Sharpe | minimum above 0.5 | minimum above 0.8 |
| Deflated Sharpe probability | not required | minimum 0.95 |
| Parameter sensitivity, net (±20%) | not required | each perturbation survives minimum 0.7 of windows |
| Drawdown, double slippage | as today | as today |
| OOS locks | required for every forward window | required for every window |

## 4. Paper results count toward live

Each completed paper month that ran under a lock anchored before it began is one forward test window. It is appended to the validation journal and counts toward the 12 live windows. Historical windows used for the paper gate do not count.

## 5. Historical regime data and dividend/split adjustment

Five regimes need years of history, and the pools have months. Regime labels and training data should come from the underlying stocks' exchange history (for example, the Yahoo series that `services/ingest/backfill.mjs` already reads as a secondary source). That history must be adjusted for dividends and splits, which is the same correction as Task 3. Unadjusted series show false crashes at splits and small drops at dividends, so they mislabel regimes and distort returns. On-chain bars stay the execution and cost reference.

## 6. What does not change

- The live gate, in full, including `live.mjs:36`.
- `oos_publication` for every forward window.
- Vault policy, SessionExecutor caps and timelocks.

## 7. Risks

| Risk | Likelihood | Impact | Mitigation | Detection if it happens |
|---|---|---|---|---|
| A weak strategy passes the paper gate on a short sample | High | Low: no money moves; misleading paper figures | PAPER label and date range on every figure; live gate unchanged | Paper net results fall below the gate's backtest expectation for 2 consecutive months; the daily recon job flags it on Evidence |
| Only 2 regimes seen; first bear or shock month breaks the strategy | Medium | Low in paper, high if it ever reached live | Evidence lists observed and missing regimes; live needs all 5 | Regime tagger records a new regime; paper drawdown passes the gate's drawdown limit; alert fires |
| Net Sharpe threshold above 0.5 lets noise through | Medium | Low | DSR and sensitivity still required for live; paper gate status shown per check | Out-of-sample paper Sharpe compared each month with the in-sample figure; a gap larger than the bootstrap interval is flagged |
| Wrong dividend or split adjustment in underlying history | Medium | Medium: regimes and returns wrong | Same multiplier source as the on-chain token (`uiMultiplier`); unit tests on known splits | Daily comparison of adjusted underlying close against the on-chain Chainlink price; deviations beyond the disputed-hour limit raise an alert |
| Paper windows overfit across months | Low | Medium | Every forward window is OOS-locked on chain before it starts | `oos_lock` entries without an on-chain proof are visible; `oos_publication` fails |
| Someone wires the paper gate into the live path | Low | High | Separate function names; a test that a paper-only pass is rejected by `live.mjs` | That test runs in CI on every push; a red check blocks merge |

## 8. Failure scenario: a strategy passes paper and is bad

1. It passes the paper gate with 3 windows, 2 regimes and net Sharpe above 0.5.
2. Paper runs with real prices and fees and no orders. Each month is locked and appended.
3. It cannot trade live until it has 12 locked forward windows, all 5 regimes, net Sharpe above 0.8, DSR of at least 0.95, sensitivity survival, and drawdown within limits. `live.mjs:36` checks this again before every order.
4. How we know it is bad: monthly paper results versus expectation (section 7), drawdown alerts, and the public per-check gate status on Evidence.
5. Where it stops: at the latest at the live gate. In practice earlier: a strategy whose paper months fail stays below the live thresholds and never accumulates a passing report.

The worst case of this proposal is a year of disappointing paper results, not a live loss.

## 9. Rollback

- The paper gate is a separate function selected by mode. Rolling back means pointing paper back at `gate` (one code path, one commit) and redeploying the engine binary.
- Paper data is not deleted. Journals are append-only. Forward windows that were locked on chain stay valid evidence and still count toward live. Historical windows keep their `"historical": true` flag.
- After a rollback, paper jobs pause (the existing error path) until the strict gate passes. Evidence keeps showing the collected paper history with its labels.

## 10. Files touched if approved

| File | Change | Effort |
|---|---|---|
| `crates/replay/src/validation.rs` | Add `gate_paper(&Evidence)` beside `gate` | small |
| `crates/replay/src/runtime.rs` | Use `gate_paper` for mode `paper` and `gate` for `live` (around line 366) | small |
| `crates/replay/src/study.rs` | Write both gate results into `walk_forward_report` | small |
| `services/execution/live.mjs` | No change; add a test that a paper-only pass is rejected | small |
| `services/ingest/` | Adjusted underlying history for training and regime labels | medium |
| `crates/replay/tests`, `tests/` | Unit tests for both gates; a paper-never-unlocks-live test | medium |
| `src/app/evidence` | Show paper gate and live gate status per check | small |

Total estimate: about 2–4 working days, plus the adjusted-history work.
