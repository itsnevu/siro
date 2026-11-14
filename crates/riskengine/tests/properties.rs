use proptest::prelude::*;
proptest! {
 #[test]
 fn no_risk_cap_bypass(weight in 0_f64..1.,sector in 0_f64..1.,units in 0_f64..100.,drawdown in 0_f64..1.,kill in any::<bool>()) {
  let p=riskengine::Policy{max_weight:0.2,target_vol_pct:1.,risk_units_per_weight:100.,permit_ttl_ms:4000};
  let r=riskengine::Request{decision_id:"property-test".into(),order_hash:ledger::GENESIS.into(),ts:1000,requested_weight:weight,notional_usd:weight*10000.,equity_usd:10000.,atr_pct:2.,current_risk_units:units,sector_weight:sector,max_pair_correlation:0.8,drawdown,stale_ticks:0,gap_sigma:0.,funding_bps_hour:0.,spread_ratio:1.,trades_today:0,turnover_today:0.,reducing:false,reconciliation_error:0.,reconciliation_tolerance:0.};
  let result=riskengine::evaluate(&p,&r,kill);prop_assert!(result.is_ok());if let Ok(result)=result {prop_assert!(result.weight<=p.max_weight);prop_assert!(units+result.weight*p.risk_units_per_weight<=100.+1e-10);if kill||drawdown>=0.2{prop_assert_eq!(result.weight,0.);prop_assert!(!result.veto.is_empty());}}
 }
}
