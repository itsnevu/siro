//! The only adapter boundary. A valid risk permit is mandatory for every fill.
use ledger::Result;
use serde::{Deserialize, Serialize};
/// Error prefix for an order the live bridge proved was never executed (exit code 3):
/// the sender nonce moved past it, or a cancellation mined, and the executor id is unset.
/// Only this outcome lets the runner cancel and continue; every other live error halts.
pub const NOT_EXECUTED: &str = "live order provably not executed";
const NOT_EXECUTED_EXIT: i32 = 3;
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Market {
    pub ts: i64,
    pub asset: String,
    pub open: f64,
    pub depth_usd: f64,
    pub funding_bps_hour: f64,
    pub borrow_bps_day: f64,
    pub gas_usd: f64,
    pub priority_usd: f64,
}
pub struct Authorized<'a> {
    pub order: &'a engine::Order,
    pub permit: &'a riskengine::Permit,
    pub request: &'a riskengine::Request,
    pub market: &'a Market,
    pub venue: &'a costmodel::Venue,
    pub key: &'a [u8],
    pub killed: bool,
    pub available_units: f64,
}
pub trait Adapter {
    fn execute(&self, authorized: Authorized<'_>) -> Result<engine::Fill>;
}
pub struct Paper;
pub struct SimQueue;
fn fill(a: Authorized<'_>, queue: bool) -> Result<engine::Fill> {
    riskengine::verify(a.permit, a.request, a.key, a.market.ts)?;
    if a.killed
        || a.order.reducing && a.order.side != "sell"
        || a.market.asset != a.order.asset
        || a.market.ts < a.order.eligible_open_ts
        || !a.market.open.is_finite()
        || a.market.open <= 0.
        || a.request.order_hash != ledger::hash(a.order)?
    {
        return Err("execution halted, wrong order, or invalid next-open market".into());
    }
    let cap = if queue && a.order.original_notional_usd > a.market.depth_usd * 0.005 {
        a.order.original_notional_usd * 0.2
    } else {
        a.order.notional_usd
    };
    let limit = a.order.notional_usd.min(a.permit.notional_usd).min(cap);
    let mut notional = limit;
    let quote_for = |notional| {
        costmodel::quote(
            a.venue,
            &costmodel::Inputs {
                notional_usd: notional,
                depth_usd: a.market.depth_usd,
                funding_bps_per_hour: a.market.funding_bps_hour,
                borrow_bps_per_day: a.market.borrow_bps_day,
                holding_hours: 0.,
                gas_usd: a.market.gas_usd,
                priority_usd: a.market.priority_usd,
            },
        )
    };
    let mut q = quote_for(notional)?;
    let approval = costmodel::quote(
        a.venue,
        &costmodel::Inputs {
            notional_usd: notional,
            depth_usd: a.market.depth_usd,
            funding_bps_per_hour: a.market.funding_bps_hour,
            borrow_bps_per_day: a.market.borrow_bps_day,
            holding_hours: f64::from(a.order.horizon_h),
            gas_usd: a.market.gas_usd,
            priority_usd: a.market.priority_usd,
        },
    )?;
    if !a.order.reducing && a.order.expected_edge_bps <= approval.total_bps {
        return Err("current horizon costs exhaust expected edge".into());
    }
    let buy = a.order.side == "buy";
    let mut price = a.market.open
        * (1.
            + if buy {
                q.slippage_bps / 10000.
            } else {
                -q.slippage_bps / 10000.
            });
    if price <= 0. {
        return Err("slippage makes price invalid".into());
    }
    let mut quantity = notional / price * if buy { 1. } else { -1. };
    if !buy && -quantity > a.available_units {
        if !a.available_units.is_finite() || a.available_units <= 0. {
            return Err("no owned units available to reduce".into());
        }
        for _ in 0..32 {
            notional = a.available_units * price;
            q = quote_for(notional)?;
            price = a.market.open * (1. - q.slippage_bps / 10000.);
            if price <= 0. {
                return Err("invalid reduction price".into());
            }
        }
        quantity = -a.available_units;
        notional = a.available_units * price;
    }
    if notional > limit + 1e-6
        || q.total_bps >= 10000.
        || (!a.order.reducing && a.order.expected_edge_bps <= q.total_bps)
    {
        return Err("fill exceeds risk cap or costs consume remaining edge/notional".into());
    }
    Ok(engine::Fill {
        fill_id: ledger::hash(&(&a.order.decision_id, a.market.ts))?,
        decision_id: a.order.decision_id.clone(),
        asset: a.order.asset.clone(),
        ts: a.market.ts,
        quantity,
        price,
        fees_usd: notional * (q.protocol_bps + q.lp_bps + q.gas_bps) / 10000.,
        external_fees_usd: 0.,
        slippage_usd: quantity.abs() * (price - a.market.open).abs(),
    })
}
impl Adapter for Paper {
    fn execute(&self, a: Authorized<'_>) -> Result<engine::Fill> {
        fill(a, true)
    }
}
impl Adapter for SimQueue {
    fn execute(&self, a: Authorized<'_>) -> Result<engine::Fill> {
        fill(a, true)
    }
}
/// Live transport returns an observed receipt, never a simulated fill.
pub trait LiveTransport {
    fn submit(
        &self,
        order: &engine::Order,
        permit: &riskengine::Permit,
        request: &riskengine::Request,
        market: &Market,
        cost_quote: &costmodel::Quote,
    ) -> Result<engine::Fill>;
}
pub struct Live<T: LiveTransport> {
    pub transport: T,
}
impl<T: LiveTransport> Adapter for Live<T> {
    fn execute(&self, a: Authorized<'_>) -> Result<engine::Fill> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_millis()
            .try_into()?;
        riskengine::verify(a.permit, a.request, a.key, now)?;
        if a.killed
            || a.request.order_hash != ledger::hash(a.order)?
            || a.order.reducing && a.order.side != "sell"
            || a.market.asset != a.order.asset
            || a.market.ts < a.order.eligible_open_ts
            || a.market.ts > now
            || !a.market.open.is_finite()
            || a.market.open <= 0.
        {
            return Err("live execution denied".into());
        }
        let cap = if a.order.original_notional_usd > a.market.depth_usd * 0.005 {
            a.order.original_notional_usd * 0.2
        } else {
            a.order.notional_usd
        };
        let approval = costmodel::quote(
            a.venue,
            &costmodel::Inputs {
                notional_usd: a.order.notional_usd.min(a.permit.notional_usd).min(cap),
                depth_usd: a.market.depth_usd,
                funding_bps_per_hour: a.market.funding_bps_hour,
                borrow_bps_per_day: a.market.borrow_bps_day,
                holding_hours: f64::from(a.order.horizon_h),
                gas_usd: a.market.gas_usd,
                priority_usd: a.market.priority_usd,
            },
        )?;
        if !a.order.reducing && a.order.expected_edge_bps <= approval.total_bps {
            return Err("live horizon costs exhaust expected edge".into());
        }
        self.transport
            .submit(a.order, a.permit, a.request, a.market, &approval)
    }
}
pub struct ProcessTransport {
    pub program: std::path::PathBuf,
    pub risk_program: std::path::PathBuf,
}
impl LiveTransport for ProcessTransport {
    fn submit(
        &self,
        order: &engine::Order,
        permit: &riskengine::Permit,
        request: &riskengine::Request,
        market: &Market,
        cost_quote: &costmodel::Quote,
    ) -> Result<engine::Fill> {
        use std::io::Write;
        let mut child = std::process::Command::new("node")
            .arg(&self.program)
            .env("SIRO_RISK_PROGRAM", &self.risk_program)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::inherit())
            .spawn()?;
        let mut input = child.stdin.take().ok_or("live bridge stdin missing")?;
        input.write_all(&serde_json::to_vec(
            &serde_json::json!({"order":order,"permit":permit,"request":request,"market":market,"cost_quote":cost_quote}),
        )?)?;
        drop(input);
        let output = child.wait_with_output()?;
        if output.status.code() == Some(NOT_EXECUTED_EXIT) {
            let v: serde_json::Value = serde_json::from_slice(&output.stdout)
                .map_err(|_| "live bridge reported not-executed without a readable reason")?;
            if v["outcome"] != "not_executed" {
                return Err("live bridge exit code and outcome disagree".into());
            }
            return Err(format!(
                "{NOT_EXECUTED}: {}",
                v["reason"].as_str().unwrap_or("unspecified")
            )
            .into());
        }
        if !output.status.success() {
            return Err("live bridge failed; reconcile its durable outbox before retry".into());
        }
        if output.stdout.len() > 65536 {
            return Err("live bridge output too large".into());
        }
        Ok(serde_json::from_slice(&output.stdout)?)
    }
}
