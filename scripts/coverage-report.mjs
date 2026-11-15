// Coverage report for an ingested market directory: hourly bars per symbol per day and per month,
// gaps (missing hours inside the window), and data-quality counts from the manifest.
//   node scripts/coverage-report.mjs --data DIR [--out FILE]
// Deterministic: same input files, same output.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const data = arg("data");
if (!data) throw new Error("usage: --data DIR [--out FILE]");
const H = 3_600_000;
const manifest = JSON.parse(readFileSync(join(data, "manifest.json"), "utf8"));
const rows = readFileSync(join(data, "market.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).market);

const bySymbol = new Map();
for (const r of rows) {
  if (!bySymbol.has(r.asset)) bySymbol.set(r.asset, new Set());
  bySymbol.get(r.asset).add(r.ts);
}
const symbols = [...bySymbol.keys()].sort();
const report = { generated_from: manifest.window ?? null, symbols: {}, total_gaps: 0 };
for (const s of symbols) {
  const ts = [...bySymbol.get(s)].sort((a, b) => a - b);
  const first = ts[0], last = ts.at(-1);
  const gaps = [];
  for (let t = first; t <= last; t += H) if (!bySymbol.get(s).has(t)) gaps.push(new Date(t).toISOString());
  const months = {}, days = {};
  for (const t of ts) {
    const iso = new Date(t).toISOString();
    months[iso.slice(0, 7)] = (months[iso.slice(0, 7)] ?? 0) + 1;
    days[iso.slice(0, 10)] = (days[iso.slice(0, 10)] ?? 0) + 1;
  }
  report.symbols[s] = {
    first: new Date(first).toISOString(), last: new Date(last).toISOString(), hours: ts.length,
    gaps, months, days_partial: Object.entries(days).filter(([, n]) => n < 24).map(([d, n]) => `${d}=${n}`),
    quality: manifest.counts?.[s] ?? null,
  };
  report.total_gaps += gaps.length;
}
const out = arg("out");
const text = JSON.stringify(report, null, 2);
if (out) writeFileSync(out, text + "\n");
console.log(text);
