/** @deprecated Legacy allocation calculator retained for historical tests only. Runtime uses the Rust replay engine. */
import type { StrategyDraft } from "./workspace-model";
export type PriceRow = { date: string; timestamp: number; prices: Record<string, number> };
export type BacktestResult = { initial: number; final: number; grossReturnPct: number; returnPct: number; maxDrawdownPct: number; costs: number; rebalances: number; points: { date: string; value: number }[] };
export function parsePriceCsv(csv: string, symbols: string[]): PriceRow[] {
  if (csv.length > 2_000_000) throw new Error("CSV must be smaller than 2 MB.");
  const lines = csv.trim().replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.length < 3 || lines.length > 10001) throw new Error("Upload 2 to 10,000 price rows.");
  const header = lines[0].split(",").map(s => s.trim());
  if (header[0]?.toLowerCase() !== "date" || new Set(header).size !== header.length || symbols.some(s => !header.includes(s))) throw new Error(`CSV headers must include date and ${symbols.join(", ")}. Use unquoted comma-separated values.`);
  let previous = -Infinity;
  return lines.slice(1).map((line, index) => {
    const cells = line.split(",").map(s => s.trim());
    const timestamp = Date.parse(cells[0]);
    if (cells.length !== header.length || !/^\d{4}-\d{2}-\d{2}$/.test(cells[0]) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== cells[0] || timestamp <= previous) throw new Error(`Row ${index + 2}: dates must be valid, unique, and increasing (YYYY-MM-DD).`);
    previous = timestamp;
    const prices: Record<string, number> = {};
    for (const symbol of symbols) { const price = Number(cells[header.indexOf(symbol)]); if (!Number.isFinite(price) || price <= 0) throw new Error(`Row ${index + 2}: ${symbol} needs a positive USDG price.`); prices[symbol] = price; }
    return { date: cells[0], timestamp, prices };
  });
}
export function runBacktest(strategy: StrategyDraft, rows: PriceRow[], capital: number, feeBps: number, slippageBps: number): BacktestResult {
  if (!Number.isFinite(capital) || capital <= 0 || capital > 1e12 || !Number.isFinite(feeBps) || !Number.isFinite(slippageBps) || feeBps < 0 || slippageBps < 0 || feeBps + slippageBps > 2000 || rows.length < 2) throw new Error("Enter positive capital and costs between 0 and 20%.");
  if (!strategy.allocations.length || strategy.allocations.reduce((sum, a) => sum + a.weightBps, 0) !== 10000 || new Set(strategy.allocations.map(a => a.symbol)).size !== strategy.allocations.length) throw new Error("Use unique symbols and allocations totaling 100%.");
  const rate = (feeBps + slippageBps) / 10000;
  let costs = capital - capital / (1 + rate), nav = capital - costs, peak = capital, maxDrawdown = 0, last = rows[0].timestamp, rebalances = 0;
  let units = strategy.allocations.map(a => nav * a.weightBps / 10000 / rows[0].prices[a.symbol]);
  const points = rows.map((row, i) => {
    nav = strategy.allocations.reduce((sum, a, j) => sum + units[j] * row.prices[a.symbol], 0);
    if (!Number.isFinite(nav) || nav <= 0) throw new Error("Invalid portfolio value in price series.");
    const drift = Math.max(...strategy.allocations.map((a, j) => Math.abs(units[j] * row.prices[a.symbol] / nav * 10000 - a.weightBps)));
    if (i > 0 && row.timestamp - last >= strategy.rebalanceHours * 3600_000 && drift >= strategy.driftBps) {
      const values = units.map((u, j) => u * row.prices[strategy.allocations[j].symbol]);
      // Solve self-financing target weights after turnover costs.
      let low = 0, high = nav;
      for (let n = 0; n < 60; n++) { const cost = (low + high) / 2; const turnover = strategy.allocations.reduce((sum, a, j) => sum + Math.abs((nav - cost) * a.weightBps / 10000 - values[j]), 0); if (cost > turnover * rate) high = cost; else low = cost; }
      const cost = (low + high) / 2;
      nav -= cost; costs += cost;
      units = strategy.allocations.map(a => nav * a.weightBps / 10000 / row.prices[a.symbol]);
      last = row.timestamp; rebalances++;
    }
    peak = Math.max(peak, nav); maxDrawdown = Math.max(maxDrawdown, (peak - nav) / peak);
    return { date: row.date, value: nav };
  });
  return { initial: capital, final: nav, grossReturnPct: ((nav + costs) / capital - 1) * 100, returnPct: (nav / capital - 1) * 100, maxDrawdownPct: maxDrawdown * 100, costs, rebalances, points };
}
