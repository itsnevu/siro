use ledger::*;
fn decision() -> Result<Decision> {
    let tick = 48 * 3_600_000;
    let mut d = Decision {
        decision_id: decision_id("test", 1, tick)?,
        agent_id: "test".into(),
        agent_version: 1,
        parent_version: None,
        strategy_hash: hash(&"strategy")?,
        tick_ts: timestamp(tick)?,
        commit_ts: timestamp(tick + 1000)?,
        reveal_ts: timestamp(tick + 3_600_000)?,
        prev_hash: GENESIS.into(),
        commit_hash: String::new(),
        universe_snapshot_hash: hash(&"universe")?,
        features: [
            ("z_48h".into(), -3.),
            ("rsi_14".into(), 20.),
            ("atr_pct".into(), 2.),
        ]
        .into(),
        regime_label: "chop".into(),
        action: "hold".into(),
        target_weight: 0.,
        notional_usd: 0.,
        predicted_prob_up: 0.5,
        horizon_h: 24,
        expected_edge_bps: 20.,
        cost_estimate_bps: 21.,
        rationale_struct: Rationale {
            rule_id: "dip".into(),
            threshold: -2.5,
            observed: -3.,
        },
        rationale_text: "z_48h=-3 below -2.5, cost 21 exceeds edge 20".into(),
        risk_veto: vec![],
        risk_adjusted: true,
        confidence: 0.5,
        supersedes: None,
    };
    d.seal()?;
    Ok(d)
}
#[test]
fn commit_recovery_tamper_and_idempotency() -> Result<()> {
    let path = std::env::temp_dir().join(format!("siro-ledger-{}.jsonl", std::process::id()));
    let d = decision()?;
    {
        let mut log = Journal::open(&path)?;
        let a = log.commit(&d)?;
        let b = log.commit(&d)?;
        assert_eq!(a.event_hash, b.event_hash);
        assert_eq!(log.events().len(), 1);
        assert!(Journal::open(&path).is_err());
    }
    assert_eq!(read_events(&path)?.len(), 1);
    let bytes = std::fs::read(&path)?;
    let mut changed = bytes.clone();
    let n = changed
        .iter()
        .position(|v| *v == b'z')
        .ok_or("test byte absent")?;
    changed[n] = b'x';
    std::fs::write(&path, changed)?;
    assert!(read_events(&path).is_err());
    std::fs::write(&path, &bytes[..bytes.len() - 1])?;
    assert!(read_events(&path).is_err());
    std::fs::remove_file(path)?;
    Ok(())
}
#[test]
fn every_merkle_leaf_has_independent_proof() -> Result<()> {
    for count in 1..=17 {
        let leaves = (0..count).map(|i| hash(&i)).collect::<Result<Vec<_>>>()?;
        let root = merkle_root(&leaves)?;
        for (i, leaf) in leaves.iter().enumerate() {
            let p = merkle_proof(&leaves, i)?;
            assert!(verify_proof(leaf, &p, &root)?);
            assert!(!verify_proof(&hash(&"tamper")?, &p, &root)?);
        }
    }
    Ok(())
}
#[test]
fn canonical_golden_and_invalid_timing() -> Result<()> {
    assert_eq!(
        String::from_utf8(canonical(&serde_json::json!({"z":3,"a":1.0}))?)?,
        "{\"a\":1,\"z\":3}"
    );
    let mut d = decision()?;
    let first = canonical(&d)?;
    d.seal()?;
    assert_eq!(first, canonical(&d)?);
    d.commit_ts = timestamp(millis(&d.tick_ts)? + 5000)?;
    assert!(d.seal().is_err());
    Ok(())
}
