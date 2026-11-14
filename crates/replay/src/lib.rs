//! Phase 1 causal feature replay. No orders or claimed trading performance.
pub mod batch;
mod lock_verification;
mod risk_client;
pub mod runtime;
pub mod study;
pub mod validation;
use serde::{Deserialize, Serialize};
use tickstore::{Result, TickStore, HOUR_MS};
#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub struct FeatureRecord {
    pub schema_version: u32,
    pub asset: String,
    pub tick_ts: i64,
    pub earliest_execution_open_ts: i64,
    pub features: features::FeatureSet,
}
pub fn run(
    store: &impl TickStore,
    asset: &str,
    from: i64,
    through: i64,
) -> Result<Vec<FeatureRecord>> {
    if from > through || from % HOUR_MS != 0 || through % HOUR_MS != 0 {
        return Err(tickstore::Error::Invalid("invalid replay range".into()));
    }
    let mut records = Vec::new();
    let mut tick = from;
    loop {
        records.push(FeatureRecord {
            schema_version: 1,
            asset: asset.into(),
            tick_ts: tick,
            // A bar closes at tick; the following bar opens at the same boundary.
            earliest_execution_open_ts: tick,
            features: features::compute(store, asset, tick)?,
        });
        if tick == through {
            break;
        }
        tick = tick
            .checked_add(HOUR_MS)
            .ok_or_else(|| tickstore::Error::Invalid("timestamp overflow".into()))?;
    }
    Ok(records)
}
