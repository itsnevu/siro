import test from "node:test";
import assert from "node:assert/strict";
import { redact, logger, metrics, alerts, slo, traceId } from "../services/ops/observe.mjs";

test("logs carry trace_id and never contain PII or secrets", () => {
  const lines = [];
  const log = logger("ingest", l => lines.push(l));
  assert.throws(() => log("info", "x", {}));
  log("error", "rpc_failed", { trace_id: traceId(), owner: "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01", email: "user@example.com", rpc: "https://robinhood-mainnet.g.alchemy.com/v2/SECRETKEY123", api_key: "sk-123", note: "pk 0x" + "ab".repeat(32) });
  const rec = JSON.parse(lines[0]);
  const text = lines[0];
  assert.match(rec.trace_id, /^[0-9a-f]{32}$/);
  assert.ok(!text.includes("0xAbCdEf0123456789aBcDeF0123456789AbCdEf01"));
  assert.match(rec.owner, /^wallet:[0-9a-f]{12}$/);
  assert.ok(!text.includes("user@example.com"));
  assert.ok(!text.includes("SECRETKEY123"));
  assert.equal(rec.api_key, "[redacted]");
  assert.ok(!text.includes("ab".repeat(32)));
  assert.equal(redact("0xABCDEF0123456789ABCDEF0123456789ABCDEF01"), redact("0xabcdef0123456789abcdef0123456789abcdef01"), "pseudonym is case-insensitive");
});

test("metrics counters and Prometheus exposition", () => {
  const m = metrics();
  m.inc("risk_vetoes_total", { reason: "daily_turnover" });
  m.inc("risk_vetoes_total", { reason: "daily_turnover" });
  m.inc("late_ticks_total");
  m.set("price_deviation", { asset: "NVDA" }, 0.0003);
  assert.equal(m.get("risk_vetoes_total", { reason: "daily_turnover" }), 2);
  assert.match(m.expose(), /siro_risk_vetoes_total\{reason="daily_turnover"\} 2/);
  assert.match(m.expose(), /siro_late_ticks_total 1/);
});

test("alert rules: 3 consecutive late ticks, deviation > 1%, recon drift > 0.5%", () => {
  const ticks = [1, 2, 3, 4].map(i => ({ agent_id: "a", ts: i, late: i !== 1 })).concat([{ agent_id: "b", ts: 1, late: true }, { agent_id: "b", ts: 2, late: false }, { agent_id: "b", ts: 3, late: true }]);
  const out = alerts({ ticks, deviations: [{ asset: "NVDA", ts: 1, deviation: 0.012 }, { asset: "AAPL", ts: 1, deviation: 0.009 }], recon: [{ agent_id: "a", day: "d", worst_relative_diff: 0.006 }, { agent_id: "b", day: "d", worst_relative_diff: 0.004 }] });
  assert.deepEqual(out.map(a => a.rule + ":" + (a.agent_id ?? a.asset)), ["late_ticks_3:a", "price_deviation:NVDA", "recon_drift:a"]);
});

test("SLO computation", () => {
  const ticks = Array.from({ length: 1000 }, (_, i) => ({ late: i < 4 }));
  const s = slo({ ticks, latenciesMs: Array.from({ length: 100 }, (_, i) => i * 10), probes: Array.from({ length: 1000 }, (_, i) => ({ ok: i !== 0 })) });
  assert.equal(s.on_time_ticks.met, true);
  assert.equal(s.p99_decision_latency_ms.value, 980);
  assert.equal(s.p99_decision_latency_ms.met, false);
  assert.equal(s.api_uptime.met, true);
  assert.equal(slo({ ticks: [], latenciesMs: [], probes: [] }).api_uptime.met, null);
});
