#[test]
fn queued_parent_accounts_for_every_transaction() -> Result<(), costmodel::Error> {
    let venue = costmodel::Venue {
        protocol_bps: 1.,
        lp_bps: 3.,
        slippage_k: 100.,
        calibration_id: "test-only".into(),
    };
    let parent = costmodel::Inputs {
        notional_usd: 10000.,
        depth_usd: 1000000.,
        funding_bps_per_hour: 0.,
        borrow_bps_per_day: 0.,
        holding_hours: 24.,
        gas_usd: 1.,
        priority_usd: 0.,
    };
    let forecast = costmodel::decision_quote(&venue, &parent)?;
    let child = costmodel::quote(
        &venue,
        &costmodel::Inputs {
            notional_usd: 2000.,
            holding_hours: 0.,
            ..parent
        },
    )?;
    assert_eq!(forecast.gas_bps / 10000. * 10000., 5.);
    assert_eq!(child.gas_bps / 10000. * 2000. * 5., 5.);
    Ok(())
}
