// Phase 10: versioned, immutable universes. Pure logic; IO lives in cli.mjs.
import { createHash } from "node:crypto";

const canonical = v => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
export const hash = v => createHash("sha256").update(canonical(v)).digest("hex");

/** The published selection rule. Changing any field changes rule_hash and therefore the version. */
export const RULE = Object.freeze({
  id: "liquid-per-sector-v1",
  description: "From the official token allowlist, keep tokens whose deepest USDG pool needs at least min_depth_usd to move price 2%, then the top per_sector tokens by that depth in each sector.",
  min_depth_usd: 5_000,
  per_sector: 3,
  recompute: "monthly, first day 00:00 UTC",
});

/**
 * Select members from candidates [{symbol, address, sector, pool, depth_usd}] by RULE.
 * Ties break by symbol so the result is deterministic.
 */
export function select(candidates, rule = RULE) {
  const eligible = candidates.filter(c => c.depth_usd >= rule.min_depth_usd);
  const bySector = new Map();
  for (const c of eligible) bySector.set(c.sector, [...(bySector.get(c.sector) ?? []), c]);
  return [...bySector.values()]
    .flatMap(list => list.sort((a, b) => b.depth_usd - a.depth_usd || a.symbol.localeCompare(b.symbol)).slice(0, rule.per_sector))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/** Immutable version record. `effective_from` is the first instant it applies. */
export function version({ effectiveFrom, candidates, rule = RULE, observedAt, observedAtMs }) {
  // A universe is chosen from data observed at a time; it can only govern ticks after that time.
  // Back-dating it would let today's survivors decide yesterday's backtest.
  if (Number.isFinite(observedAtMs) && effectiveFrom < observedAtMs) throw new Error("effective_from precedes the observation that selected the members");
  const members = select(candidates, rule).map(({ symbol, address, sector, pool, depth_usd }) => ({ symbol, address, sector, pool, depth_usd }));
  const body = { effective_from: new Date(effectiveFrom).toISOString(), rule, rule_hash: hash(rule), members, observed_at: observedAt };
  return { universe_version: hash(body).slice(0, 16), ...body, hash: hash(body) };
}

/** The version in force at `ts`: latest effective_from <= ts. Never a later version. */
export function inForce(versions, ts) {
  const valid = versions.filter(v => Date.parse(v.effective_from) <= ts).sort((a, b) => Date.parse(a.effective_from) - Date.parse(b.effective_from));
  return valid.at(-1) ?? null;
}

/**
 * Membership history for a backtest window: each version in force during [from, through] and
 * the interval it governs. A backtest must trade only members of the version in force at each tick,
 * so removing an asset today cannot change a past result.
 */
export function schedule(versions, from, through) {
  const sorted = [...versions].sort((a, b) => Date.parse(a.effective_from) - Date.parse(b.effective_from));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(Date.parse(sorted[i].effective_from), from);
    const end = Math.min(i + 1 < sorted.length ? Date.parse(sorted[i + 1].effective_from) - 1 : through, through);
    if (start <= end) out.push({ version: sorted[i].universe_version, from: start, through: end, members: sorted[i].members.map(m => m.symbol) });
  }
  return out;
}

/** hand-picked: the agent's assets differ from the automatic universe in force at its start. */
export function handPicked(agentAssets, versionInForce) {
  if (!versionInForce) return true;
  const auto = new Set(versionInForce.members.map(m => m.symbol));
  const mine = new Set(agentAssets);
  return mine.size !== auto.size || [...mine].some(a => !auto.has(a));
}
