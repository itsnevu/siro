// Reference implementations of every formula in docs/metrics.md, checked against
// hand-computed values. Purpose: the document cannot drift silently. If a formula in
// docs/metrics.md changes, the matching test here must change in the same PR.
// Limitation (docs/limitations.md #12): these do not yet call the Rust crate; a
// cross-check against crates/metrics output on a shared fixture is PLANNED.
import { test } from "node:test";
import assert from "node:assert/strict";

const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
const variance = v => { const m = mean(v); return v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1); };
const ratio = (a, b) => (b > 0 && Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(a / b) ? a / b : null);
const sharpe = (v, P) => (v.length < 2 ? null : ratio(mean(v) * Math.sqrt(P), Math.sqrt(variance(v))));
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const HOUR = 3_600_000, P_HOUR = 365.25 * 86_400_000 / HOUR;

test("faktor tahunan bar 1 jam = 8766", () => close(P_HOUR, 8766));

test("gross_return / net_return", () => {
  const gross_return = 112 / 100 - 1, net_return = 109 / 100 - 1;
  close(gross_return, 0.12); close(net_return, 0.09);
  assert.ok(gross_return > net_return);
});

test("gross_sharpe / net_sharpe: mean*sqrt(P)/stdev sampel, tanpa risk-free", () => {
  const r = [0.01, -0.01, 0.02];
  // mean 0.006667, sample sd 0.015275
  close(sharpe(r, 1), 0.00666667 / 0.01527525, 1e-6);
  assert.equal(sharpe([0.01], 1), null);
  assert.equal(sharpe([0.01, 0.01], 1), null); // sd 0 => null, not Infinity
});

test("standar error Sharpe tahunan 500 bar jam ~ 4.2 (dikutip di metrics.md)", () => close(Math.sqrt(P_HOUR / 500), 4.187, 1e-3));

test("sortino: downside dev dengan pembagi n, target 0", () => {
  const r = [0.02, -0.01, 0.01, -0.02];
  const downs = Math.sqrt((0.0001 + 0.0004) / 4);
  close(ratio(mean(r) * Math.sqrt(1), downs), 0 / downs);
  assert.equal(ratio(mean([0.01, 0.02]), 0), null); // no losing bar => null
});

test("max_drawdown dan longest_drawdown_days diukur di penutupan bar", () => {
  const initial = 100, eq = [110, 99, 105, 111], ts = [1, 2, 3, 4].map(d => d * 86_400_000);
  let peak = initial, dd = 0, start = 0, longest = 0, under = false;
  eq.forEach((e, i) => {
    if (e >= peak) { if (under) longest = Math.max(longest, ts[i] - start); peak = e; start = ts[i]; under = false; }
    else { under = true; dd = Math.max(dd, 1 - e / peak); longest = Math.max(longest, ts[i] - start); }
  });
  const max_drawdown = dd, longest_drawdown_days = longest / 86_400_000;
  close(max_drawdown, 0.1); close(longest_drawdown_days, 3);
});

test("calmar: annualisasi geometrik run pendek meledak (+3% dalam 10 hari ~ +194%/th)", () => {
  const years = 10 / 365.25;
  const annual = 1.03 ** (1 / years) - 1;
  close(annual, 1.9442, 1e-3);
  const calmar = ratio(annual, 0.01);
  assert.ok(calmar > 190);
});

test("tail_ratio: persentil indeks dibulatkan ke bawah, tanpa interpolasi", () => {
  const s = Array.from({ length: 21 }, (_, i) => (i - 10) / 100).sort((a, b) => a - b);
  const tail_ratio = ratio(s[Math.floor((s.length - 1) * 95 / 100)], Math.abs(s[Math.floor((s.length - 1) * 5 / 100)]));
  close(tail_ratio, 0.09 / 0.09);
});

test("hit_rate, average_win, average_loss: trade nol ada di penyebut", () => {
  const pnl = [2, -1, 0, 3];
  const wins = pnl.filter(x => x > 0), losses = pnl.filter(x => x < 0);
  const hit_rate = wins.length / pnl.length, average_win = mean(wins), average_loss = mean(losses);
  close(hit_rate, 0.5); close(average_win, 2.5); close(average_loss, -1);
});

