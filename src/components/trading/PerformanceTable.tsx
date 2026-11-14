import Link from "next/link";
import { pairedPerformance, percent, type TradingAgent } from "@/lib/trading-report";
export function PerformanceTable({ agents }: { agents: TradingAgent[] }) {
  if (!agents.length) return <p>No verified performance records have been published.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left py-3">Gross and net after recorded costs, shown together. Mode is stated for every agent.</caption><thead><tr>{["Agent", "Mode", "Gross return", "Net return", "Turnover", "Net excess vs volatility-matched SPY (annual)", "Max drawdown (net)", "Validation"].map(h => <th key={h} className="p-3 border-b">{h}</th>)}</tr></thead><tbody>{agents.map(a => {
    if (!pairedPerformance(a.metrics)) throw new Error("Gross/net performance pair is required.");
    return <tr key={`${a.agent_id}:${a.agent_version}`}><td className="p-3"><Link href={`/evidence/${encodeURIComponent(a.agent_id)}`} className="underline">{a.agent_id} v{a.agent_version}</Link>{a.internal && <span> · Internal</span>}</td><td className="p-3">{a.mode}</td><td className="p-3">{percent(a.metrics.gross_return)}</td><td className="p-3">{percent(a.metrics.net_return)}</td><td className="p-3">{percent(a.metrics.turnover)}</td><td className="p-3">{percent(a.metrics.spy.alpha_annual)}</td><td className="p-3">{percent(a.metrics.max_drawdown)}</td><td className="p-3">{a.gate.passed ? "Passed" : "Failed"}</td></tr>;
  })}</tbody></table></div>;
}
