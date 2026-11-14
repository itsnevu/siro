use chrono::{DateTime, Months};
use ledger::Result;
use serde::{Deserialize, Serialize};
use statrs::distribution::{ContinuousCDF, Normal};
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Window {
    pub train_start: i64,
    pub train_end: i64,
    pub test_start: i64,
    pub test_end: i64,
}
pub fn windows(start: i64, end: i64, training_months: u32) -> Result<Vec<Window>> {
    if training_months == 0 || start >= end {
        return Err("invalid walk-forward boundaries".into());
    }
    let mut cursor = DateTime::from_timestamp_millis(start).ok_or("start overflow")?;
    let mut result = vec![];
    loop {
        let train_end = cursor
            .checked_add_months(Months::new(training_months))
            .ok_or("calendar overflow")?;
        let test_end = train_end
            .checked_add_months(Months::new(1))
            .ok_or("calendar overflow")?;
        if test_end.timestamp_millis() > end {
            break;
        }
        result.push(Window {
            train_start: cursor.timestamp_millis(),
            train_end: train_end.timestamp_millis(),
            test_start: train_end.timestamp_millis(),
            test_end: test_end.timestamp_millis(),
        });
        cursor = cursor
            .checked_add_months(Months::new(1))
            .ok_or("calendar overflow")?;
    }
    Ok(result)
}
/// Bailey & Lopez de Prado, eq. 2/3. Nonannualized Sharpe and trial dispersion.
pub fn deflated_sharpe(returns: &[f64], trials: &[f64], independent_trials: usize) -> Result<f64> {
    if returns.len() < 3
        || trials.len() < 2
        || independent_trials < 2
        || independent_trials > trials.len()
        || returns.iter().chain(trials).any(|x| !x.is_finite())
    {
        return Err("DSR requires returns, full trial history and >=2 independent trials".into());
    }
    let n = returns.len() as f64;
    let mean = returns.iter().sum::<f64>() / n;
    let m2 = returns.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / n;
    if m2 <= 0. {
        return Err("DSR undefined for zero variance".into());
    }
    let sd = (m2 * n / (n - 1.)).sqrt();
    let sr = mean / sd;
    let skew = returns.iter().map(|x| (x - mean).powi(3)).sum::<f64>() / n / m2.powf(1.5);
    let kurt = returns.iter().map(|x| (x - mean).powi(4)).sum::<f64>() / n / m2.powi(2);
    let tm = trials.iter().sum::<f64>() / trials.len() as f64;
    let variance = trials.iter().map(|s| (s - tm).powi(2)).sum::<f64>() / (trials.len() - 1) as f64;
    let normal = Normal::new(0., 1.)?;
    let count = independent_trials as f64;
    let gamma = 0.577_215_664_901_532_9;
    let threshold = variance.sqrt()
        * ((1. - gamma) * normal.inverse_cdf(1. - 1. / count)
            + gamma * normal.inverse_cdf(1. - 1. / (count * std::f64::consts::E)));
    let denominator = 1. - skew * sr + (kurt - 1.) / 4. * sr * sr;
    if denominator <= 0. {
        return Err("invalid Sharpe standard error".into());
    }
    Ok(normal.cdf((sr - threshold) * (n - 1.).sqrt() / denominator.sqrt()))
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Bootstrap {
    pub iterations: usize,
    pub seed: u64,
    pub block_len: usize,
    pub sharpe_ci95: [f64; 2],
    pub drawdown_ci95: [f64; 2],
}
pub fn bootstrap(returns: &[f64], seed: u64, block_len: usize, periods: f64) -> Result<Bootstrap> {
    if returns.len() < 3
        || returns.iter().any(|r| !r.is_finite() || *r <= -1.)
        || block_len == 0
        || block_len > returns.len()
        || !periods.is_finite()
        || periods <= 0.
    {
        return Err("invalid bootstrap input".into());
    }
    let mut rng = seed;
    let mut sharpes = Vec::with_capacity(10_000);
    let mut dds = Vec::with_capacity(10_000);
    for _ in 0..10_000 {
        let mut sample = Vec::with_capacity(returns.len());
        while sample.len() < returns.len() {
            rng = rng.wrapping_mul(6364136223846793005).wrapping_add(1);
            let start = (rng >> 32) as usize % returns.len();
            for k in 0..block_len {
                if sample.len() == returns.len() {
                    break;
                }
                sample.push(returns[(start + k) % returns.len()]);
            }
        }
        let sr = metrics::sharpe(&sample, periods)
            .ok_or("bootstrap sample Sharpe undefined; insufficient return variation")?;
        sharpes.push(sr);
        let mut equity = 1.;
        let mut peak: f64 = 1.;
        let mut dd: f64 = 0.;
        for r in sample {
            equity *= 1. + r;
            peak = peak.max(equity);
            dd = dd.max(1. - equity / peak);
        }
        dds.push(dd);
    }
    sharpes.sort_by(f64::total_cmp);
    dds.sort_by(f64::total_cmp);
    Ok(Bootstrap {
        iterations: 10_000,
        seed,
        block_len,
        sharpe_ci95: [sharpes[249], sharpes[9749]],
        drawdown_ci95: [dds[249], dds[9749]],
    })
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Check {
    pub name: String,
    pub passed: bool,
    pub detail: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Gate {
    pub passed: bool,
    pub checks: Vec<Check>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Evidence {
    pub regimes: Vec<String>,
    pub windows: usize,
    pub sensitivity_survival: Vec<f64>,
    pub net_sharpe: Option<f64>,
    pub max_drawdown: f64,
    pub longest_drawdown_days: f64,
    pub doubled_slippage_net_edge: f64,
    pub dsr_probability: Option<f64>,
    pub trials: usize,
    pub independent_trials: usize,
    pub externally_verified_oos_locks: usize,
}
pub fn gate(e: &Evidence) -> Gate {
    let required = ["bull", "bear", "long_chop", "vol_shock", "gap_news"];
    let checks = vec![
        Check {
            name: "regimes".into(),
            passed: required.iter().all(|r| e.regimes.iter().any(|x| x == r)),
            detail: format!(
                "required bull/bear/long_chop/vol_shock/gap_news; observed {:?}",
                e.regimes
            ),
        },
        Check {
            name: "walk_forward".into(),
            passed: e.windows >= 12,
            detail: format!("{} windows; minimum 12", e.windows),
        },
        Check {
            name: "parameter_sensitivity".into(),
            passed: e.sensitivity_survival.len() == 18
                && e.sensitivity_survival
                    .iter()
                    .all(|v| v.is_finite() && *v >= 0.7 && *v <= 1.),
            detail: "Every +/-20% parameter perturbation must survive at least 70% of OOS windows"
                .into(),
        },
        Check {
            name: "deflated_sharpe".into(),
            passed: e.trials >= 2
                && e.independent_trials >= 2
                && e.independent_trials <= e.trials
                && e.dsr_probability
                    .is_some_and(|p| p.is_finite() && (0.95..=1.).contains(&p)),
            detail: format!(
                "DSR {:?}; total trials {}; independent trials {}; minimum probability .95",
                e.dsr_probability, e.trials, e.independent_trials
            ),
        },
        Check {
            name: "net_sharpe".into(),
            passed: e.net_sharpe.is_some_and(|s| s.is_finite() && s > 0.8),
            detail: format!("net Sharpe {:?}; must exceed .8", e.net_sharpe),
        },
        Check {
            name: "drawdown".into(),
            passed: e.max_drawdown.is_finite()
                && (0. ..0.25).contains(&e.max_drawdown)
                && e.longest_drawdown_days.is_finite()
                && (0. ..60.).contains(&e.longest_drawdown_days),
            detail: format!(
                "net DD {}; duration {} days",
                e.max_drawdown, e.longest_drawdown_days
            ),
        },
        Check {
            name: "double_slippage".into(),
            passed: e.doubled_slippage_net_edge.is_finite() && e.doubled_slippage_net_edge > 0.,
            detail: format!("net edge with 2x slippage {}", e.doubled_slippage_net_edge),
        },
        Check {
            name: "oos_publication".into(),
            passed: e.windows >= 12 && e.externally_verified_oos_locks == e.windows,
            detail: format!(
                "{} externally verified locks for {} windows",
                e.externally_verified_oos_locks, e.windows
            ),
        },
    ];
    Gate {
        passed: checks.iter().all(|c| c.passed),
        checks,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn honest_gate_and_calendar() -> Result<()> {
        let start = ledger::millis("2020-01-01T00:00:00Z")?;
        let end = ledger::millis("2022-01-01T00:00:00Z")?;
        let w = windows(start, end, 12)?;
        assert_eq!(w.len(), 12);
        assert!(w
            .iter()
            .all(|w| w.train_end == w.test_start && w.test_end > w.test_start));
        let e = Evidence {
            regimes: vec![],
            windows: 0,
            sensitivity_survival: vec![],
            net_sharpe: None,
            max_drawdown: 0.,
            longest_drawdown_days: 0.,
            doubled_slippage_net_edge: 0.,
            dsr_probability: None,
            trials: 0,
            independent_trials: 0,
            externally_verified_oos_locks: 0,
        };
        assert!(!gate(&e).passed);
        let r: Vec<f64> = (0..50)
            .map(|i| if i % 3 == 0 { -0.01 } else { 0.008 })
            .collect();
        let b = bootstrap(&r, 42, 5, 252.)?;
        assert_eq!(b.iterations, 10000);
        assert_eq!(b.sharpe_ci95, bootstrap(&r, 42, 5, 252.)?.sharpe_ci95);
        assert!((0. ..=1.).contains(&deflated_sharpe(&r, &[0.1, 0.2, -0.1], 3)?));
        Ok(())
    }
}
