export type Performance = {
  gross_return: number; net_return: number; gross_sharpe: number | null; net_sharpe: number | null;
  turnover: number; max_drawdown: number; longest_drawdown_days: number;
  sortino: number | null; calmar: number | null; tail_ratio: number | null;
  hit_rate: number | null; average_win: number | null; average_loss: number | null;
  time_in_market: number; average_exposure: number;
  spy: { alpha_annual: number | null; beta: number | null; information_ratio: number | null };
  qqq: { alpha_annual: number | null; beta: number | null; information_ratio: number | null };
};
export type TradingAgent = {
  agent_id: string; agent_version: number; parent_version: number | null; internal: boolean;
  mode: "backtest" | "paper" | "live"; asset_class: string; risk_profile: string; regime: string;
  capital_usd: number; capacity_usd: number; strategy_hash: string; prev_hash: string;
  metrics: Performance; gate: { passed: boolean; checks: { name: string; passed: boolean; detail: string }[] };
  calibration: { brier: number | null; curve: { count: number; mean_prediction: number | null; observed_frequency: number | null }[] };
  regime_breakdown: { regime: string; gross_return: number; net_return: number; samples: number }[];
  advisory_comparison: { gross_return: number; net_return: number; without_llm_gross_return: number; without_llm_net_return: number } | null;
  verification_url: string;
};
export function pairedPerformance(value: unknown): value is Performance {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["gross_return", "net_return", "turnover", "max_drawdown"].every(key => typeof row[key] === "number" && Number.isFinite(row[key]));
}
export function percent(value: number | null | undefined) { return value === null || value === undefined ? "Unavailable" : `${(value * 100).toFixed(2)}%`; }
