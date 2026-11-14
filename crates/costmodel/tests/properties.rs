use proptest::prelude::*;
proptest! {
 #[test]
 fn slippage_and_capacity_properties(size in 1_f64..1_000_000.,depth in 100_f64..100_000_000.,k in 0.1_f64..1000.) {
  let v=costmodel::Venue{protocol_bps:1.,lp_bps:3.,slippage_k:k,calibration_id:"property-test-only".into()};
  let input=costmodel::Inputs{notional_usd:size,depth_usd:depth,funding_bps_per_hour:0.,borrow_bps_per_day:0.,holding_hours:0.,gas_usd:0.,priority_usd:0.};
  let q=costmodel::quote(&v,&input);prop_assert!(q.is_ok());
  if let Ok(q)=q {prop_assert!(q.slippage_bps>=2.);prop_assert!(q.total_bps>=q.slippage_bps);prop_assert!(q.max_hourly_fill_usd<=size);let deeper=costmodel::quote(&v,&costmodel::Inputs{depth_usd:depth*2.,..input});prop_assert!(deeper.is_ok());if let Ok(d)=deeper {prop_assert!(d.slippage_bps<=q.slippage_bps);}}
 }
}
