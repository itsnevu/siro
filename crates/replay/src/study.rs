//! Walk-forward orchestration. Training never receives labels from OOS windows.
use crate::lock_verification::verify_lock;
use ledger::{Journal, Result};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, path::PathBuf};
use tickstore::{TickStore, HOUR_MS as H};
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Study {
    pub base: crate::runtime::Config,
    pub training_months: u32,
    pub candidates: Vec<engine::Strategy>,
    pub independent_trials: usize,
    pub output_dir: PathBuf,
    #[serde(default)]
    pub oos_locks: BTreeMap<String, serde_json::Value>,
}
fn fit(
    mut s: engine::Strategy,
    store: &impl TickStore,
    from: i64,
    to: i64,
) -> Result<engine::Strategy> {
    let mut samples = Vec::new();
    let horizon = i64::from(s.horizon_h) * H;
    let mut t = from
        .checked_add(47 * H)
        .ok_or("training timestamp overflow")?;
    while t.checked_add(horizon).ok_or("horizon overflow")? < to {
        let f = features::compute(store, &s.asset, t)?;
        let a = store.query(&s.asset, t, t)?;
        let b = store.query(&s.asset, t + horizon, t + horizon)?;
        if let (Some(a), Some(b)) = (a.first(), b.first()) {
            samples.push((t, f.z_48h, f.rsi_14 / 100., b.close / a.close - 1.));
        }
        t += H;
    }
    if samples.len() < 100 {
        return Err("at least 100 fully resolved training labels required".into());
    }
    let mut coefficients = [0.; 3];
    for _ in 0..300 {
        let mut gradient = [0.; 3];
        for (_, z, r, outcome) in &samples {
            let x = [1., *z, *r];
            let score: f64 = x.iter().zip(coefficients).map(|(a, b)| a * b).sum();
            let p = 1. / (1. + (-score.clamp(-40., 40.)).exp());
            let error = p - if *outcome > 0. { 1. } else { 0. };
            for i in 0..3 {
                gradient[i] += error * x[i];
            }
        }
        for i in 0..3 {
            coefficients[i] -=
                0.05 * (gradient[i] / samples.len() as f64 + 0.001 * coefficients[i]);
        }
    }
    let wins: Vec<_> = samples.iter().filter(|s| s.3 > 0.).map(|s| s.3).collect();
    let losses: Vec<_> = samples.iter().filter(|s| s.3 < 0.).map(|s| -s.3).collect();
    if wins.is_empty() || losses.is_empty() {
        return Err("training requires both positive and negative resolved outcomes".into());
    }
    s.logistic_intercept = coefficients[0];
    s.logistic_z = coefficients[1];
    s.logistic_rsi = coefficients[2] / 100.;
    s.up_move_bps = wins.iter().sum::<f64>() / wins.len() as f64 * 10000.;
    s.down_move_bps = losses.iter().sum::<f64>() / losses.len() as f64 * 10000.;
    s.trained_model_hash = ledger::hash(&samples)?;
    s.validate()?;
    Ok(s)
}
fn perturb(s: &engine::Strategy, key: &str, m: f64) -> Result<engine::Strategy> {
    let mut v = serde_json::to_value(s)?;
    let n = v[key].as_f64().ok_or("parameter not numeric")?;
    v[key] = if key == "horizon_h" {
        serde_json::json!((n * m).round().max(1.) as u32)
    } else {
        serde_json::json!(n * m)
    };
    let s: engine::Strategy = serde_json::from_value(v)?;
    s.validate()?;
    Ok(s)
}
async fn evaluate(
    study: &Study,
    s: &engine::Strategy,
    from: i64,
    to: i64,
    label: &str,
    stress: bool,
) -> Result<serde_json::Value> {
    let mut c = study.base.clone();
    c.strategy = s.clone();
    c.from = from;
    c.through = to - H;
    c.mode = "sim-queue".into();
    if stress {
        c.venue.slippage_k *= 2.;
        c.venue.protocol_bps += 2.;
    }
    c.journal = study.output_dir.join(format!(
        "{label}-{}.jsonl",
        ledger::hash(&(s, from, to, stress))?
    ));
    crate::runtime::run(&c).await
}
pub async fn run(study: &Study) -> Result<serde_json::Value> {
    if study.candidates.len() < 2 || study.independent_trials < 2 {
        return Err("study requires >=2 candidates and independent trial accounting".into());
    }
    std::fs::create_dir_all(&study.output_dir)?;
    let store = tickstore::ParquetStore::open(&study.base.bars)?;
    let windows =
        crate::validation::windows(study.base.from, study.base.through, study.training_months)?;
    if windows.is_empty() {
        return Err("no complete walk-forward windows".into());
    }
    let points = crate::runtime::load_points(&study.base.market_data)?;
    let mut log = Journal::open(&study.output_dir.join("study.jsonl"))?;
    let keys = [
        "entry_z",
        "exit_z",
        "max_weight",
        "horizon_h",
        "logistic_intercept",
        "logistic_z",
        "logistic_rsi",
        "up_move_bps",
        "down_move_bps",
    ];
    let mut survival: BTreeMap<String, usize> = BTreeMap::new();
    let mut trial_srs = Vec::new();
    let mut total_trials = 0;
    let mut oos_returns = Vec::new();
    let mut oos_rows = Vec::new();
    let mut equity_scale = 1.;
    let mut gross_scale = 1.;
    let mut stress_compound = 1.;
    let mut regimes = std::collections::BTreeSet::new();
    let mut chosen = Vec::new();
    let mut verified_locks = 0;
    for (wi, w) in windows.iter().enumerate() {
        let mut best: Option<(f64, engine::Strategy)> = None;
        for candidate in &study.candidates {
            if candidate.asset != study.base.strategy.asset {
                return Err("candidates must use the locked point-in-time universe".into());
            }
            let fitted = fit(candidate.clone(), &store, w.train_start, w.train_end)?;
            let report = evaluate(
                study,
                &fitted,
                w.train_start + 47 * H,
                w.train_end,
                &format!("train-{wi}"),
                false,
            )
            .await?;
            total_trials += 1;
            if let Some(sr) = report["metrics"]["net_sharpe"].as_f64() {
                trial_srs.push(sr / (365.25_f64 * 24.).sqrt());
                if best.as_ref().is_none_or(|(b, _)| sr > *b) {
                    best = Some((sr, fitted));
                }
            }
        }
        let (_, s) = best.ok_or("no candidate had a defined training net Sharpe")?;
        let lock_hash = ledger::hash(&(&s, features::VERSION, w.test_start, w.test_end))?;
        let publication = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_millis() as i64;
        let verified = if let Some(proof) = study.oos_locks.get(&lock_hash) {
            verify_lock(proof, &lock_hash, w).await?
        } else {
            false
        };
        if verified {
            verified_locks += 1;
        }
        log.append(publication,"oos_lock",&serde_json::json!({"hash":lock_hash,"window":w,"strategy":s,"externally_verified":verified,"historical":publication>=w.test_start}))?;
        let report = evaluate(
            study,
            &s,
            w.test_start,
            w.test_end,
            &format!("oos-{wi}"),
            false,
        )
        .await?;
        let journal = study.output_dir.join(format!(
            "oos-{wi}-{}.jsonl",
            ledger::hash(&(&s, w.test_start, w.test_end, false))?
        ));
        let mut last = study.base.initial_usd;
        for e in ledger::read_events(&journal)?
            .iter()
            .filter(|e| e.kind == "valuation")
        {
            let mut row: metrics::Observation = serde_json::from_value(e.payload.clone())?;
            oos_returns.push(row.net_equity / last - 1.);
            last = row.net_equity;
            row.net_equity *= equity_scale;
            row.gross_equity *= gross_scale;
            if let Some(p) = points.get(&row.ts) {
                regimes.insert(p.regime.clone());
            }
            oos_rows.push(row);
        }
        equity_scale *= 1.
            + report["metrics"]["net_return"]
                .as_f64()
                .ok_or("net return missing")?;
        gross_scale *= 1.
            + report["metrics"]["gross_return"]
                .as_f64()
                .ok_or("gross return missing")?;
        let stress = evaluate(
            study,
            &s,
            w.test_start,
            w.test_end,
            &format!("stress-{wi}"),
            true,
        )
        .await?;
        stress_compound *= 1.
            + stress["metrics"]["net_return"]
                .as_f64()
                .ok_or("stress net missing")?;
        for evaluation in [&report, &stress] {
            total_trials += 1;
            if let Some(sr) = evaluation["metrics"]["net_sharpe"].as_f64() {
                trial_srs.push(sr / (365.25_f64 * 24.).sqrt());
            }
        }
        for key in keys {
            for multiplier in [0.8, 1.2] {
                let name = format!("{key}:{multiplier}");
                let passed = match perturb(&s, key, multiplier) {
                    Ok(p) => match evaluate(
                        study,
                        &p,
                        w.test_start,
                        w.test_end,
                        &format!("sensitivity-{wi}"),
                        false,
                    )
                    .await
                    {
                        Ok(r) => {
                            total_trials += 1;
                            if let Some(sr) = r["metrics"]["net_sharpe"].as_f64() {
                                trial_srs.push(sr / (365.25_f64 * 24.).sqrt());
                            }
                            r["metrics"]["net_return"].as_f64().is_some_and(|n| n > 0.)
                                && r["metrics"]["max_drawdown"]
                                    .as_f64()
                                    .is_some_and(|d| d < 0.25)
                        }
                        Err(error) => {
                            total_trials += 1;
                            log.append(publication,"sensitivity_failure",&serde_json::json!({"parameter":key,"multiplier":multiplier,"error":error.to_string()}))?;
                            false
                        }
                    },
                    Err(error) => {
                        total_trials += 1;
                        log.append(publication,"sensitivity_failure",&serde_json::json!({"parameter":key,"multiplier":multiplier,"error":error.to_string()}))?;
                        false
                    }
                };
                *survival.entry(name).or_default() += usize::from(passed);
            }
        }
        chosen.push(serde_json::json!({"window":w,"strategy_hash":engine::strategy_hash(&s)?,"oos_lock_hash":lock_hash,"gross_return":report["metrics"]["gross_return"],"net_return":report["metrics"]["net_return"]}));
    }
    let stats = metrics::calculate(&oos_rows, study.base.initial_usd, &[])?;
    let dsr = if trial_srs.len() == total_trials {
        crate::validation::deflated_sharpe(&oos_returns, &trial_srs, total_trials).ok()
    } else {
        None
    };
    let bootstrap = crate::validation::bootstrap(
        &oos_returns,
        study.base.seed,
        study.base.bootstrap_block,
        365.25 * 24.,
    )?;
    let evidence = crate::validation::Evidence {
        regimes: regimes.into_iter().collect(),
        windows: windows.len(),
        sensitivity_survival: survival
            .values()
            .map(|n| *n as f64 / windows.len() as f64)
            .collect(),
        net_sharpe: stats.net_sharpe,
        max_drawdown: stats.max_drawdown,
        longest_drawdown_days: stats.longest_drawdown_days,
        doubled_slippage_net_edge: stress_compound - 1.,
        dsr_probability: dsr,
        trials: total_trials,
        independent_trials: total_trials,
        externally_verified_oos_locks: verified_locks,
    };
    let result = serde_json::json!({"agent_id":study.base.strategy.agent_id,"mode":"backtest","metrics":stats,"gate":crate::validation::gate(&evidence),"evidence":evidence,"bootstrap":bootstrap,"windows":chosen,"sensitivity":survival,"prev_hash":log.tip(),"verification_url":"/roots"});
    log.append(study.base.through, "walk_forward_report", &result)?;
    Ok(result)
}
