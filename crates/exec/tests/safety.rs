use execution::{Adapter, Authorized, Market, SimQueue};
use ledger::Result;
#[test]
fn queue_next_open_kill_and_tamper() -> Result<()> {
    let order = engine::Order {
        horizon_h: 24,
        decision_id: "d".into(),
        asset: "A".into(),
        side: "buy".into(),
        notional_usd: 10000.,
        original_notional_usd: 10000.,
        eligible_open_ts: 3600000,
        expected_edge_bps: 100.,
        reducing: false,
    };
    let request = riskengine::Request {
        decision_id: "d".into(),
        order_hash: ledger::hash(&order)?,
        ts: 3600000,
        requested_weight: 0.1,
        notional_usd: 10000.,
        equity_usd: 100000.,
        atr_pct: 2.,
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
    let key = [42u8; 32];
    let permit = riskengine::sign(riskengine::evaluate(&policy, &request, false)?, &key)?;
    let market = Market {
        ts: 3600000,
        asset: "A".into(),
        open: 100.,
        depth_usd: 1000000.,
        funding_bps_hour: 0.,
        borrow_bps_day: 0.,
        gas_usd: 0.,
        priority_usd: 0.,
    };
    let venue = costmodel::Venue {
        protocol_bps: 1.,
        lp_bps: 3.,
        slippage_k: 100.,
        calibration_id: "test-only".into(),
    };
    let make = |killed| Authorized {
        order: &order,
        permit: &permit,
        request: &request,
        market: &market,
        venue: &venue,
        key: &key,
        killed,
        available_units: 0.,
    };
    let fill = SimQueue.execute(make(false))?;
    assert!((fill.quantity * fill.price - 2000.).abs() < 1e-6);
    assert!(SimQueue.execute(make(true)).is_err());
    let mut bad = permit.clone();
    bad.notional_usd *= 2.;
    assert!(SimQueue
        .execute(Authorized {
            permit: &bad,
            ..make(false)
        })
        .is_err());
    let mut early = market.clone();
    early.ts = 0;
    assert!(SimQueue
        .execute(Authorized {
            market: &early,
            ..make(false)
        })
        .is_err());
    Ok(())
}
