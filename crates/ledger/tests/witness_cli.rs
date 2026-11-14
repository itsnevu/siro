use serde_json::json;
use std::process::Command;

fn run(journal: &std::path::Path, receipt: &serde_json::Value) -> ledger::Result<bool> {
    let dir = journal.parent().ok_or("journal has no parent")?;
    let path = dir.join("receipt.json");
    std::fs::write(&path, receipt.to_string())?;
    Ok(Command::new(env!("CARGO_BIN_EXE_ledger"))
        .args(["witness-receipt"])
        .arg(journal)
        .arg(&path)
        .status()?
        .success())
}

#[test]
fn witness_receipt_requires_matching_root_and_is_idempotent() -> ledger::Result<()> {
    let dir = std::env::temp_dir().join(format!("siro-witness-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir)?;
    let journal = dir.join("anchor.jsonl");
    let leaves = vec!["ab".repeat(32), "cd".repeat(32), "ef".repeat(32)];
    let root = ledger::merkle_root(&leaves)?;
    let tx = format!("0x{}", "11".repeat(32));
    let good = json!({"root":root,"leaves":leaves,"chain_id":1,"contract":"0x0","tx_hash":tx,
        "block_hash":tx,"block_number":"7","block_timestamp_ms":1_700_000_000_000_i64,
        "confirmations":2,"confirmed_at":1_700_000_001_000_i64});
    let mut forged = good.clone();
    forged["root"] = json!("00".repeat(32));
    assert!(
        !run(&journal, &forged)?,
        "root not derived from leaves must be rejected"
    );
    let mut shallow = good.clone();
    shallow["confirmations"] = json!(1);
    assert!(
        !run(&journal, &shallow)?,
        "fewer than two confirmations must be rejected"
    );
    assert!(run(&journal, &good)?);
    assert!(run(&journal, &good)?);
    let events = ledger::read_events(&journal)?;
    assert_eq!(
        events
            .iter()
            .filter(|e| e.kind == "witness_confirmed")
            .count(),
        1
    );
    std::fs::remove_dir_all(&dir)?;
    Ok(())
}