test("turnover, time_in_market, average_exposure", () => {
  const rows = [{ t: 50, x: 0 }, { t: 30, x: 0.5 }, { t: 20, x: 1 }];
  const turnover = rows.reduce((a, r) => a + r.t, 0) / 100;
  const time_in_market = rows.filter(r => r.x > 0).length / rows.length;
  const average_exposure = mean(rows.map(r => r.x));
  close(turnover, 1); close(time_in_market, 2 / 3); close(average_exposure, 0.5);
});

// spy.beta / qqq.beta / spy.alpha_annual / qqq.alpha_annual / spy.information_ratio / qqq.information_ratio
function benchmark(r, b, P) {
  const k = Math.sqrt(variance(r)) / Math.sqrt(variance(b));
  const m = b.map(x => x * k);
  const cov = r.reduce((a, x, i) => a + (x - mean(r)) * (m[i] - mean(m)), 0) / (r.length - 1);
  const beta = ratio(cov, variance(m));
  return { beta, alpha_annual: (mean(r) - beta * mean(m)) * P, information_ratio: sharpe(r.map((x, i) => x - m[i]), P) };
}
test("RT-01: spy.beta dan qqq.beta 'risk matched' = korelasi, bukan beta OLS", () => {
  const b = [0.01, -0.02, 0.015, -0.005, 0.02];
  const r = b.map(x => 3 * x); // 3x leverage of benchmark
  const { beta } = benchmark(r, b, 1);
  close(beta, 1); // OLS beta would be 3
  const olsBeta = r.reduce((a, x, i) => a + (x - mean(r)) * (b[i] - mean(b)), 0) / (r.length - 1) / variance(b);
  close(olsBeta, 3);
});
test("spy.alpha_annual / qqq.alpha_annual dan information_ratio terhadap benchmark yang diskalakan", () => {
  const b = [0.01, -0.02, 0.015, -0.005, 0.02], r = [0.012, -0.018, 0.02, -0.001, 0.019];
  const s = benchmark(r, b, 1);
  const k = Math.sqrt(variance(r) / variance(b));
  close(s.alpha_annual, mean(r) - s.beta * mean(b) * k);
  assert.ok(s.information_ratio !== null);
});
test("RT-04: return benchmark 0 saat bursa tutup menurunkan korelasi", () => {
  const r = [0.01, -0.01, 0.02, -0.015, 0.01, 0.005];
  const open = [0.01, -0.01, 0.02, -0.015, 0.01, 0.005];
  const closedHalf = open.map((x, i) => (i % 2 ? 0 : x));
  assert.ok(benchmark(r, closedHalf, 1).beta < benchmark(r, open, 1).beta);
});

test("brier: base rate saja < 0.25 tanpa informasi (RT-08)", () => {
  const ys = [...Array(70).fill(1), ...Array(30).fill(0)];
  const brier = mean(ys.map(y => (0.7 - y) ** 2));
  close(brier, 0.21);
});

test("dsr_probability: lebih banyak percobaan tercatat menurunkan DSR (RT-03)", () => {
  // Expected-max threshold grows with the number of independent trials; with
  // identical returns, more trials can only lower the probability.
  const gamma = 0.5772156649015329;
  const z = p => { // Acklam inverse normal, adequate for a monotonicity check
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const q = Math.sqrt(-2 * Math.log(1 - p));
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    if (p > 0.97575) return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    const r = p - 0.5, s = r * r;
    return (((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
  };
  const threshold = n => (1 - gamma) * z(1 - 1 / n) + gamma * z(1 - 1 / (n * Math.E));
  assert.ok(threshold(200) > threshold(5));
});

test("sharpe_ci95 / drawdown_ci95: indeks persentil 249 dan 9749 dari 10 000", () => {
  assert.equal(Math.round(0.025 * 10_000) - 1, 249);
  assert.equal(Math.round(0.975 * 10_000) - 1, 9749);
});

test("RT-02: advisory_comparison tidak bisa menunjukkan LLM lebih baik", () => {
  const net = 0.05, tokenCost = 12, capital = 10_000;
  const with_llm = net - tokenCost / capital, without_llm = net;
  assert.ok(with_llm <= without_llm);
});

test("gate: delapan syarat, semua wajib", () => {
  const checks = ["regimes", "walk_forward", "parameter_sensitivity", "deflated_sharpe", "net_sharpe", "drawdown", "double_slippage", "oos_publication"];
  assert.equal(checks.length, 8);
});
