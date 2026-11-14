use hmac::{Hmac, Mac};
use ledger::{Result, Veto};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Policy {
    pub max_weight: f64,
    pub target_vol_pct: f64,
    pub risk_units_per_weight: f64,
    pub permit_ttl_ms: i64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub decision_id: String,
    pub order_hash: String,
    pub ts: i64,
    pub requested_weight: f64,
    pub notional_usd: f64,
    pub equity_usd: f64,
    pub atr_pct: f64,
    pub current_risk_units: f64,
    pub sector_weight: f64,
    pub max_pair_correlation: f64,
    pub drawdown: f64,
    pub stale_ticks: u32,
    pub gap_sigma: f64,
    pub funding_bps_hour: f64,
    pub spread_ratio: f64,
    pub trades_today: u32,
    pub turnover_today: f64,
    pub reducing: bool,
    pub reconciliation_error: f64,
    pub reconciliation_tolerance: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Permit {
    pub request_hash: String,
    pub ts: i64,
    pub valid_until: i64,
    pub weight: f64,
    pub notional_usd: f64,
    pub veto: Vec<Veto>,
    pub adjustments: Vec<Veto>,
    pub mac: String,
}
pub fn governor(dd: f64) -> f64 {
    if dd >= 0.20 {
        0.
    } else if dd >= 0.15 {
        0.25
    } else if dd >= 0.10 {
        0.5
    } else if dd >= 0.05 {
        0.75
    } else {
        1.
    }
}
pub fn evaluate(p: &Policy, r: &Request, kill: bool) -> Result<Permit> {
    let vals = [
        p.max_weight,
        p.target_vol_pct,
        p.risk_units_per_weight,
        r.requested_weight,
        r.notional_usd,
        r.equity_usd,
        r.atr_pct,
        r.current_risk_units,
        r.sector_weight,
        r.drawdown,
        r.gap_sigma,
        r.funding_bps_hour,
        r.spread_ratio,
        r.turnover_today,
        r.reconciliation_error,
        r.reconciliation_tolerance,
    ];
    if vals.iter().any(|v| !v.is_finite() || *v < 0.)
        || p.max_weight > 1.
        || p.target_vol_pct <= 0.
        || p.risk_units_per_weight <= 0.
        || r.equity_usd <= 0.
        || r.requested_weight > 1.
        || !r.max_pair_correlation.is_finite()
        || r.max_pair_correlation.abs() > 1.
        || r.drawdown > 1.
        || p.permit_ttl_ms <= 0
        || p.permit_ttl_ms > 5000
        || !ledger::is_hash(&r.order_hash)
    {
        return Err("invalid risk policy or telemetry".into());
    }
    let mut veto = Vec::new();
    let mut adjustments = Vec::new();
    let mut check = |yes: bool, code: &str, observed: f64, limit: f64| {
        if yes {
            veto.push(Veto {
                code: code.into(),
                observed,
                limit,
            });
        }
    };
    check(kill, "manual_kill", 1., 0.);
    // The drawdown kill blocks new risk only: exits stay allowed so positions are never locked open.
    check(
        r.drawdown >= 0.20 && !r.reducing,
        "automatic_kill_drawdown",
        r.drawdown,
        0.20,
    );
    check(
        r.reconciliation_error > r.reconciliation_tolerance,
        "position_mismatch",
        r.reconciliation_error,
        r.reconciliation_tolerance,
    );
    if !r.reducing {
        check(r.stale_ticks > 2, "stale_data", r.stale_ticks as f64, 2.);
        check(r.gap_sigma > 3., "gap", r.gap_sigma, 3.);
        check(r.funding_bps_hour > 10., "funding", r.funding_bps_hour, 10.);
        check(r.spread_ratio > 5., "spread", r.spread_ratio, 5.);
        check(
            r.trades_today >= 6,
            "daily_trades",
            r.trades_today as f64,
            6.,
        );
        check(
            r.turnover_today + r.notional_usd / r.equity_usd > 0.25,
            "daily_turnover",
            r.turnover_today + r.notional_usd / r.equity_usd,
            0.25,
        );
        check(
            r.current_risk_units > 100.,
            "risk_budget",
            r.current_risk_units,
            100.,
        );
    }
    let vol_cap = if r.atr_pct > 0. {
        p.target_vol_pct / r.atr_pct
    } else {
        p.max_weight
    };
    let mut weight = r.requested_weight.min(p.max_weight).min(vol_cap);
    if !r.reducing {
        weight = weight.min((p.max_weight - r.sector_weight).max(0.));
    }
    if !r.reducing {
        weight = weight.min((0.4 - r.sector_weight).max(0.));
        weight = weight.min((100. - r.current_risk_units).max(0.) / p.risk_units_per_weight);
        if r.max_pair_correlation > 0.75 {
            weight *= 0.5;
            adjustments.push(Veto {
                code: "correlation_trim".into(),
                observed: r.max_pair_correlation,
                limit: 0.75,
            });
        }
        weight *= governor(r.drawdown);
    }
    if weight < r.requested_weight {
        adjustments.push(Veto {
            code: "weight_trim".into(),
            observed: r.requested_weight,
            limit: weight,
        });
    }
    if !veto.is_empty() {
        weight = 0.;
    }
    let notional = if r.requested_weight > 0. {
        r.notional_usd * (weight / r.requested_weight).min(1.)
    } else {
        0.
    };
    Ok(Permit {
        request_hash: ledger::hash(r)?,
        ts: r.ts,
        valid_until: r
            .ts
            .checked_add(p.permit_ttl_ms)
            .ok_or("permit timestamp overflow")?,
        weight,
        notional_usd: notional,
        veto,
        adjustments,
        mac: String::new(),
    })
}
fn message(p: &Permit) -> Result<Vec<u8>> {
    let mut v = serde_json::to_value(p)?;
    v.as_object_mut().ok_or("invalid permit")?.remove("mac");
    ledger::canonical(&v)
}
pub fn sign(mut p: Permit, key: &[u8]) -> Result<Permit> {
    if key.len() < 32 {
        return Err("risk MAC key must contain at least 32 bytes".into());
    }
    let mut mac = Hmac::<sha2::Sha256>::new_from_slice(key)?;
    mac.update(&message(&p)?);
    p.mac = hex::encode(mac.finalize().into_bytes());
    Ok(p)
}
pub fn verify(p: &Permit, r: &Request, key: &[u8], now: i64) -> Result<()> {
    if key.len() < 32
        || p.request_hash != ledger::hash(r)?
        || now < p.ts
        || now > p.valid_until
        || !p.veto.is_empty()
        || !p.weight.is_finite()
        || p.weight <= 0.
        || p.weight > r.requested_weight
        || !p.notional_usd.is_finite()
        || p.notional_usd <= 0.
        || p.notional_usd > r.notional_usd
    {
        return Err("risk permit denied, stale or mismatched".into());
    }
    let mut mac = Hmac::<sha2::Sha256>::new_from_slice(key)?;
    mac.update(&message(p)?);
    mac.verify_slice(&hex::decode(&p.mac)?)?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn request() -> Request {
        Request {
            decision_id: "id".into(),
            order_hash: ledger::GENESIS.into(),
            ts: 1000,
            requested_weight: 0.1,
            notional_usd: 100.,
            equity_usd: 10000.,
            atr_pct: 2.,
            current_risk_units: 50.,
            sector_weight: 0.1,
            max_pair_correlation: 0.5,
            drawdown: 0.,
            stale_ticks: 0,
            gap_sigma: 0.,
            funding_bps_hour: 0.,
            spread_ratio: 1.,
            trades_today: 0,
            turnover_today: 0.,
            reducing: false,
            reconciliation_error: 0.,
            reconciliation_tolerance: 0.01,
        }
    }
    #[test]
    fn kill_governor_and_signed_cap_invariants() -> Result<()> {
        let policy = Policy {
            max_weight: 0.2,
            target_vol_pct: 1.,
            risk_units_per_weight: 100.,
            permit_ttl_ms: 4000,
        };
        let key = [42u8; 32];
        for n in 0..=1000 {
            let mut r = request();
            r.requested_weight = n as f64 / 1000.;
            r.current_risk_units = n as f64 / 10.;
            let p = evaluate(&policy, &r, false)?;
            assert!(p.weight <= policy.max_weight);
            assert!(r.current_risk_units + p.weight * policy.risk_units_per_weight <= 100. + 1e-10);
        }
        for (dd, scale) in [
            (0., 1.),
            (0.05, 0.75),
            (0.10, 0.5),
            (0.15, 0.25),
            (0.20, 0.),
        ] {
            assert_eq!(governor(dd), scale);
        }
        let r = request();
        let p = sign(evaluate(&policy, &r, false)?, &key)?;
        verify(&p, &r, &key, 1001)?;
        let mut forged = p.clone();
        forged.notional_usd += 1.;
        assert!(verify(&forged, &r, &key, 1001).is_err());
        assert!(verify(&p, &r, &key, 6000).is_err());
        assert!(!evaluate(&policy, &r, true)?.veto.is_empty());
        let mut bad = r;
        bad.drawdown = 0.2;
        assert!(!evaluate(&policy, &bad, false)?.veto.is_empty());
        // Exits stay possible under the drawdown kill; only the manual kill stops them.
        let mut exit = bad.clone();
        exit.drawdown = 0.25;
        exit.reducing = true;
        let permit = evaluate(&policy, &exit, false)?;
        assert!(
            permit.veto.is_empty(),
            "drawdown kill must not lock a position open"
        );
        assert!(!evaluate(&policy, &exit, true)?.veto.is_empty());
        bad.drawdown = 0.;
        bad.stale_ticks = 3;
        assert!(evaluate(&policy, &bad, false)?
            .veto
            .iter()
            .any(|v| v.code == "stale_data"));
        Ok(())
    }
}
