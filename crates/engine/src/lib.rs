//! Pure signal and accounting state machine. No network, clock, LLM, RNG, or filesystem.
use ledger::Result;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Strategy {
    pub agent_id: String,
    pub version: u32,
    pub parent_version: Option<u32>,
    pub asset: String,
    pub entry_z: f64,
    pub exit_z: f64,
    pub max_weight: f64,
    pub horizon_h: u32,
    pub logistic_intercept: f64,
    pub logistic_z: f64,
    pub logistic_rsi: f64,
    pub up_move_bps: f64,
    pub down_move_bps: f64,
    pub trained_model_hash: String,
    /// Per-position stop loss as a fraction of average entry price (0.08 = 8%). Omitted from the
    /// serialised form when unset, so existing strategy hashes and journals are unchanged.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop_loss_pct: Option<f64>,
}
pub fn strategy_hash(strategy: &Strategy) -> Result<String> {
    ledger::hash(&(strategy, features::VERSION))
}
impl Strategy {
    pub fn validate(&self) -> Result<()> {
        if self.agent_id.is_empty()
            || self.asset.is_empty()
            || self.version == 0
            || self.horizon_h == 0
            || !ledger::is_hash(&self.trained_model_hash)
            || [
                self.entry_z,
                self.exit_z,
                self.max_weight,
                self.logistic_intercept,
                self.logistic_z,
                self.logistic_rsi,
                self.up_move_bps,
                self.down_move_bps,
            ]
            .iter()
            .any(|v| !v.is_finite())
            || self.entry_z >= self.exit_z
            || self.max_weight <= 0.
            || self.max_weight > 1.
            || self.up_move_bps <= 0.
            || self.down_move_bps <= 0.
            || self
                .stop_loss_pct
                .is_some_and(|s| !s.is_finite() || s <= 0. || s >= 1.)
        {
            return Err("invalid frozen strategy/model".into());
        }
        Ok(())
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Signal {
    pub action: String,
    pub target_weight: f64,
    pub predicted_prob_up: f64,
    pub expected_edge_bps: f64,
    pub rationale: ledger::Rationale,
    pub rationale_text: String,
    pub regime: String,
}
pub fn signal(s: &Strategy, f: &features::FeatureSet, held_weight: f64) -> Result<Signal> {
    s.validate()?;
    if !held_weight.is_finite()
        || held_weight < 0.
        || ![f.z_48h, f.rsi_14, f.atr_pct].iter().all(|x| x.is_finite())
    {
        return Err(format!(
            "invalid feature or portfolio state: held_weight={held_weight}, z={}, rsi={}, atr={}",
            f.z_48h, f.rsi_14, f.atr_pct
        )
        .into());
    }
    let score = (s.logistic_intercept + s.logistic_z * f.z_48h + s.logistic_rsi * f.rsi_14)
        .clamp(-40., 40.);
    let prob = 1. / (1. + (-score).exp());
    let edge = prob * s.up_move_bps - (1. - prob) * s.down_move_bps;
    let (action, target, threshold) = if f.z_48h < s.entry_z && held_weight < s.max_weight {
        ("buy", s.max_weight, s.entry_z)
    } else if f.z_48h > s.exit_z && held_weight > 0. {
        ("reduce", 0., s.exit_z)
    } else {
        ("hold", held_weight, s.entry_z)
    };
    Ok(Signal{action:action.into(),target_weight:target,predicted_prob_up:prob,expected_edge_bps:edge,rationale:ledger::Rationale{rule_id:"z_window_v1".into(),threshold,observed:f.z_48h},rationale_text:format!("z_48h={} compared with threshold {}; rsi_14={}, atr_pct={}; fitted probability={}, expected edge={} bps",f.z_48h,threshold,f.rsi_14,f.atr_pct,prob,edge),regime:if f.atr_pct>5.{"vol_shock"}else if f.z_48h>1.{"trending_up"}else if f.z_48h< -1.{"risk_off"}else{"chop"}.into()})
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Order {
    pub horizon_h: u32,
    pub decision_id: String,
    pub asset: String,
    pub side: String,
    pub notional_usd: f64,
    pub original_notional_usd: f64,
    pub eligible_open_ts: i64,
    pub expected_edge_bps: f64,
    pub reducing: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Fill {
    pub fill_id: String,
    pub decision_id: String,
    pub asset: String,
    pub ts: i64,
    pub quantity: f64,
    pub price: f64,
    pub fees_usd: f64,
    #[serde(default)]
    pub external_fees_usd: f64,
    pub slippage_usd: f64,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Position {
    pub units: f64,
    pub cost_basis: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct State {
    pub initial: f64,
    pub cash: f64,
    pub costs: f64,
    pub external_costs: f64,
    pub positions: BTreeMap<String, Position>,
    pub pending: BTreeMap<String, Order>,
    pub fills: BTreeSet<String>,
    pub halted: bool,
    pub realized_trade_pnl: Vec<f64>,
}
impl State {
    pub fn new(initial: f64) -> Result<Self> {
        if !initial.is_finite() || initial <= 0. {
            return Err("invalid initial capital".into());
        }
        Ok(Self {
            initial,
            cash: initial,
            costs: 0.,
            external_costs: 0.,
            positions: BTreeMap::new(),
            pending: BTreeMap::new(),
            fills: BTreeSet::new(),
            halted: false,
            realized_trade_pnl: vec![],
        })
    }
    pub fn equity(&self, prices: &BTreeMap<String, f64>) -> Result<f64> {
        let mut equity = self.cash - self.external_costs;
        for (asset, p) in &self.positions {
            if p.units == 0. {
                continue;
            }
            let price = prices
                .get(asset)
                .ok_or("position valuation price missing")?;
            if !price.is_finite() || *price <= 0. {
                return Err("invalid valuation price".into());
            }
            equity += p.units * price;
        }
        if !equity.is_finite() || equity <= 0. {
            return Err("nonpositive portfolio equity".into());
        }
        Ok(equity)
    }
    pub fn apply(&mut self, e: &ledger::Event) -> Result<()> {
        match e.kind.as_str() {
            "order" => {
                let o: Order = serde_json::from_value(e.payload.clone())?;
                if self.halted
                    || !o.notional_usd.is_finite()
                    || o.notional_usd <= 0.
                    || o.original_notional_usd < o.notional_usd
                    || !["buy", "sell"].contains(&o.side.as_str())
                {
                    return Err("invalid order event".into());
                }
                if self.pending.insert(o.decision_id.clone(), o).is_some() {
                    return Err("duplicate pending decision".into());
                }
            }
            "fill" => {
                let f: Fill = serde_json::from_value(e.payload.clone())?;
                if self.fills.contains(&f.fill_id) {
                    return Ok(());
                }
                if [
                    f.quantity,
                    f.price,
                    f.fees_usd,
                    f.external_fees_usd,
                    f.slippage_usd,
                ]
                .iter()
                .any(|v| !v.is_finite())
                    || f.price <= 0.
                    || f.fees_usd < 0.
                    || f.external_fees_usd < 0.
                    || f.slippage_usd < 0.
                {
                    return Err("invalid fill".into());
                }
                let order = self
                    .pending
                    .get_mut(&f.decision_id)
                    .ok_or("fill without pending order")?;
                if f.asset != order.asset
                    || f.ts < order.eligible_open_ts
                    || f.quantity == 0.
                    || (f.quantity > 0.) != (order.side == "buy")
                    || f.quantity.abs() * f.price > order.notional_usd + 1e-6
                {
                    return Err("fill violates committed order".into());
                }
                let p = self.positions.entry(f.asset.clone()).or_default();
                let debit = f.quantity * f.price + f.fees_usd;
                if self.cash - debit < -1e-6 || p.units + f.quantity < -1e-10 {
                    return Err("fill exceeds cash or owned position".into());
                }
                if f.quantity > 0. {
                    p.cost_basis += debit + f.external_fees_usd;
                } else {
                    let basis = p.cost_basis * (-f.quantity) / p.units;
                    self.realized_trade_pnl
                        .push(-debit - basis - f.external_fees_usd);
                    p.cost_basis -= basis;
                }
                self.cash -= debit;
                let unit_roundoff =
                    f64::EPSILON * p.units.abs().max(f.quantity.abs()).max(1.) * 64.;
                p.units += f.quantity;
                if p.units.abs() <= unit_roundoff {
                    p.units = 0.;
                    p.cost_basis = 0.;
                }
                self.costs += f.fees_usd + f.slippage_usd + f.external_fees_usd;
                self.external_costs += f.external_fees_usd;
                order.notional_usd -= f.quantity.abs() * f.price;
                if order.notional_usd < 1e-6 || (order.side == "sell" && p.units == 0.) {
                    self.pending.remove(&f.decision_id);
                }
                self.fills.insert(f.fill_id);
            }
            "carry" => {
                let amount = e.payload["cost_usd"]
                    .as_f64()
                    .ok_or("carry amount missing")?;
                if !amount.is_finite() || amount < 0. || amount > self.cash {
                    return Err("invalid or unpayable carry; halt required".into());
                }
                self.cash -= amount;
                self.costs += amount;
                if let Some(asset) = e.payload["asset"].as_str() {
                    if let Some(position) = self.positions.get_mut(asset) {
                        position.cost_basis += amount;
                    }
                }
            }
            "cancel" => {
                let id = e.payload["decision_id"]
                    .as_str()
                    .ok_or("cancel ID missing")?;
                self.pending.remove(id);
            }
            "halt" => {
                self.halted = true;
            }
            _ => {}
        }
        Ok(())
    }
    pub fn reconstruct(initial: f64, events: &[ledger::Event]) -> Result<Self> {
        let mut state = Self::new(initial)?;
        for e in events {
            state.apply(e)?;
        }
        Ok(state)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accounting_replays_and_rejects_uncommitted_fill() -> Result<()> {
        let mut s = State::new(1000.)?;
        let e = ledger::Event {
            seq: 0,
            ts: 1,
            prev_hash: ledger::GENESIS.into(),
            event_hash: ledger::GENESIS.into(),
            kind: "fill".into(),
            payload: serde_json::to_value(Fill {
                fill_id: "f".into(),
                decision_id: "d".into(),
                asset: "A".into(),
                ts: 1,
                quantity: 1.,
                price: 10.,
                fees_usd: 1.,
                external_fees_usd: 0.,
                slippage_usd: 0.,
            })?,
        };
        assert!(s.apply(&e).is_err());
        Ok(())
    }
}
