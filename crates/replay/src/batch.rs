//! Bounded parallel runs over real configured datasets; no generated market input.
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Run {
    pub family: String,
    pub config: crate::runtime::Config,
}
pub async fn run(runs: Vec<Run>) -> ledger::Result<serde_json::Value> {
    if runs.is_empty() || runs.len() > 4000 {
        return Err("batch requires 1..4000 explicit run configurations".into());
    }
    let mut paths = BTreeSet::new();
    let mut assets = BTreeSet::new();
    let mut families = BTreeSet::new();
    let mut pairs = BTreeSet::new();
    let mut resumed = 0;
    let mut full_span = true;
    for r in &runs {
        if !["backtest", "sim-queue"].contains(&r.config.mode.as_str()) || r.family.is_empty() {
            return Err("parallel batches are restricted to labeled offline backtests".into());
        }
        let path = if r.config.journal.is_absolute() {
            r.config.journal.clone()
        } else {
            std::env::current_dir()?.join(&r.config.journal)
        };
        if !paths.insert(path) {
            return Err("batch jobs must use distinct journals".into());
        }
        resumed += usize::from(r.config.journal.exists());
        assets.insert(r.config.strategy.asset.clone());
        families.insert(r.family.clone());
        pairs.insert((r.family.clone(), r.config.strategy.asset.clone()));
        let start =
            chrono::DateTime::from_timestamp_millis(r.config.from).ok_or("batch start overflow")?;
        full_span &= start
            .checked_add_months(chrono::Months::new(36))
            .is_some_and(|end| end.timestamp_millis() <= r.config.through);
    }
    let target_shape = runs.len() == 400
        && assets.len() == 40
        && families.len() == 10
        && pairs.len() == 400
        && full_span
        && resumed == 0;
    let run_count = runs.len();
    let started = std::time::Instant::now();
    let permits = std::sync::Arc::new(tokio::sync::Semaphore::new(8));
    let mut jobs = tokio::task::JoinSet::new();
    for r in runs {
        let permits = permits.clone();
        jobs.spawn(async move {
            let _permit = permits.acquire_owned().await.map_err(|e| e.to_string())?;
            let id = r.config.strategy.agent_id.clone();
            crate::runtime::run(&r.config)
                .await
                .map(|report| serde_json::json!({"family":r.family,"agent_id":id,"report":report}))
                .map_err(|e| format!("{id}: {e}"))
        });
    }
    let mut reports = Vec::new();
    let mut failures = Vec::new();
    while let Some(job) = jobs.join_next().await {
        match job {
            Ok(Ok(report)) => reports.push(report),
            Ok(Err(error)) => failures.push(error),
            Err(error) => failures.push(error.to_string()),
        }
    }
    reports.sort_by(|a, b| a["agent_id"].as_str().cmp(&b["agent_id"].as_str()));
    let elapsed = started.elapsed().as_secs_f64();
    let host_parallelism = std::thread::available_parallelism()?.get();
    Ok(
        serde_json::json!({"runs":run_count,"assets":assets.len(),"families":families.len(),"concurrency":8,"detected_host_parallelism":host_parallelism,"resumed_runs":resumed,"seconds":elapsed,"target_dataset_shape":target_shape,"runtime_target_met":target_shape&&host_parallelism<=8&&failures.is_empty()&&elapsed<300.,"reports":reports,"failures":failures}),
    )
}
