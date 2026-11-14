//! Pure quotes. Venue fees and asset calibration must be supplied, never guessed.
pub mod calibration;
/// Parent-order estimate includes five transaction gas payments when impact queues 20% slices.
pub fn decision_quote(venue: &Venue, input: &Inputs) -> Result<Quote, Error> {
    let mut q = quote(venue, input)?;
    if q.max_hourly_fill_usd < input.notional_usd {
        q.total_bps += q.gas_bps * 4.;
        q.gas_bps *= 5.;
    }
    if !q.total_bps.is_finite() {
        return Err(Error("queued cost arithmetic overflows"));
    }
    Ok(q)
}
use serde::{Deserialize, Serialize};
#[derive(Debug, thiserror::Error)]
#[error("invalid cost inputs: {0}")]
pub struct Error(pub &'static str);
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Venue {
    pub protocol_bps: f64,
    pub lp_bps: f64,
    pub slippage_k: f64,
    pub calibration_id: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Inputs {
    pub notional_usd: f64,
    pub depth_usd: f64,
    pub funding_bps_per_hour: f64,
    pub borrow_bps_per_day: f64,
    pub holding_hours: f64,
    pub gas_usd: f64,
    pub priority_usd: f64,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Quote {
    pub slippage_bps: f64,
    pub protocol_bps: f64,
    pub lp_bps: f64,
    pub funding_bps: f64,
    pub borrow_bps: f64,
    pub gas_bps: f64,
    pub total_bps: f64,
    pub max_hourly_fill_usd: f64,
}
pub fn quote(venue: &Venue, i: &Inputs) -> Result<Quote, Error> {
    if venue.calibration_id.trim().is_empty() {
        return Err(Error("asset fill calibration is required"));
    }
    let values = [
        venue.protocol_bps,
        venue.lp_bps,
        venue.slippage_k,
        i.notional_usd,
        i.depth_usd,
        i.funding_bps_per_hour,
        i.borrow_bps_per_day,
        i.holding_hours,
        i.gas_usd,
        i.priority_usd,
    ];
    if values.iter().any(|x| !x.is_finite() || *x < 0.)
        || i.notional_usd <= 0.
        || i.depth_usd <= 0.
        || venue.slippage_k <= 0.
    {
        return Err(Error(
            "positive notional, depth, calibration and finite nonnegative costs required",
        ));
    }
    let slippage_bps = (venue.slippage_k * (i.notional_usd / i.depth_usd).powf(0.6)).max(2.);
    let funding_bps = i.funding_bps_per_hour * i.holding_hours;
    let borrow_bps = i.borrow_bps_per_day * i.holding_hours / 24.;
    let gas_bps = (i.gas_usd + i.priority_usd) / i.notional_usd * 10_000.;
    let total_bps =
        slippage_bps + venue.protocol_bps + venue.lp_bps + funding_bps + borrow_bps + gas_bps;
    if !total_bps.is_finite() {
        return Err(Error("cost arithmetic overflows"));
    }
    Ok(Quote {
        slippage_bps,
        protocol_bps: venue.protocol_bps,
        lp_bps: venue.lp_bps,
        funding_bps,
        borrow_bps,
        gas_bps,
        total_bps,
        max_hourly_fill_usd: if i.notional_usd > i.depth_usd * 0.005 {
            i.notional_usd * 0.2
        } else {
            i.notional_usd
        },
    })
}
/// Actual carry is accrued separately each hour; quotes are not booked a second time.
pub fn carry_usd(
    notional: f64,
    funding_bps: f64,
    borrow_daily_bps: f64,
    hours: f64,
) -> Result<f64, Error> {
    if [notional, funding_bps, borrow_daily_bps, hours]
        .iter()
        .any(|v| !v.is_finite() || *v < 0.)
    {
        return Err(Error("invalid carry"));
    }
    let cost = notional * (funding_bps * hours + borrow_daily_bps * hours / 24.) / 10_000.;
    if !cost.is_finite() {
        return Err(Error("carry overflow"));
    }
    Ok(cost)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn monotonic_cost_and_partial_fill_invariants() -> Result<(), Error> {
        let venue = Venue {
            protocol_bps: 1.,
            lp_bps: 3.,
            slippage_k: 100.,
            calibration_id: "historical-fill-calibration".into(),
        };
        let mut previous = 0.;
        for n in 1..=1000 {
            let i = Inputs {
                notional_usd: n as f64 * 100.,
                depth_usd: 1_000_000.,
                funding_bps_per_hour: 1.,
                borrow_bps_per_day: 2.,
                holding_hours: 24.,
                gas_usd: 0.,
                priority_usd: 0.,
            };
            let q = quote(&venue, &i)?;
            assert!(q.slippage_bps >= 2. && q.slippage_bps >= previous);
            assert!(q.max_hourly_fill_usd <= i.notional_usd);
            if i.notional_usd > 5000. {
                assert_eq!(q.max_hourly_fill_usd, i.notional_usd * 0.2);
            }
            assert_eq!(q.funding_bps, 24.);
            assert_eq!(q.borrow_bps, 2.);
            previous = q.slippage_bps;
        }
        assert_eq!(carry_usd(1000., 1., 24., 1.)?, 0.2);
        assert!(carry_usd(f64::NAN, 0., 0., 1.).is_err());
        Ok(())
    }
}
