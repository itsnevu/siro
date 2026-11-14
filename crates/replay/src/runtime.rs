//! Validated-data runner. External actions stay outside the pure engine.
//!
//! One generic core runs a portfolio of long-only legs (one frozen strategy per asset) over a
//! shared cash balance and journal. `run(Config)` is the single-asset form: a one-leg portfolio
//! whose identity, journal payloads, decision ids and report shape are exactly those of the
//! original single-asset runner.
use crate::risk_client::RiskClient;
use execution::Adapter;
use ledger::{Decision, Journal, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    collections::{BTreeMap, BTreeSet},
    path::{Path, PathBuf},
    process::Stdio,
    time::{SystemTime, UNIX_EPOCH},
};
use tickstore::{TickStore, HOUR_MS as H};
use tokio::io::AsyncWriteExt;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub strategy: engine::Strategy,
    pub venue: costmodel::Venue,
    pub initial_usd: f64,
    pub from: i64,
    pub through: i64,
    pub mode: String,
    pub asset_class: String,
    pub risk_profile: String,
    pub internal: bool,
    pub bars: PathBuf,
    pub market_data: PathBuf,
    pub journal: PathBuf,
    pub risk_program: PathBuf,
    pub seed: u64,
    pub bootstrap_block: usize,
}
/// One asset of a portfolio: its frozen strategy, its venue calibration, and its sector label.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Leg {
    pub strategy: engine::Strategy,
    pub venue: costmodel::Venue,
    pub sector: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PortfolioConfig {
    pub agent_id: String,
    pub version: u32,
    pub parent_version: Option<u32>,
    pub legs: Vec<Leg>,
    pub initial_usd: f64,
    pub from: i64,
    pub through: i64,
    pub mode: String,
    pub asset_class: String,
    pub risk_profile: String,
    pub internal: bool,
    pub bars: PathBuf,
    pub market_data: PathBuf,
    pub journal: PathBuf,
    pub risk_program: PathBuf,
    pub seed: u64,
    pub bootstrap_block: usize,
}
pub const MAX_LEGS: usize = 16;
/// The commit window closes this long before the next hourly boundary.
pub const COMMIT_CLOSE_BEFORE_MS: i64 = 5_000;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Point {
    pub market: execution::Market,
    pub available_ts: i64,
    pub spy_return: f64,
    pub qqq_return: f64,
    pub stale_ticks: u32,
    pub gap_sigma: f64,
    pub spread_ratio: f64,
    pub regime: String,
    /// No trade in the hour that closed at this tick; the price is carried pool state.
    #[serde(default)]
    pub filled: bool,
    /// Primary and comparator sources disagree beyond the threshold; never used for entries.
    #[serde(default)]
    pub disputed: bool,
}
fn read_points(path: &Path) -> Result<Vec<Point>> {
    use std::io::BufRead;
    let reader = std::io::BufReader::new(std::fs::File::open(path)?);
    let mut points = Vec::new();
    for line in reader.lines() {
        let line = line?;
        if line.len() > 65536 {
            return Err("market row too large".into());
        }
        let p: Point = serde_json::from_str(&line)?;
        if p.market.ts < 0
            || p.market.ts % H != 0
            || p.available_ts > p.market.ts
            || p.available_ts < p.market.ts - 5000
            || p.market.asset.is_empty()
            || [
                p.market.open,
                p.market.depth_usd,
                p.market.funding_bps_hour,
                p.market.borrow_bps_day,
                p.market.gas_usd,
                p.market.priority_usd,
                p.gap_sigma,
                p.spread_ratio,
            ]
            .iter()
            .any(|v| !v.is_finite() || *v < 0.)
            || p.market.open == 0.
            || p.market.depth_usd == 0.
            || ![p.spy_return, p.qqq_return]
                .iter()
                .all(|v| v.is_finite() && *v > -1.)
            || !["bull", "bear", "long_chop", "vol_shock", "gap_news"].contains(&p.regime.as_str())
        {
            return Err("invalid point-in-time market metadata".into());
        }
        points.push(p);
    }
    Ok(points)
}
/// Single-asset market file keyed by timestamp.
pub fn load_points(path: &Path) -> Result<BTreeMap<i64, Point>> {
    let mut points = BTreeMap::new();
    for p in read_points(path)? {
        let ts = p.market.ts;
        if points.insert(ts, p).is_some() {
            return Err("duplicate market timestamp".into());
        }
    }
    Ok(points)
}
type Market = BTreeMap<(i64, String), Point>;
/// Multi-asset market file keyed by (timestamp, asset). Benchmarks and regime are portfolio-wide
/// facts, so every asset row of one timestamp must carry identical values.
pub fn load_market(path: &Path) -> Result<Market> {
    let mut points: Market = BTreeMap::new();
    for p in read_points(path)? {
        let key = (p.market.ts, p.market.asset.clone());
        if let Some(other) = points.range((p.market.ts, String::new())..).next() {
            let (ts, _) = other.0;
            let o = other.1;
            if *ts == p.market.ts
                && (o.spy_return != p.spy_return
                    || o.qqq_return != p.qqq_return
                    || o.regime != p.regime)
            {
                return Err("benchmark or regime differs across assets at one timestamp".into());
            }
        }
        if points.insert(key, p).is_some() {
            return Err("duplicate market timestamp".into());
        }
    }
    Ok(points)
}
pub async fn risk(program: &Path, r: &riskengine::Request) -> Result<riskengine::Permit> {
    let mut child = tokio::process::Command::new(program)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()?;
    let mut input = child.stdin.take().ok_or("risk stdin unavailable")?;
    input.write_all(&ledger::canonical(r)?).await?;
    drop(input);
    let output =
        tokio::time::timeout(std::time::Duration::from_secs(2), child.wait_with_output()).await??;
    if !output.status.success() {
        return Err("risk process failed; no order authorized".into());
    }
    if output.stdout.len() > 65536 {
        return Err("risk response too large".into());
    }
    Ok(serde_json::from_slice(&output.stdout)?)
}
fn now() -> Result<i64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_millis()
        .try_into()?)
}
fn kill() -> Result<bool> {
    Ok(Path::new(&std::env::var("SIRO_KILL_FILE")?).try_exists()?)
}
/// Single-asset runner: a one-leg portfolio with the original identity and journal format.
pub async fn run(c: &Config) -> Result<serde_json::Value> {
    let p = PortfolioConfig {
        agent_id: c.strategy.agent_id.clone(),
        version: c.strategy.version,
        parent_version: c.strategy.parent_version,
        legs: vec![Leg {
            strategy: c.strategy.clone(),
            venue: c.venue.clone(),
            sector: c.strategy.asset.clone(),
        }],
        initial_usd: c.initial_usd,
        from: c.from,
        through: c.through,
        mode: c.mode.clone(),
        asset_class: c.asset_class.clone(),
        risk_profile: c.risk_profile.clone(),
        internal: c.internal,
        bars: c.bars.clone(),
        market_data: c.market_data.clone(),
        journal: c.journal.clone(),
        risk_program: c.risk_program.clone(),
        seed: c.seed,
        bootstrap_block: c.bootstrap_block,
    };
    execute(&p, true).await
}
/// Multi-asset runner. Long-only; every leg must pass its own release gate in paper/live.
pub async fn run_portfolio(c: &PortfolioConfig) -> Result<serde_json::Value> {
    execute(c, false).await
}
fn validate(c: &PortfolioConfig) -> Result<()> {
    let assets: BTreeSet<_> = c.legs.iter().map(|l| l.strategy.asset.as_str()).collect();
    if c.agent_id.is_empty()
        || c.version == 0
        || c.legs.is_empty()
        || c.legs.len() > MAX_LEGS
        || assets.len() != c.legs.len()
        || c.legs
            .iter()
            .any(|l| l.sector.trim().is_empty() || l.sector.len() > 64)
    {
        return Err("portfolio needs 1..=16 legs with unique assets and sector labels".into());
    }
    for leg in &c.legs {
        leg.strategy.validate()?;
    }
    if !["backtest", "paper", "sim-queue", "live"].contains(&c.mode.as_str())
        || c.from > c.through
        || c.from % H != 0
        || c.through % H != 0
    {
        return Err("invalid mode or hourly range".into());
    }
    Ok(())
}
/// Close-to-close hourly returns of the 48 closed bars ending at `tick`.
fn returns(store: &impl TickStore, asset: &str, tick: i64) -> Result<Vec<f64>> {
    let from = tick
        .checked_sub((features::MAX_LOOKBACK as i64 - 1) * H)
        .ok_or("timestamp overflow")?;
    let bars = store.query(asset, from, tick)?;
    if bars.len() != features::MAX_LOOKBACK {
        return Err("48 contiguous closed bars required for correlation".into());
    }
    Ok(bars
        .windows(2)
        .map(|w| w[1].close / w[0].close - 1.)
        .collect())
}
/// Pearson correlation. Undefined (flat series) counts as 1.0: unknown diversification is
/// treated as none, so the risk engine's correlation trim applies.
pub fn correlation(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() || a.len() < 3 {
        return 1.;
    }
    let n = a.len() as f64;
    let (ma, mb) = (a.iter().sum::<f64>() / n, b.iter().sum::<f64>() / n);
    let cov: f64 = a.iter().zip(b).map(|(x, y)| (x - ma) * (y - mb)).sum();
    let va: f64 = a.iter().map(|x| (x - ma).powi(2)).sum();
    let vb: f64 = b.iter().map(|y| (y - mb).powi(2)).sum();
    let r = cov / (va * vb).sqrt();
    if r.is_finite() {
        r.clamp(-1., 1.)
    } else {
        1.
    }
}
/// Portfolio-level risk telemetry for an order in `asset`.
struct Telemetry {
    total_weight: f64,
    sector_weight: f64,
    max_pair_correlation: f64,
}
fn telemetry(
    store: &impl TickStore,
    state: &engine::State,
    c: &PortfolioConfig,
    prices: &BTreeMap<String, f64>,
    equity: f64,
    asset: &str,
    tick: i64,
) -> Result<Telemetry> {
    let sector = &c
        .legs
        .iter()
        .find(|l| l.strategy.asset == asset)
        .ok_or("order asset is not a portfolio leg")?
        .sector;
    let weight = |a: &str| -> Result<f64> {
        let units = state.positions.get(a).map_or(0., |p| p.units);
        if units == 0. {
            return Ok(0.);
        }
        Ok(units * prices.get(a).ok_or("valuation price missing")? / equity)
    };
    let mut total_weight = 0.;
    let mut sector_weight = 0.;
    let mut held_others = vec![];
    for leg in &c.legs {
        let a = leg.strategy.asset.as_str();
        let w = weight(a)?;
        total_weight += w;
        if &leg.sector == sector {
            sector_weight += w;
        }
        if a != asset && w > 0. {
            held_others.push(a);
        }
    }
    let mut max_pair_correlation: f64 = 0.;
    if !held_others.is_empty() {
        let mine = returns(store, asset, tick)?;
        for other in held_others {
            max_pair_correlation =
                max_pair_correlation.max(correlation(&mine, &returns(store, other, tick)?));
        }
    }
    Ok(Telemetry {
        total_weight,
        sector_weight,
        max_pair_correlation,
    })
}
async fn execute(c: &PortfolioConfig, single: bool) -> Result<serde_json::Value> {
    let mut risk_client = RiskClient::start(&c.risk_program)?;
    validate(c)?;
    let key = hex_key()?;
    let leg_hashes = c
        .legs
        .iter()
        .map(|l| engine::strategy_hash(&l.strategy))
        .collect::<Result<Vec<_>>>()?;
    // A one-leg run keeps the original strategy hash so existing journals still resume.
    let strategy_hash = if single {
        leg_hashes[0].clone()
    } else {
        ledger::hash(&(
            "portfolio-v1",
            c.legs
                .iter()
                .zip(&leg_hashes)
                .map(|(l, h)| (&l.strategy.asset, &l.sector, h))
                .collect::<Vec<_>>(),
        ))?
    };
    let identity = |asset: &str| {
        if single {
            c.agent_id.clone()
        } else {
            format!("{}/{asset}", c.agent_id)
        }
    };
    let release_gate = if ["paper", "live"].contains(&c.mode.as_str()) {
        let path = PathBuf::from(std::env::var("SIRO_VALIDATION_JOURNAL")?);
        let history = ledger::read_events(&path)?;
        let mut gates = vec![];
        for (leg, hash) in c.legs.iter().zip(&leg_hashes) {
            let report = history
                .iter()
                .rev()
                .find(|e| {
                    e.kind == "walk_forward_report"
                        && e.payload["agent_id"] == leg.strategy.agent_id
                })
                .ok_or("walk-forward release evidence missing")?;
            if report.payload["gate"]["passed"] != true
                || !report.payload["gate"]["checks"]
                    .as_array()
                    .is_some_and(|checks| {
                        checks.len() >= 8 && checks.iter().all(|c| c["passed"] == true)
                    })
                || !report.payload["windows"]
                    .as_array()
                    .is_some_and(|windows| windows.iter().any(|w| w["strategy_hash"] == *hash))
            {
                return Err("frozen strategy failed the public paper/live release gate".into());
            }
            gates.push(json!({"asset":leg.strategy.asset,"gate":report.payload["gate"]}));
        }
        Some(if single {
            gates[0]["gate"].clone()
        } else {
            json!({"passed":true,"legs":gates})
        })
    } else {
        None
    };
    let store = tickstore::ParquetStore::open(&c.bars)?;
    let points = load_market(&c.market_data)?;
    if single && points.keys().any(|(_, a)| *a != c.legs[0].strategy.asset) {
        return Err("market asset mismatch".into());
    }
    let first = &c.legs[0].strategy.asset;
    let mut log = Journal::open(&c.journal)?;
    if log.events().is_empty() {
        log.append(c.from,"initialized",&json!({"initial_usd":c.initial_usd,"strategy_hash":strategy_hash,"agent_id":c.agent_id,"mode":c.mode}))?;
    }
    let init = &log.events()[0].payload;
    if init["strategy_hash"] != strategy_hash
        || init["initial_usd"] != c.initial_usd
        || init["mode"] != c.mode
    {
        return Err("journal belongs to different strategy, mode or capital".into());
    }
    let mut state = engine::State::reconstruct(c.initial_usd, log.events())?;
    let completed = log
        .events()
        .iter()
        .filter(|e| e.kind == "valuation")
        .map(|e| e.ts)
        .max();
    let mut peak = log
        .events()
        .iter()
        .filter(|e| e.kind == "valuation")
        .filter_map(|e| e.payload["net_equity"].as_f64())
        .fold(c.initial_usd, f64::max);
    let mut tick = c.from;
    let mut regimes = std::collections::BTreeSet::new();
    loop {
        if completed.is_some_and(|last| tick <= last) {
            if tick == c.through {
                break;
            }
            tick = tick.checked_add(H).ok_or("tick overflow")?;
            continue;
        }
        if state.halted {
            return Err("journal halted; investigate before a new run".into());
        }
        if ["paper", "live"].contains(&c.mode.as_str()) {
            let time = now()?;
            if tick > time || time - tick > 2 * H {
                return Err("paper mode requires recent observed market data".into());
            }
        }
        let mut leg_points = Vec::with_capacity(c.legs.len());
        for leg in &c.legs {
            leg_points.push(
                points
                    .get(&(tick, leg.strategy.asset.clone()))
                    .ok_or("point-in-time depth/fees/benchmark data missing")?,
            );
        }
        let p0 = leg_points[0];
        regimes.insert(p0.regime.clone());
        let mut feats = Vec::with_capacity(c.legs.len());
        for leg in &c.legs {
            feats.push(features::compute(&store, &leg.strategy.asset, tick)?);
        }
        let prices: BTreeMap<_, _> = c
            .legs
            .iter()
            .zip(&leg_points)
            .map(|(l, p)| (l.strategy.asset.clone(), p.market.open))
            .collect();
        let equity = state.equity(&prices)?;
        peak = peak.max(equity);
        let dd = 1. - equity / peak;
        if kill()? {
            let e = log.append(tick, "halt", &json!({"reason":"manual_kill","drawdown":dd}))?;
            state.apply(&e)?;
            return Err("kill switch halted runner".into());
        }
        // Drawdown kill: liquidate every leg first, halt once flat. Halting while holding would
        // lock positions open with no automatic way out.
        let liquidating = dd >= 0.20;
        if liquidating
            && state.pending.is_empty()
            && state.positions.values().all(|p| p.units <= 0.)
        {
            let e = log.append(
                tick,
                "halt",
                &json!({"reason":"drawdown_governor","drawdown":dd,"flat":true}),
            )?;
            state.apply(&e)?;
            return Err("drawdown governor halted runner after liquidation".into());
        }
        let mut turnover = 0.;
        for (leg, p) in c.legs.iter().zip(&leg_points) {
            let carry_base = state
                .positions
                .get(&leg.strategy.asset)
                .map_or(0., |v| v.units * p.market.open);
            if carry_base > 0. {
                let carry = costmodel::carry_usd(
                    carry_base,
                    p.market.funding_bps_hour,
                    p.market.borrow_bps_day,
                    1.,
                )?;
                if carry > state.cash {
                    log.append(tick, "halt", &json!({"reason":"unpayable_carry"}))?;
                    return Err("carry exhausts available cash".into());
                }
                let event = log.append(
                    tick,
                    "carry",
                    &json!({"cost_usd":carry,"asset":leg.strategy.asset}),
                )?;
                state.apply(&event)?;
            }
        }
        let net = state.equity(&prices)?;
        // Phase 11 commit window: a decision for this tick must be committed before the window
        // closes 5 s ahead of the next boundary, when its order becomes executable. A late runner
        // skips the tick and records late_tick instead of committing with hindsight.
        let late = if ["paper", "live"].contains(&c.mode.as_str()) {
            let observed = now()?;
            let close = tick
                .checked_add(H - COMMIT_CLOSE_BEFORE_MS)
                .ok_or("tick overflow")?;
            if observed > close {
                log.append(
                    tick,
                    "late_tick",
                    &json!({"tick":tick,"observed_at":observed,"window_close":close}),
                )?;
                true
            } else {
                false
            }
        } else {
            false
        };
        for ((leg, p), f) in c.legs.iter().zip(&leg_points).zip(&feats).filter(|_| !late) {
            let s = &leg.strategy;
            let held = state
                .positions
                .get(&s.asset)
                .map_or(0., |v| v.units * p.market.open);
            let weight = held / net;
            let mut signal = engine::signal(s, f, weight)?;
            if liquidating {
                let held_units = state.positions.get(&s.asset).map_or(0., |p| p.units);
                signal.action = if held_units > 0. { "reduce" } else { "hold" }.into();
                signal.target_weight = 0.;
                signal.rationale = ledger::Rationale {
                    rule_id: "drawdown_liquidation_v1".into(),
                    threshold: 0.20,
                    observed: dd,
                };
                signal.rationale_text = format!(
                    "drawdown {} >= 0.20: liquidating; z_48h={}, rsi_14={}, atr_pct={}",
                    dd, f.z_48h, f.rsi_14, f.atr_pct
                );
            }
            // Per-position stop loss: exit fully when price falls to avg entry x (1 - stop).
            if let (Some(stop), Some(pos)) = (s.stop_loss_pct, state.positions.get(&s.asset)) {
                if pos.units > 0. {
                    let avg_entry = pos.cost_basis / pos.units;
                    let trigger = avg_entry * (1. - stop);
                    if p.market.open <= trigger {
                        signal.action = "reduce".into();
                        signal.target_weight = 0.;
                        signal.rationale = ledger::Rationale {
                            rule_id: "stop_loss_v1".into(),
                            threshold: trigger,
                            observed: p.market.open,
                        };
                        signal.rationale_text = format!(
                            "stop loss: price {} <= {} (avg entry {} x (1 - {})); z_48h={}, rsi_14={}, atr_pct={}",
                            p.market.open, trigger, avg_entry, stop, f.z_48h, f.rsi_14, f.atr_pct
                        );
                    }
                }
            }
            let id = ledger::decision_id(&identity(&s.asset), s.version, tick)?;
            let notional = ((signal.target_weight - weight) * net).abs();
            let estimate = if notional > 0. {
                costmodel::decision_quote(
                    &leg.venue,
                    &costmodel::Inputs {
                        notional_usd: notional,
                        depth_usd: p.market.depth_usd,
                        funding_bps_per_hour: p.market.funding_bps_hour,
                        borrow_bps_per_day: p.market.borrow_bps_day,
                        holding_hours: s.horizon_h as f64,
                        gas_usd: p.market.gas_usd,
                        priority_usd: p.market.priority_usd,
                    },
                )?
                .total_bps
            } else {
                0.
            };
            let mut action = signal.action.clone();
            let mut target = signal.target_weight;
            let actual;
            let mut veto = vec![];
            let mut order = engine::Order {
                horizon_h: s.horizon_h,
                decision_id: id.clone(),
                asset: s.asset.clone(),
                side: if target > weight { "buy" } else { "sell" }.into(),
                notional_usd: notional,
                original_notional_usd: notional,
                eligible_open_ts: tick.checked_add(H).ok_or("tick overflow")?,
                expected_edge_bps: signal.expected_edge_bps,
                reducing: action == "reduce",
            };
            // A leg waits while its own previous order is pending; other legs are independent.
            if state.pending.values().any(|o| o.asset == s.asset)
                || action == "hold"
                || (!order.reducing && signal.expected_edge_bps <= estimate)
            {
                action = "hold".into();
                actual = 0.;
                target = weight;
            } else {
                let t = telemetry(&store, &state, c, &prices, net, &s.asset, tick)?;
                let req = request(&log, &order, p, c, net, dd, f, &t)?;
                let permit = risk_client.evaluate(&req).await?;
                log.append(tick, "risk_assessment", &permit)?;
                veto = permit.veto.clone();
                if !veto.is_empty() || permit.weight <= 0. {
                    action = "hold".into();
                    actual = 0.;
                    target = weight;
                } else {
                    riskengine::verify(
                        &permit,
                        &req,
                        &key,
                        if c.mode == "live" { now()? } else { tick },
                    )?;
                    actual = permit.notional_usd;
                    target = if order.reducing {
                        (weight - actual / net).max(0.)
                    } else {
                        weight + actual / net
                    };
                }
            }
            let previous = log
                .events()
                .iter()
                .rev()
                .find(|e| e.kind == "decision")
                .and_then(|e| e.payload["commit_hash"].as_str())
                .unwrap_or(ledger::GENESIS)
                .to_string();
            let commit = if ["paper", "live"].contains(&c.mode.as_str()) {
                now()?
            } else {
                tick
            };
            let mut d = Decision {
                decision_id: id,
                agent_id: c.agent_id.clone(),
                agent_version: if single { s.version } else { c.version },
                parent_version: if single {
                    s.parent_version
                } else {
                    c.parent_version
                },
                strategy_hash: engine::strategy_hash(s)?,
                tick_ts: ledger::timestamp(tick)?,
                commit_ts: ledger::timestamp(commit)?,
                reveal_ts: ledger::timestamp(tick.checked_add(H).ok_or("tick overflow")?)?,
                prev_hash: previous,
                commit_hash: String::new(),
                universe_snapshot_hash: ledger::hash(&(&s.asset, p.available_ts))?,
                features: [
                    ("z_48h".into(), f.z_48h),
                    ("rsi_14".into(), f.rsi_14),
                    ("atr_pct".into(), f.atr_pct),
                ]
                .into(),
                regime_label: signal.regime,
                action: action.clone(),
                target_weight: target,
                notional_usd: actual,
                predicted_prob_up: signal.predicted_prob_up,
                horizon_h: s.horizon_h,
                expected_edge_bps: signal.expected_edge_bps,
                cost_estimate_bps: estimate,
                rationale_struct: signal.rationale,
                rationale_text: signal.rationale_text,
                risk_veto: veto,
                risk_adjusted: true,
                confidence: (signal.predicted_prob_up - 0.5).abs() * 2.,
                supersedes: None,
            };
            d.seal()?;
            log.commit(&d)?;
            if action != "hold" && actual > 0. {
                order.notional_usd = actual;
                order.original_notional_usd = actual;
                let event = log.append(tick, "order", &order)?;
                state.apply(&event)?;
            }
        }
        let pending: Vec<_> = state.pending.values().cloned().collect();
        for order in pending {
            if order.eligible_open_ts > tick {
                continue;
            }
            let i = c
                .legs
                .iter()
                .position(|l| l.strategy.asset == order.asset)
                .ok_or("pending order for an asset outside the portfolio")?;
            let (leg, p, f) = (&c.legs[i], leg_points[i], &feats[i]);
            let t = telemetry(&store, &state, c, &prices, equity, &order.asset, tick)?;
            let request = request(&log, &order, p, c, equity, dd, f, &t)?;
            let permit = match risk_client.evaluate(&request).await {
                Ok(p) => p,
                Err(e) => {
                    log.append(
                        tick,
                        "halt",
                        &json!({"reason":"risk_unavailable","detail":e.to_string()}),
                    )?;
                    return Err(e);
                }
            };
            log.append(tick, "risk_assessment", &permit)?;
            let authorized = execution::Authorized {
                order: &order,
                permit: &permit,
                request: &request,
                market: &p.market,
                venue: &leg.venue,
                key: &key,
                killed: kill()?,
                available_units: state.positions.get(&order.asset).map_or(0., |p| p.units),
            };
            let result = if c.mode == "sim-queue" {
                execution::SimQueue.execute(authorized)
            } else if c.mode == "live" {
                let root = std::env::var("SIRO_SERVICE_ROOT")
                    .map(PathBuf::from)
                    .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."));
                execution::Live {
                    transport: execution::ProcessTransport {
                        program: root.join("services/execution/live.mjs"),
                        risk_program: c.risk_program.clone(),
                    },
                }
                .execute(authorized)
            } else {
                execution::Paper.execute(authorized)
            };
            match result {
                Ok(fill) => {
                    let mut candidate = state.clone();
                    let event = ledger::Event {
                        seq: 0,
                        ts: tick,
                        prev_hash: ledger::GENESIS.into(),
                        event_hash: ledger::GENESIS.into(),
                        kind: "fill".into(),
                        payload: serde_json::to_value(&fill)?,
                    };
                    candidate.apply(&event)?;
                    let event = log.append(tick, "fill", &fill)?;
                    state.apply(&event)?;
                    turnover += fill.quantity.abs() * fill.price;
                }
                Err(e) => {
                    // Provably-not-executed orders are cancelled like any other failed order;
                    // only an unresolved outcome halts and demands operator reconciliation.
                    if c.mode == "live" && !e.to_string().starts_with(execution::NOT_EXECUTED) {
                        log.append(
                            tick,
                            "halt",
                            &json!({"reason":"live_receipt_uncertain","detail":e.to_string()}),
                        )?;
                        std::fs::write(
                            std::env::var("SIRO_KILL_FILE")?,
                            b"Live execution requires outbox and chain reconciliation",
                        )?;
                        return Err(e);
                    }
                    let event=log.append(tick,"cancel",&json!({"decision_id":order.decision_id,"reason":e.to_string(),"veto":permit.veto}))?;
                    state.apply(&event)?;
                }
            }
        }
        let net = state.equity(&prices)?;
        let mut exposure = 0.;
        for (leg, p) in c.legs.iter().zip(&leg_points) {
            exposure += state
                .positions
                .get(&leg.strategy.asset)
                .map_or(0., |v| v.units * p.market.open / net);
        }
        log.append(
            tick,
            "valuation",
            &metrics::Observation {
                ts: tick,
                gross_equity: net + state.costs,
                net_equity: net,
                turnover_usd: turnover,
                exposure,
                spy_return: p0.spy_return,
                qqq_return: p0.qqq_return,
            },
        )?;
        if tick == c.through {
            break;
        }
        tick = tick.checked_add(H).ok_or("tick overflow")?;
    }
    let rows: Vec<metrics::Observation> = log
        .events()
        .iter()
        .filter(|e| e.kind == "valuation")
        .map(|e| serde_json::from_value(e.payload.clone()))
        .collect::<std::result::Result<_, _>>()?;
    let stats = metrics::calculate(&rows, c.initial_usd, &state.realized_trade_pnl)?;
    let evidence = crate::validation::Evidence {
        regimes: regimes.into_iter().collect(),
        windows: 0,
        sensitivity_survival: vec![],
        net_sharpe: stats.net_sharpe,
        max_drawdown: stats.max_drawdown,
        longest_drawdown_days: stats.longest_drawdown_days,
        doubled_slippage_net_edge: 0.,
        dsr_probability: None,
        trials: 0,
        independent_trials: 0,
        externally_verified_oos_locks: 0,
    };
    let assets: BTreeMap<String, String> = c
        .legs
        .iter()
        .zip(&leg_hashes)
        .map(|(l, h)| (h.clone(), l.strategy.asset.clone()))
        .collect();
    let outcomes = resolved_predictions(&log, &store, &assets, c.through)?;
    let (brier, curve) = metrics::calibration(&outcomes)?;
    let published_gate =
        release_gate.unwrap_or(serde_json::to_value(crate::validation::gate(&evidence))?);
    let mut breakdown: BTreeMap<String, (f64, f64, usize)> = BTreeMap::new();
    let mut prev_g = c.initial_usd;
    let mut prev_n = c.initial_usd;
    for row in &rows {
        let point = points
            .get(&(row.ts, first.clone()))
            .ok_or("regime metadata missing")?;
        let entry = breakdown.entry(point.regime.clone()).or_insert((1., 1., 0));
        entry.0 *= row.gross_equity / prev_g;
        entry.1 *= row.net_equity / prev_n;
        entry.2 += 1;
        prev_g = row.gross_equity;
        prev_n = row.net_equity;
    }
    let regime_breakdown:Vec<_>=breakdown.into_iter().map(|(regime,(g,n,samples))|json!({"regime":regime,"gross_return":g-1.,"net_return":n-1.,"samples":samples})).collect();
    let capacity = c
        .legs
        .iter()
        .flat_map(|l| {
            points
                .iter()
                .filter(move |((ts, a), _)| {
                    *a == l.strategy.asset && *ts >= c.from && *ts <= c.through
                })
                .map(move |(_, p)| p.market.depth_usd * 0.005 / l.strategy.max_weight)
        })
        .fold(f64::INFINITY, f64::min);
    let mut report = json!({"agent_id":c.agent_id,"agent_version":if single{c.legs[0].strategy.version}else{c.version},"parent_version":if single{c.legs[0].strategy.parent_version}else{c.parent_version},"internal":c.internal,"mode":if c.mode=="sim-queue"{"backtest"}else{&c.mode},"asset_class":c.asset_class,"risk_profile":c.risk_profile,"regime":"mixed","capital_usd":c.initial_usd,"capacity_usd":capacity,"strategy_hash":strategy_hash,"prev_hash":log.tip(),"metrics":stats,"gate":published_gate,"calibration":{"brier":brier,"curve":curve},"regime_breakdown":regime_breakdown,"advisory_comparison":null,"verification_url":"/roots","observations":rows.len(),"risk_free_rate":0.,"publication":"historical replay does not prove timely public commitment"});
    if !single {
        report["legs"] = json!(c
            .legs
            .iter()
            .zip(&leg_hashes)
            .map(|(l, h)| json!({"asset":l.strategy.asset,"sector":l.sector,"strategy_hash":h}))
            .collect::<Vec<_>>());
        report["portfolio"] = json!("long-only; one shared cash balance; risk telemetry uses portfolio weight, sector weight and 47-return pairwise correlation");
    }
    log.append(c.through, "report", &report)?;
    Ok(report)
}
fn hex_key() -> Result<Vec<u8>> {
    let v = std::env::var("SIRO_RISK_MAC_KEY")?;
    if v.len() < 64 || v.len() % 2 != 0 || !v.is_ascii() {
        return Err("risk key must be >=32 bytes hex".into());
    }
    (0..v.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&v[i..i + 2], 16).map_err(Into::into))
        .collect()
}
#[allow(clippy::too_many_arguments)]
fn request(
    log: &Journal,
    o: &engine::Order,
    p: &Point,
    c: &PortfolioConfig,
    equity: f64,
    dd: f64,
    f: &features::FeatureSet,
    t: &Telemetry,
) -> Result<riskengine::Request> {
    let day = p.market.ts / 86_400_000;
    // Exclude the order being evaluated: the risk engine adds its notional itself. Counting its
    // journal entry too vetoed every pending order above half the daily turnover cap at execution.
    let todays: Vec<_> = log
        .events()
        .iter()
        .filter(|e| {
            e.kind == "order"
                && e.ts / 86_400_000 == day
                && e.payload["decision_id"] != o.decision_id.as_str()
        })
        .collect();
    let turnover = todays
        .iter()
        .filter_map(|e| e.payload["original_notional_usd"].as_f64())
        .sum::<f64>()
        / equity;
    Ok(riskengine::Request {
        decision_id: o.decision_id.clone(),
        order_hash: ledger::hash(o)?,
        ts: if c.mode == "live" {
            now()?
        } else {
            p.market.ts
        },
        requested_weight: o.notional_usd / equity,
        notional_usd: o.notional_usd,
        equity_usd: equity,
        atr_pct: f.atr_pct,
        current_risk_units: t.total_weight * 100.,
        sector_weight: t.sector_weight,
        max_pair_correlation: t.max_pair_correlation,
        drawdown: dd,
        // A disputed price must not open or add to a position: report it as maximally stale so
        // the risk engine's stale_data veto applies. Reductions remain possible.
        stale_ticks: if p.disputed { u32::MAX } else { p.stale_ticks },
        gap_sigma: p.gap_sigma,
        funding_bps_hour: p.market.funding_bps_hour,
        spread_ratio: p.spread_ratio,
        trades_today: todays.len() as u32,
        turnover_today: turnover,
        reducing: o.reducing,
        reconciliation_error: 0.,
        reconciliation_tolerance: 0.,
    })
}
fn resolved_predictions(
    log: &Journal,
    store: &impl TickStore,
    assets: &BTreeMap<String, String>,
    through: i64,
) -> Result<Vec<(f64, bool)>> {
    let mut result = vec![];
    for e in log.events().iter().filter(|e| e.kind == "decision") {
        let d: Decision = serde_json::from_value(e.payload.clone())?;
        let asset = assets
            .get(&d.strategy_hash)
            .ok_or("decision strategy is not a portfolio leg")?;
        let tick = ledger::millis(&d.tick_ts)?;
        let end = tick
            .checked_add(i64::from(d.horizon_h) * H)
            .ok_or("horizon overflow")?;
        if end > through {
            continue;
        }
        let a = store.query(asset, tick, tick)?;
        let b = store.query(asset, end, end)?;
        if let (Some(a), Some(b)) = (a.first(), b.first()) {
            result.push((d.predicted_prob_up, b.close > a.close));
        }
    }
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::correlation;
    #[test]
    fn correlation_is_bounded_and_flat_series_is_conservative() {
        let a = [0.01, -0.02, 0.03, -0.01, 0.02];
        let neg: Vec<f64> = a.iter().map(|x| -x).collect();
        assert!((correlation(&a, &a) - 1.).abs() < 1e-12);
        assert!((correlation(&a, &neg) + 1.).abs() < 1e-12);
        assert_eq!(correlation(&a, &[0.; 5]), 1.);
        assert_eq!(correlation(&a, &a[..3]), 1.);
    }
}
