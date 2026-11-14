// Phase 14: trace ids, structured JSON logs without PII, metrics, alert rules and SLOs.
import { randomBytes, createHash } from "node:crypto";

export const traceId = () => randomBytes(16).toString("hex");

// Redaction before anything is written. Wallet addresses become stable pseudonyms so incidents can
// still be correlated without exposing who the user is.
const PATTERNS = [
  [/\b0x[0-9a-fA-F]{64}\b(?=[^0-9a-fA-F]|$)/g, () => "[redacted-secret-or-hash]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, () => "[redacted-email]"],
  [/https?:\/\/[^\s"']+/g, url => { try { const u = new URL(url); return `${u.protocol}//${u.host}${u.pathname.split("/").length > 2 ? "/[path]" : ""}`; } catch { return "[url]"; } }],
  [/\b0x[0-9a-fA-F]{40}\b/g, a => `wallet:${createHash("sha256").update(a.toLowerCase()).digest("hex").slice(0, 12)}`],
];
const SECRET_KEYS = /key|secret|password|token|signature|private|mnemonic|seed|authorization/i;
export function redact(value, key = "") {
  if (SECRET_KEYS.test(key) && value !== null && value !== undefined) return "[redacted]";
  if (typeof value === "string") return PATTERNS.reduce((s, [re, f]) => s.replace(re, f), value);
  if (Array.isArray(value)) return value.map(v => redact(v));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  return value;
}

export function logger(service, write = line => process.stdout.write(line + "\n")) {
  return (level, event, fields = {}) => {
    if (!fields.trace_id) throw new Error("every log record carries a trace_id");
    write(JSON.stringify(redact({ ts: new Date().toISOString(), level, service, event, ...fields })));
  };
}

/** Metrics the spec names: late ticks, vetoes by reason, price deviation, LLM failures, position drift. */
export function metrics() {
  const counters = new Map(), gauges = new Map();
  const k = (name, labels = {}) => `${name}${Object.keys(labels).length ? JSON.stringify(labels) : ""}`;
  return {
    inc: (name, labels, by = 1) => counters.set(k(name, labels), (counters.get(k(name, labels)) ?? 0) + by),
    set: (name, labels, v) => gauges.set(k(name, labels), v),
    get: (name, labels) => counters.get(k(name, labels)) ?? gauges.get(k(name, labels)) ?? 0,
    /** Prometheus text exposition. */
    expose: () => [...counters, ...gauges].map(([key, v]) => { const i = key.indexOf("{"); const name = i < 0 ? key : key.slice(0, i); const labels = i < 0 ? "" : `{${Object.entries(JSON.parse(key.slice(i))).map(([a, b]) => `${a}="${b}"`).join(",")}}`; return `siro_${name}${labels} ${v}`; }).join("\n"),
  };
}

/**
 * Alert rules (page on-call):
 *   late_ticks_3      three consecutive late ticks for one agent
 *   price_deviation   any source deviation above 1%
 *   recon_drift       reconciliation difference above 0.5%
 */
export function alerts({ ticks = [], deviations = [], recon = [] }) {
  const out = [];
  const byAgent = new Map();
  for (const t of [...ticks].sort((a, b) => a.ts - b.ts)) {
    const run = t.late ? (byAgent.get(t.agent_id) ?? 0) + 1 : 0;
    byAgent.set(t.agent_id, run);
    if (run === 3) out.push({ rule: "late_ticks_3", agent_id: t.agent_id, at: t.ts });
  }
  for (const d of deviations) if (d.deviation > 0.01) out.push({ rule: "price_deviation", asset: d.asset, at: d.ts, value: d.deviation });
  for (const r of recon) if (r.worst_relative_diff > 0.005) out.push({ rule: "recon_drift", agent_id: r.agent_id, at: r.day, value: r.worst_relative_diff });
  return out;
}

/** SLOs: on-time ticks >= 99.5%/day, p99 decision latency < 800 ms, public API uptime >= 99.9%. */
export function slo({ ticks, latenciesMs, probes }) {
  const onTime = ticks.length ? ticks.filter(t => !t.late).length / ticks.length : null;
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const p99 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.99) - 1)] : null;
  const uptime = probes.length ? probes.filter(p => p.ok).length / probes.length : null;
  return {
    on_time_ticks: { value: onTime, target: 0.995, met: onTime === null ? null : onTime >= 0.995 },
    p99_decision_latency_ms: { value: p99, target: 800, met: p99 === null ? null : p99 < 800 },
    api_uptime: { value: uptime, target: 0.999, met: uptime === null ? null : uptime >= 0.999 },
  };
}
