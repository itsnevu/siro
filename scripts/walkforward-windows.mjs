// Walk-forward dataset builder. Reads coverage.json (scripts/coverage-report.mjs), takes the
// range every symbol covers, and asks the engine (`replay windows`) for the calendar splits, so
// splits are deterministic and identical to the ones the release gate uses.
//   node scripts/walkforward-windows.mjs --data DIR [--train-months 3] [--out FILE]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const data = arg("data");
if (!data) throw new Error("usage: --data DIR [--train-months N] [--out FILE]");
const months = Number(arg("train-months", "3"));
const coverage = JSON.parse(readFileSync(join(data, "coverage.json"), "utf8"));
const syms = Object.values(coverage.symbols);
if (!syms.length) throw new Error("coverage.json has no symbols");
const start = Math.max(...syms.map((s) => Date.parse(s.first)));
const end = Math.min(...syms.map((s) => Date.parse(s.last)));
const bin = resolve(process.env.SIRO_BIN_DIR ?? "target/release", "replay");
const r = spawnSync(bin, ["windows", String(start), String(end), String(months)], { encoding: "utf8" });
if (r.status !== 0) throw new Error(`replay windows failed: ${r.stderr.trim()}`);
const windows = JSON.parse(r.stdout);
const needEnd = new Date(start); needEnd.setUTCMonth(needEnd.getUTCMonth() + months + 1);
const report = {
  common_range: [new Date(start).toISOString(), new Date(end).toISOString()],
  training_months: months,
  windows,
  ready: windows.length > 0,
  first_window_possible_at: windows.length ? null : needEnd.toISOString(),
  total_gaps: coverage.total_gaps,
};
const text = JSON.stringify(report, null, 2);
if (arg("out")) writeFileSync(arg("out"), text + "\n");
console.log(text);
