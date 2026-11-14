use std::path::Path;
fn main() -> ledger::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4
        || ![
            "anchor-receipt",
            "advisory-record",
            "execution-prepared",
            "execution-receipt",
            "execution-resolution",
            "witness-receipt",
        ]
        .contains(&args[1].as_str())
    {
        return Err(
            "usage: ledger anchor-receipt|witness-receipt ANCHOR_JOURNAL RECEIPT.json".into(),
        );
    }
    let value: serde_json::Value = serde_json::from_reader(std::fs::File::open(&args[3])?)?;
    if args[1] == "witness-receipt" {
        let tx = |k: &str| {
            value[k]
                .as_str()
                .is_some_and(|s| s.starts_with("0x") && s.len() == 66)
        };
        let leaves: Vec<String> = serde_json::from_value(value["leaves"].clone())?;
        if leaves.is_empty()
            || leaves.len() > 4096
            || !value["root"].as_str().is_some_and(ledger::is_hash)
            || ledger::merkle_root(&leaves)? != value["root"].as_str().unwrap_or("")
            || !tx("tx_hash")
            || !tx("block_hash")
            || value["block_timestamp_ms"].as_i64().is_none_or(|t| t <= 0)
            || value["confirmations"].as_u64().is_none_or(|c| c < 2)
            || !value["confirmed_at"].is_i64()
        {
            return Err("invalid witness receipt".into());
        }
        let mut log = ledger::Journal::open(Path::new(&args[2]))?;
        if !log
            .events()
            .iter()
            .any(|e| e.kind == "witness_confirmed" && e.payload["root"] == value["root"])
        {
            log.append(
                value["confirmed_at"].as_i64().ok_or("timestamp missing")?,
                "witness_confirmed",
                &value,
            )?;
        }
        return Ok(());
    }
    if args[1].starts_with("execution-") {
        if !value["execution_id"]
            .as_str()
            .is_some_and(|s| s.starts_with("0x") && s.len() == 66)
            || !value["decision_id"].is_string()
            || !value["recorded_at"].is_i64()
        {
            return Err("invalid execution journal event".into());
        }
        let prepared = args[1] == "execution-prepared";
        if prepared
            && (!value["raw"]
                .as_str()
                .is_some_and(|s| s.starts_with("0x") && s.len() < 65536)
                || !value["hash"]
                    .as_str()
                    .is_some_and(|s| s.starts_with("0x") && s.len() == 66)
                || !value["order_hash"].as_str().is_some_and(ledger::is_hash)
                || !value["notional"]
                    .as_f64()
                    .is_some_and(|n| n.is_finite() && n > 0.))
        {
            return Err("invalid prepared transaction".into());
        }
        let resolution = args[1] == "execution-resolution";
        let hash66 = |k: &str| {
            value[k]
                .as_str()
                .is_some_and(|s| s.starts_with("0x") && s.len() == 66)
        };
        if resolution
            && !match value["outcome"].as_str() {
                Some("cancel_sent") => {
                    hash66("cancel_hash")
                        && value["raw"]
                            .as_str()
                            .is_some_and(|s| s.starts_with("0x") && s.len() < 65536)
                }
                Some("not_executed") => {
                    value["reason"].as_str().is_some_and(|r| !r.is_empty())
                        && (value["cancel_hash"].is_null() || hash66("cancel_hash"))
                }
                _ => false,
            }
        {
            return Err("invalid execution resolution".into());
        }
        let kind = if prepared {
            "execution_prepared"
        } else if resolution {
            "execution_resolution"
        } else {
            "execution_receipt"
        };
        let mut log = ledger::Journal::open(Path::new(&args[2]))?;
        // Idempotency key: (kind, execution_id), plus outcome for resolutions, which may
        // legitimately record cancel_sent and later not_executed for the same execution.
        if !log.events().iter().any(|e| {
            e.kind == kind
                && e.payload["execution_id"] == value["execution_id"]
                && (!resolution || e.payload["outcome"] == value["outcome"])
        }) {
            log.append(
                value["recorded_at"].as_i64().ok_or("timestamp missing")?,
                kind,
                &value,
            )?;
        }
        return Ok(());
    }
    if args[1] == "advisory-record" {
        if !value["decision_id"].is_string()
            || !value["agent_id"].is_string()
            || !value["tick_ts"].is_i64()
            || !value["observed_at"].is_i64()
            || !value["contemporaneous"].is_boolean()
            || !["llm", "rules"].contains(&value["result"]["source"].as_str().unwrap_or(""))
            || (!value["token_cost_usd"].is_null()
                && !value["token_cost_usd"]
                    .as_f64()
                    .is_some_and(|v| v.is_finite() && v >= 0.))
        {
            return Err("invalid advisory record".into());
        }
        let mut log = ledger::Journal::open(Path::new(&args[2]))?;
        if !log
            .events()
            .iter()
            .any(|e| e.kind == "advisory" && e.payload["decision_id"] == value["decision_id"])
        {
            log.append(
                value["observed_at"].as_i64().ok_or("timestamp missing")?,
                "advisory",
                &value,
            )?;
        }
        return Ok(());
    }
    if !value["root"].as_str().is_some_and(ledger::is_hash)
        || !value["day"].is_u64()
        || !value["tx_hash"]
            .as_str()
            .is_some_and(|s| s.starts_with("0x") && s.len() == 66)
        || !value["block_hash"]
            .as_str()
            .is_some_and(|s| s.starts_with("0x") && s.len() == 66)
        || !value["confirmed_at"].is_i64()
    {
        return Err("invalid anchor receipt".into());
    }
    let mut log = ledger::Journal::open(Path::new(&args[2]))?;
    if !log
        .events()
        .iter()
        .any(|e| e.kind == "anchor_confirmed" && e.payload["tx_hash"] == value["tx_hash"])
    {
        log.append(
            value["confirmed_at"].as_i64().ok_or("timestamp missing")?,
            "anchor_confirmed",
            &value,
        )?;
    }
    Ok(())
}
