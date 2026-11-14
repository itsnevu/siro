// Phase 16: decay detection and automatic kill. Pure state machine over daily observations.
//
// Triggers (decay_warning when at least 2 hold):
//   T1 net Sharpe of the last 30 days < 0
//   T2 rolling-90d net drawdown > 1.5 x the backtest drawdown
//   T3 rolling-90d Brier score worse than the backtest Brier by more than 20%
//   T4 expected edge below estimated cost on 20 consecutive trades
// Warning scales positions by 0.5 and shows a public badge. decay_halt after 60 days in warning
// without recovery. halted is permanent and the agent goes to the graveyard; nothing is deleted.
export const WARN_SCALE = 0.5;
export const HALT_AFTER_DAYS = 60;
const DAY = 86_400_000;

const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
const sd = v => { const m = mean(v); return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)); };

/** Annualised net Sharpe from daily net returns; null when undefined. */
export function sharpe(returns) {
  if (returns.length < 2) return null;
  const s = sd(returns);
  return s > 0 ? (mean(returns) * Math.sqrt(365)) / s : null;
}
export function maxDrawdown(equity) {
  let peak = -Infinity, dd = 0;
  for (const e of equity) { peak = Math.max(peak, e); dd = Math.max(dd, 1 - e / peak); }
  return dd;
}
export const brier = preds => (preds.length ? mean(preds.map(([p, y]) => (p - (y ? 1 : 0)) ** 2)) : null);

/** Longest current run of trades whose expected edge did not exceed estimated cost. */
export function edgeBelowCostStreak(trades) {
  let n = 0;
  for (let i = trades.length - 1; i >= 0 && trades[i].expected_edge_bps <= trades[i].cost_estimate_bps; i--) n++;
  return n;
}

/**
 * Evaluate one day. `days` are [{ts, net_equity, net_return}] up to and including today,
 * `predictions` [{ts, p, up}] resolved by today, `trades` [{ts, expected_edge_bps, cost_estimate_bps}],
 * `baseline` {max_drawdown, brier} from the frozen backtest, `prior` the previous state.
 */
export function evaluate({ today, days, predictions, trades, baseline, prior = { status: "active", warning_since: null } }) {
  if (prior.status === "halted") return prior; // permanent
  const in90 = days.filter(d => d.ts > today - 90 * DAY && d.ts <= today);
  const in30 = days.filter(d => d.ts > today - 30 * DAY && d.ts <= today);
  const p90 = predictions.filter(p => p.ts > today - 90 * DAY && p.ts <= today);
  const metrics = {
    sharpe_net_30d: sharpe(in30.map(d => d.net_return)),
    sharpe_net_90d: sharpe(in90.map(d => d.net_return)),
    max_drawdown_90d: maxDrawdown(in90.map(d => d.net_equity)),
    hit_rate_90d: p90.length ? p90.filter(p => (p.p >= 0.5) === p.up).length / p90.length : null,
    brier_90d: brier(p90.map(p => [p.p, p.up])),
    edge_below_cost_streak: edgeBelowCostStreak(trades.filter(t => t.ts <= today)),
  };
  // A trigger needs enough data to be meaningful; insufficient data never fires it.
  const triggers = {
    sharpe_negative_30d: in30.length >= 20 && metrics.sharpe_net_30d !== null && metrics.sharpe_net_30d < 0,
    drawdown_vs_backtest: baseline.max_drawdown > 0 && metrics.max_drawdown_90d > 1.5 * baseline.max_drawdown,
    brier_worse_20pct: baseline.brier > 0 && p90.length >= 50 && metrics.brier_90d > 1.2 * baseline.brier,
    edge_below_cost_20: metrics.edge_below_cost_streak >= 20,
  };
  const fired = Object.values(triggers).filter(Boolean).length;
  let status = prior.status, warning_since = prior.warning_since, reason = null;
  if (fired >= 2) {
    if (status === "active") { status = "decay_warning"; warning_since = today; }
    if (today - warning_since >= HALT_AFTER_DAYS * DAY) { status = "halted"; reason = "decay_halt"; }
  } else if (status === "decay_warning") {
    status = "active"; warning_since = null; // recovered
  }
  return { status, warning_since, reason, position_scale: status === "decay_warning" ? WARN_SCALE : status === "halted" ? 0 : 1, badge: status === "active" ? null : status, metrics, triggers, evaluated_at: today };
}

/** Graveyard row for a halted agent: last numbers are frozen, never removed. */
export function graveyardRow(agent, state) {
  if (state.status !== "halted") throw new Error("only halted agents enter the graveyard");
  return { agent_id: agent.agent_id, version: agent.version, strategy_hash: agent.strategy_hash, mode: agent.mode, started: agent.started, died: new Date(state.evaluated_at).toISOString(), cause: state.reason, last_net_sharpe_90d: state.metrics.sharpe_net_90d, last_max_drawdown_90d: state.metrics.max_drawdown_90d, triggers: Object.keys(state.triggers).filter(k => state.triggers[k]) };
}
