//! Offline venue calibration from observed historical fills, bounded by availability.
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FillSample {
    pub asset: String,
    pub available_ts: i64,
    pub notional_usd: f64,
    pub depth_usd: f64,
    pub observed_slippage_bps: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Calibration {
    pub asset: String,
    pub valid_from: i64,
    pub latest_sample_ts: i64,
    pub sample_count: usize,
    pub slippage_k: f64,
    pub rms_error_bps: f64,
}
pub fn calibrate(
    asset: &str,
    samples: &[FillSample],
    as_of: i64,
) -> Result<Calibration, super::Error> {
    if asset.is_empty() || as_of < 0 {
        return Err(super::Error("invalid calibration boundary"));
    }
    let mut selected = Vec::new();
    for s in samples {
        if s.asset != asset || s.available_ts >= as_of {
            continue;
        }
        if s.available_ts < 0
            || [s.notional_usd, s.depth_usd, s.observed_slippage_bps]
                .iter()
                .any(|v| !v.is_finite() || *v < 0.)
            || s.notional_usd == 0.
            || s.depth_usd == 0.
        {
            return Err(super::Error("invalid fill calibration sample"));
        }
        selected.push(s);
    }
    let uncensored: Vec<_> = selected
        .iter()
        .filter(|s| s.observed_slippage_bps > 2.)
        .collect();
    if uncensored.len() < 20 {
        return Err(super::Error(
            "at least 20 observed above-floor fills required for identifiable calibration",
        ));
    }
    let mut xy = 0.;
    let mut xx = 0.;
    for s in uncensored {
        let x = (s.notional_usd / s.depth_usd).powf(0.6);
        xy += x * s.observed_slippage_bps;
        xx += x * x;
    }
    let k = xy / xx;
    let rms = (selected
        .iter()
        .map(|s| {
            ((k * (s.notional_usd / s.depth_usd).powf(0.6)).max(2.) - s.observed_slippage_bps)
                .powi(2)
        })
        .sum::<f64>()
        / selected.len() as f64)
        .sqrt();
    if !k.is_finite() || k <= 0. || !rms.is_finite() {
        return Err(super::Error("calibration arithmetic overflow"));
    }
    let latest = selected
        .iter()
        .map(|s| s.available_ts)
        .max()
        .ok_or(super::Error("no fills"))?;
    Ok(Calibration {
        asset: asset.into(),
        valid_from: as_of,
        latest_sample_ts: latest,
        sample_count: selected.len(),
        slippage_k: k,
        rms_error_bps: rms,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn calibration_never_uses_future_fills() -> Result<(), super::super::Error> {
        let mut samples: Vec<_> = (1..=50)
            .map(|i| {
                let size = i as f64 * 100.;
                FillSample {
                    asset: "TEST".into(),
                    available_ts: i,
                    notional_usd: size,
                    depth_usd: 10000.,
                    observed_slippage_bps: 100. * (size / 10000.).powf(0.6),
                }
            })
            .collect();
        let a = calibrate("TEST", &samples, 40)?;
        assert!((a.slippage_k - 100.).abs() < 1e-10);
        for s in &mut samples {
            if s.available_ts >= 40 {
                s.observed_slippage_bps = 9999.;
            }
        }
        let b = calibrate("TEST", &samples, 40)?;
        assert_eq!(a.slippage_k, b.slippage_k);
        assert_eq!(a.sample_count, 39);
        Ok(())
    }
}
