//! Timely-publication verdict. A decision counts as publicly committed in time only when an
//! independent chain witness of a batch containing its commit hash has a block timestamp
//! no earlier than the tick, no later than the reveal, and within the allowed lag after
//! the tick. The block timestamp is the only clock trusted here; commit_ts is self-reported.
use ledger::{Decision, Event, Result};
use serde_json::{json, Value};

pub const DEFAULT_MAX_LAG_MS: i64 = 300_000;

pub fn max_lag_ms() -> Result<i64> {
    match std::env::var("SIRO_PUBLICATION_MAX_LAG_MS") {
        Ok(v) => {
            let lag: i64 = v.parse()?;
            if !(0..=3_600_000).contains(&lag) {
                return Err("SIRO_PUBLICATION_MAX_LAG_MS must be within 0..=3600000".into());
            }
            Ok(lag)
        }
        Err(_) => Ok(DEFAULT_MAX_LAG_MS),
    }
}

/// Earliest confirmed witness whose batch contains the commit hash.
fn earliest<'a>(commit_hash: &str, anchor_events: &'a [Event]) -> Option<(&'a Value, usize)> {
    anchor_events
        .iter()
        .filter(|e| e.kind == "witness_confirmed")
        .filter_map(|e| {
            let index = e.payload["leaves"]
                .as_array()?
                .iter()
                .position(|l| l.as_str() == Some(commit_hash))?;
            Some((&e.payload, index))
        })
        .min_by_key(|(p, _)| p["block_timestamp_ms"].as_i64().unwrap_or(i64::MAX))
}

pub fn verdict(d: &Decision, anchor_events: &[Event], max_lag: i64) -> Result<Value> {
    let tick = ledger::millis(&d.tick_ts)?;
    let reveal = ledger::millis(&d.reveal_ts)?;
    let Some((w, index)) = earliest(&d.commit_hash, anchor_events) else {
        return Ok(
            json!({"proven":false,"reason":"no confirmed chain witness contains this commit hash","max_lag_ms":max_lag}),
        );
    };
    let leaves: Vec<String> = serde_json::from_value(w["leaves"].clone())?;
    let root = w["root"].as_str().ok_or("witness root missing")?;
    if ledger::merkle_root(&leaves)? != root {
        return Err("witness receipt root does not match its leaves".into());
    }
    let at = w["block_timestamp_ms"]
        .as_i64()
        .ok_or("witness timestamp missing")?;
    let lag = at - tick;
    let reason = if at < tick {
        "witnessed before the tick closed; features cannot have come from the closed bar"
    } else if at > reveal {
        "witnessed after reveal; the content was already public"
    } else if lag > max_lag {
        "witnessed too long after the tick; price movement was observable before publication"
    } else {
        "witnessed on chain within the allowed lag after the tick and before reveal"
    };
    Ok(json!({
        "proven": at >= tick && at <= reveal && lag <= max_lag,
        "reason": reason,
        "witnessed_at": ledger::timestamp(at)?,
        "lag_from_tick_ms": lag,
        "max_lag_ms": max_lag,
        "root": root,
        "proof": ledger::merkle_proof(&leaves, index)?,
        "chain_id": w["chain_id"],
        "contract": w["contract"],
        "tx_hash": w["tx_hash"],
        "block_number": w["block_number"],
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn decision(tick: &str, reveal: &str, commit: &str) -> Result<Decision> {
        Ok(serde_json::from_value(json!({
            "decision_id":"0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b","agent_id":"a","agent_version":1,
            "parent_version":null,"strategy_hash":"0".repeat(64),"tick_ts":tick,"commit_ts":tick,
            "reveal_ts":reveal,"prev_hash":"0".repeat(64),"commit_hash":commit,
            "universe_snapshot_hash":"0".repeat(64),"features":{},"regime_label":"bull","action":"hold",
            "target_weight":0.0,"notional_usd":0.0,"predicted_prob_up":0.5,"horizon_h":1,
            "expected_edge_bps":0.0,"cost_estimate_bps":0.0,
            "rationale_struct":{"rule_id":"r","threshold":0.0,"observed":0.0},"rationale_text":"",
            "risk_veto":[],"risk_adjusted":false,"confidence":0.0
        }))?)
    }
    fn witness(leaves: &[String], at: i64) -> Result<Event> {
        Ok(Event {
            seq: 0,
            ts: at,
            prev_hash: ledger::GENESIS.into(),
            event_hash: ledger::GENESIS.into(),
            kind: "witness_confirmed".into(),
            payload: json!({"root":ledger::merkle_root(leaves)?,"leaves":leaves,
                "block_timestamp_ms":at,"chain_id":1,"contract":"0x","tx_hash":"0x","block_number":"1"}),
        })
    }
    #[test]
    fn timely_late_early_and_missing() -> Result<()> {
        let c = "ab".repeat(32);
        let other = "cd".repeat(32);
        let d = decision("2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z", &c)?;
        let tick = ledger::millis(&d.tick_ts)?;
        let leaves = vec![other.clone(), c.clone()];
        assert_eq!(verdict(&d, &[], 300_000)?["proven"], false);
        let v = verdict(&d, &[witness(&leaves, tick + 30_000)?], 300_000)?;
        assert_eq!(v["proven"], true);
        assert_eq!(v["lag_from_tick_ms"], 30_000);
        assert_eq!(
            verdict(&d, &[witness(&leaves, tick + 600_000)?], 300_000)?["proven"],
            false
        );
        assert_eq!(
            verdict(&d, &[witness(&leaves, tick - 1)?], 300_000)?["proven"],
            false
        );
        assert_eq!(
            verdict(&d, &[witness(&leaves, tick + 3_600_001)?], 3_600_000)?["proven"],
            false
        );
        // The earliest witness wins: a late re-witness cannot hide an early one, nor the reverse.
        let both = [
            witness(std::slice::from_ref(&c), tick + 900_000)?,
            witness(&leaves, tick + 10_000)?,
        ];
        assert_eq!(verdict(&d, &both, 300_000)?["lag_from_tick_ms"], 10_000);
        // A receipt whose root does not match its leaves is rejected, not trusted.
        let mut forged = witness(&leaves, tick + 1)?;
        forged.payload["root"] = json!(other);
        assert!(verdict(&d, &[forged], 300_000).is_err());
        Ok(())
    }
}
