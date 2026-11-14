// Phase 17: daily reconciliation of reported numbers against fills and on-chain balances.
// Runs at 00:05 UTC for the previous UTC day. Better blank than wrong: an unreconciled agent's
// numbers are hidden from public boards until a reconciled run supersedes them.
export const TOLERANCE = 0.005; // 0.5%

/**
 * Recompute equity from first principles: cash after fills and costs, plus on-chain units at the
 * day-end price. `fills` [{quantity, price, fees_usd, external_fees_usd}], `carry` [usd],
 * `onchain` {units: {ASSET: n}, cash_usd}, `prices` {ASSET: usd}.
 */
export function derivedEquity({ initial, fills, carry, prices }) {
  let cash = initial;
  const units = {};
  for (const f of fills) {
    cash -= f.quantity * f.price + f.fees_usd + (f.external_fees_usd ?? 0);
    units[f.asset] = (units[f.asset] ?? 0) + f.quantity;
  }
  for (const c of carry) cash -= c;
  let equity = cash;
  for (const [asset, n] of Object.entries(units)) {
    if (n === 0) continue;
    if (!(prices[asset] > 0)) throw new Error(`no day-end price for ${asset}`);
    equity += n * prices[asset];
  }
  return { cash, units, equity };
}

/**
 * Reconcile one agent-day. Three numbers must agree within tolerance:
 * reported net equity (from the journal's valuation), equity derived from fills, and equity
 * implied by on-chain balances (paper/backtest runs have no on-chain side and say so).
 */
export function reconcile({ agentId, day, reported, derived, onchain, prices, tolerance = TOLERANCE }) {
  const diffs = [];
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);
  const reportVsDerived = rel(reported.net_equity, derived.equity);
  diffs.push({ check: "reported_vs_fills", reported: reported.net_equity, expected: derived.equity, relative: reportVsDerived });
  let onchainEquity = null;
  if (onchain) {
    onchainEquity = onchain.cash_usd + Object.entries(onchain.units).reduce((s, [a, n]) => s + n * (prices[a] ?? NaN), 0);
    diffs.push({ check: "fills_vs_onchain", reported: derived.equity, expected: onchainEquity, relative: rel(derived.equity, onchainEquity) });
    for (const asset of Object.keys({ ...derived.units, ...onchain.units })) {
      const a = derived.units[asset] ?? 0, b = onchain.units[asset] ?? 0;
      if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(b))) diffs.push({ check: `units_${asset}`, reported: a, expected: b, relative: rel(a, b) });
    }
  }
  const worst = Math.max(...diffs.map(d => (Number.isFinite(d.relative) ? d.relative : Infinity)));
  const status = worst > tolerance ? "unreconciled" : onchain ? "reconciled" : "reconciled_offchain_only";
  return { agent_id: agentId, day, status, worst_relative_diff: worst, tolerance, diffs, onchain_checked: !!onchain };
}

/** Public board filter: hide every number of an agent whose latest reconciliation failed. */
export function publishable(reports, reconciliations) {
  const latest = new Map();
  for (const r of reconciliations) {
    const prev = latest.get(r.agent_id);
    if (!prev || r.day > prev.day) latest.set(r.agent_id, r);
  }
  return reports.map(rep => {
    const r = latest.get(rep.agent_id);
    if (!r) return { agent_id: rep.agent_id, status: "unreconciled", hidden: true, reason: "never reconciled" };
    if (r.status === "unreconciled") return { agent_id: rep.agent_id, status: "unreconciled", hidden: true, reason: `difference ${(r.worst_relative_diff * 100).toFixed(2)}% on ${r.day}` };
    return { ...rep, reconciliation: { status: r.status, day: r.day }, hidden: false };
  });
}

/** Audit trail entry for any change to a published number: who, when, old, new. Append-only. */
export function auditEntry({ who, when, agentId, field, oldValue, newValue, reason }) {
  if (!who || !reason) throw new Error("audit entries need an actor and a reason");
  return { at: new Date(when).toISOString(), who, agent_id: agentId, field, old_value: oldValue, new_value: newValue, reason };
}

/** Next run instant: 00:05 UTC after `now`. */
export function nextRun(now) {
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 5);
  return t > now ? t : t + 86_400_000;
}
