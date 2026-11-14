//! Paired gross/net statistics. Undefined ratios are null, never fabricated zeroes.
use serde::{Deserialize, Serialize};
#[derive(Debug, thiserror::Error)]
#[error("invalid metrics: {0}")]
pub struct Error(pub &'static str);
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Observation {
    pub ts: i64,
    pub gross_equity: f64,
    pub net_equity: f64,
    pub turnover_usd: f64,
    pub exposure: f64,
    pub spy_return: f64,
    pub qqq_return: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Benchmark {
    pub alpha_annual: Option<f64>,
    pub beta: Option<f64>,
    pub information_ratio: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Stats {
    pub gross_return: f64,
    pub net_return: f64,
    pub gross_sharpe: Option<f64>,
    pub net_sharpe: Option<f64>,
    pub sortino: Option<f64>,
    pub calmar: Option<f64>,
    pub max_drawdown: f64,
    pub longest_drawdown_days: f64,
    pub tail_ratio: Option<f64>,
    pub hit_rate: Option<f64>,
    pub average_win: Option<f64>,
    pub average_loss: Option<f64>,
    pub turnover: f64,
    pub time_in_market: f64,
    pub average_exposure: f64,
    pub spy: Benchmark,
    pub qqq: Benchmark,
}
fn mean(v: &[f64]) -> f64 {
    v.iter().sum::<f64>() / v.len() as f64
}
fn variance(v: &[f64]) -> f64 {
    let m = mean(v);
    v.iter().map(|x| (x - m).powi(2)).sum::<f64>() / (v.len() - 1) as f64
}
fn ratio(a: f64, b: f64) -> Option<f64> {
    if b > 0. && a.is_finite() && b.is_finite() {
        let result = a / b;
        result.is_finite().then_some(result)
    } else {
        None
    }
}
pub fn sharpe(v: &[f64], periods: f64) -> Option<f64> {
    if v.len() < 2 {
        None
    } else {
        ratio(mean(v) * periods.sqrt(), variance(v).sqrt())
    }
}
fn benchmark(r: &[f64], b: &[f64], periods: f64) -> Benchmark {
    let vol_r = variance(r).sqrt();
    let vol_b = variance(b).sqrt();
    if vol_b == 0. {
        return Benchmark {
            alpha_annual: None,
            beta: None,
            information_ratio: None,
        };
    }
    let matched: Vec<f64> = b.iter().map(|x| x * vol_r / vol_b).collect();
    let covariance = r
        .iter()
        .zip(&matched)
        .map(|(x, y)| (x - mean(r)) * (y - mean(&matched)))
        .sum::<f64>()
        / (r.len() - 1) as f64;
    let beta = ratio(covariance, variance(&matched));
    let active: Vec<f64> = r.iter().zip(&matched).map(|(x, y)| x - y).collect();
    Benchmark {
        alpha_annual: beta.map(|v| (mean(r) - v * mean(&matched)) * periods),
        beta,
        information_ratio: sharpe(&active, periods),
    }
}
pub fn calculate(
    rows: &[Observation],
    initial: f64,
    trade_net_pnl: &[f64],
) -> Result<Stats, Error> {
    if rows.len() < 3
        || !initial.is_finite()
        || initial <= 0.
        || trade_net_pnl.iter().any(|x| !x.is_finite())
    {
        return Err(Error(
            "at least 3 equity observations and positive initial equity required",
        ));
    }
    if rows.iter().any(|r| r.ts < 0) {
        return Err(Error("negative timestamps are unsupported"));
    }
    let interval = rows[1].ts - rows[0].ts;
    if interval <= 0 {
        return Err(Error("timestamps must increase"));
    }
    for (i, r) in rows.iter().enumerate() {
        if [
            r.gross_equity,
            r.net_equity,
            r.turnover_usd,
            r.exposure,
            r.spy_return,
            r.qqq_return,
        ]
        .iter()
        .any(|v| !v.is_finite())
            || r.gross_equity <= 0.
            || r.net_equity <= 0.
            || r.turnover_usd < 0.
            || r.exposure < 0.
            || (i > 0 && r.ts - rows[i - 1].ts != interval)
        {
            return Err(Error("invalid equity series or irregular interval"));
        }
    }
    let periods = 365.25 * 86_400_000. / interval as f64;
    let mut gross = Vec::new();
    let mut net = Vec::new();
    let mut last_g = initial;
    let mut last_n = initial;
    let mut peak = initial;
    let mut dd: f64 = 0.;
    let mut dd_start = rows[0].ts;
    let mut longest = 0;
    let mut underwater = false;
    for r in rows {
        gross.push(r.gross_equity / last_g - 1.);
        net.push(r.net_equity / last_n - 1.);
        last_g = r.gross_equity;
        last_n = r.net_equity;
        if r.net_equity >= peak {
            if underwater {
                longest = longest.max(r.ts - dd_start);
            }
            peak = r.net_equity;
            dd_start = r.ts;
            underwater = false;
        } else {
            underwater = true;
            dd = dd.max(1. - r.net_equity / peak);
            longest = longest.max(r.ts - dd_start);
        }
    }
    let downs = (net.iter().map(|x| x.min(0.).powi(2)).sum::<f64>() / net.len() as f64).sqrt();
    let mut sorted = net.clone();
    sorted.sort_by(f64::total_cmp);
    let wins: Vec<f64> = trade_net_pnl.iter().copied().filter(|x| *x > 0.).collect();
    let losses: Vec<f64> = trade_net_pnl.iter().copied().filter(|x| *x < 0.).collect();
    let years = (rows.len() as f64) / periods;
    let net_return = last_n / initial - 1.;
    if !net_return.is_finite() || !(last_g / initial - 1.).is_finite() {
        return Err(Error("return arithmetic overflows"));
    }
    Ok(Stats {
        gross_return: last_g / initial - 1.,
        net_return,
        gross_sharpe: sharpe(&gross, periods),
        net_sharpe: sharpe(&net, periods),
        sortino: ratio(mean(&net) * periods.sqrt(), downs),
        calmar: ratio((last_n / initial).powf(1. / years) - 1., dd),
        max_drawdown: dd,
        longest_drawdown_days: longest as f64 / 86_400_000.,
        tail_ratio: ratio(
            sorted[(sorted.len() - 1) * 95 / 100],
            sorted[(sorted.len() - 1) * 5 / 100].abs(),
        ),
        hit_rate: ratio(wins.len() as f64, trade_net_pnl.len() as f64),
        average_win: if wins.is_empty() {
            None
        } else {
            Some(mean(&wins))
        },
        average_loss: if losses.is_empty() {
            None
        } else {
            Some(mean(&losses))
        },
        turnover: rows.iter().map(|r| r.turnover_usd).sum::<f64>() / initial,
        time_in_market: rows.iter().filter(|r| r.exposure > 0.).count() as f64 / rows.len() as f64,
        average_exposure: rows.iter().map(|r| r.exposure).sum::<f64>() / rows.len() as f64,
        spy: benchmark(
            &net,
            &rows.iter().map(|r| r.spy_return).collect::<Vec<_>>(),
            periods,
        ),
        qqq: benchmark(
            &net,
            &rows.iter().map(|r| r.qqq_return).collect::<Vec<_>>(),
            periods,
        ),
    })
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Reliability {
    pub count: usize,
    pub mean_prediction: Option<f64>,
    pub observed_frequency: Option<f64>,
}
pub fn calibration(values: &[(f64, bool)]) -> Result<(Option<f64>, Vec<Reliability>), Error> {
    if values
        .iter()
        .any(|(p, _)| !p.is_finite() || !(0. ..=1.).contains(p))
    {
        return Err(Error("probability outside [0,1]"));
    }
    let curve = (0..10)
        .map(|i| {
            let bin: Vec<_> = values
                .iter()
                .filter(|(p, _)| ((*p * 10.) as usize).min(9) == i)
                .collect();
            let n = bin.len();
            Reliability {
                count: n,
                mean_prediction: ratio(bin.iter().map(|(p, _)| *p).sum(), n as f64),
                observed_frequency: ratio(bin.iter().filter(|(_, y)| *y).count() as f64, n as f64),
            }
        })
        .collect();
    Ok((
        ratio(
            values
                .iter()
                .map(|(p, y)| (p - if *y { 1. } else { 0. }).powi(2))
                .sum(),
            values.len() as f64,
        ),
        curve,
    ))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fees_are_paired_and_calibration_is_measured() -> Result<(), Error> {
        let rows: Vec<_> = (1..=100)
            .map(|i| Observation {
                ts: i * 3_600_000,
                gross_equity: 100. + i as f64,
                net_equity: 100. + i as f64 * 0.9,
                turnover_usd: 1.,
                exposure: 0.5,
                spy_return: 0.001 * (i % 3) as f64,
                qqq_return: 0.001 * (i % 5) as f64,
            })
            .collect();
        let s = calculate(&rows, 100., &[2., -1., 3.])?;
        assert!(s.gross_return > s.net_return);
        assert_eq!(s.max_drawdown, 0.);
        let (score, curve) = calibration(&[(1., true), (0., false)])?;
        assert_eq!(score, Some(0.));
        assert_eq!(curve[9].count, 1);
        assert_eq!(curve[0].count, 1);
        Ok(())
    }
}
