//! The live bridge's exit code decides whether the runner may cancel and continue (provably
//! not executed) or must halt (anything else). These tests run fake bridges through node.
use execution::{LiveTransport, Market, ProcessTransport, NOT_EXECUTED};
use ledger::Result;

fn submit(script: &str) -> Result<std::result::Result<engine::Fill, String>> {
    let dir = std::env::temp_dir().join(format!("siro-bridge-{}", std::process::id()));
    std::fs::create_dir_all(&dir)?;
    let program = dir.join(format!("{}.mjs", ledger::hash(&script)?));
    std::fs::write(&program, script)?;
    let order = engine::Order {
        horizon_h: 1,
        decision_id: "d".into(),
        asset: "A".into(),
        side: "buy".into(),
        notional_usd: 10.,
        original_notional_usd: 10.,
        eligible_open_ts: 0,
        expected_edge_bps: 100.,
        reducing: false,
    };
    let request = riskengine::Request {
        decision_id: "d".into(),
        order_hash: ledger::hash(&order)?,
        ts: 0,
        requested_weight: 0.1,
        notional_usd: 10.,
        equity_usd: 100.,
        atr_pct: 1.,
        current_risk_units: 0.,
        sector_weight: 0.,
        max_pair_correlation: 0.,
        drawdown: 0.,
        stale_ticks: 0,
        gap_sigma: 0.,
        funding_bps_hour: 0.,
        spread_ratio: 1.,
        trades_today: 0,
        turnover_today: 0.,
        reducing: false,
        reconciliation_error: 0.,
        reconciliation_tolerance: 0.,
    };
    let policy = riskengine::Policy {
        max_weight: 0.2,
        target_vol_pct: 1.,
        risk_units_per_weight: 100.,
        permit_ttl_ms: 4000,
    };
    let permit = riskengine::evaluate(&policy, &request, false)?;
    let market = Market {
        ts: 0,
        asset: "A".into(),
        open: 1.,
        depth_usd: 1e6,
        funding_bps_hour: 0.,
        borrow_bps_day: 0.,
        gas_usd: 0.,
        priority_usd: 0.,
    };
    let quote = costmodel::Quote {
        slippage_bps: 2.,
        protocol_bps: 0.,
        lp_bps: 0.,
        funding_bps: 0.,
        borrow_bps: 0.,
        gas_bps: 0.,
        total_bps: 2.,
        max_hourly_fill_usd: 10.,
    };
    let transport = ProcessTransport {
        program,
        risk_program: "unused".into(),
    };
    Ok(transport
        .submit(&order, &permit, &request, &market, &quote)
        .map_err(|e| e.to_string()))
}

#[test]
fn only_a_well_formed_not_executed_report_is_classified_as_not_executed() -> Result<()> {
    let drain = "for await (const _ of process.stdin) {}";
    let proven = submit(&format!(
        r#"{drain} process.stdout.write(JSON.stringify({{outcome:"not_executed",reason:"nonce consumed"}}), () => process.exit(3));"#
    ))?;
    assert!(proven
        .as_ref()
        .is_err_and(|e| e.starts_with(NOT_EXECUTED) && e.ends_with("nonce consumed")));

    let unreadable = submit(&format!("{drain} process.exit(3);"))?;
    assert!(unreadable
        .as_ref()
        .is_err_and(|e| !e.starts_with(NOT_EXECUTED)));

    let mismatched = submit(&format!(
        r#"{drain} process.stdout.write(JSON.stringify({{outcome:"mined"}}), () => process.exit(3));"#
    ))?;
    assert!(mismatched
        .as_ref()
        .is_err_and(|e| !e.starts_with(NOT_EXECUTED)));

    let uncertain = submit(&format!("{drain} process.exit(1);"))?;
    assert!(uncertain
        .as_ref()
        .is_err_and(|e| !e.starts_with(NOT_EXECUTED)));
    Ok(())
}
