//! Version 2: population z-score, bounded simple-window RSI, simple-window ATR.
use serde::{Deserialize, Serialize};
use tickstore::{Bar, Error, Result, TickStore, HOUR_MS};
pub const VERSION: &str = "features-v2-z48-pop-rsi14-bounded-atr14-simple";
pub const MAX_LOOKBACK: usize = 48;
pub const DECLARATIONS: [(&str, usize); 3] = [("z_48h", 48), ("rsi_14", 15), ("atr_pct", 15)];
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FeatureSet {
    pub version: String,
    pub z_48h: f64,
    pub rsi_14: f64,
    pub atr_pct: f64,
}

/// The feature kernel receives only a bounded, already closed window.
pub fn compute(store: &impl TickStore, asset: &str, tick_ts: i64) -> Result<FeatureSet> {
    let from = tick_ts
        .checked_sub((MAX_LOOKBACK as i64 - 1) * HOUR_MS)
        .ok_or_else(|| Error::Invalid("timestamp overflow".into()))?;
    let bars = store.query(asset, from, tick_ts)?;
    if bars.len() != MAX_LOOKBACK {
        return Err(Error::Invalid("48 contiguous closed bars required".into()));
    }
    for (i, b) in bars.iter().enumerate() {
        b.validate()?;
        if b.asset != asset || b.close_ts != from + i as i64 * HOUR_MS {
            return Err(Error::Invalid(
                "future, wrong asset, or non-contiguous feature input".into(),
            ));
        }
    }
    kernel(&bars)
}
fn kernel(bars: &[Bar]) -> Result<FeatureSet> {
    let last = bars
        .last()
        .ok_or_else(|| Error::Invalid("empty feature window".into()))?;
    let mean = bars.iter().map(|b| b.close).sum::<f64>() / 48.;
    let variance = bars.iter().map(|b| (b.close - mean).powi(2)).sum::<f64>() / 48.;
    let mut gain = 0.;
    let mut loss = 0.;
    let mut tr = 0.;
    for pair in bars[33..].windows(2) {
        let delta = pair[1].close - pair[0].close;
        gain += delta.max(0.);
        loss += (-delta).max(0.);
        tr += (pair[1].high - pair[1].low)
            .max((pair[1].high - pair[0].close).abs())
            .max((pair[1].low - pair[0].close).abs());
    }
    let result = FeatureSet {
        version: VERSION.into(),
        z_48h: if variance == 0. {
            0.
        } else {
            (last.close - mean) / variance.sqrt()
        },
        rsi_14: if gain + loss == 0. {
            50.
        } else {
            (100. * (gain / (gain + loss))).clamp(0., 100.)
        },
        atr_pct: tr / 14. / last.close * 100.,
    };
    if [result.z_48h, result.rsi_14, result.atr_pct]
        .iter()
        .any(|v| !v.is_finite())
    {
        return Err(Error::Invalid("non-finite feature arithmetic".into()));
    }
    Ok(result)
}
