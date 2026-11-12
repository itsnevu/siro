"use client";

import { useState } from "react";
import { AppShell, Stat } from "@/components/app/AppShell";

const HOLDINGS = [
  { token: "USDC", amount: "12,450.00", value: "$12,450.00", pnl: 0, allocation: 42.3 },
  { token: "ETH", amount: "3.2145", value: "$8,234.12", pnl: 12.4, allocation: 28.0 },
  { token: "WBTC", amount: "0.1523", value: "$5,612.50", pnl: -3.2, allocation: 19.1 },
  { token: "SOL", amount: "45.80", value: "$2,180.40", pnl: 8.7, allocation: 7.4 },
  { token: "ARB", amount: "1,200.00", value: "$936.00", pnl: -1.5, allocation: 3.2 },
];

const TRANSACTIONS = [
  { date: "Nov 7, 2026", type: "Swap", asset: "USDC → ETH", amount: "$500.00", hash: "0xabc1...def2" },
  { date: "Nov 6, 2026", type: "Deposit", asset: "USDC", amount: "$2,000.00", hash: "0x1234...5678" },
  { date: "Nov 5, 2026", type: "Swap", asset: "ETH → WBTC", amount: "$1,200.00", hash: "0x9abc...def0" },
  { date: "Nov 4, 2026", type: "Withdrawal", asset: "USDC", amount: "$300.00", hash: "0xfed1...2345" },
  { date: "Nov 3, 2026", type: "Swap", asset: "USDC → SOL", amount: "$800.00", hash: "0x6789...abcd" },
];

export default function PortfolioPage() {
  const [tab, setTab] = useState<"holdings" | "history">("holdings");
  const totalValue = "$29,413.02";
  const totalPnl = "+$2,847.30 (10.7%)";

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-[28px] text-ink">Portfolio</h1>
          <p className="text-[13px] text-fg-70 mt-1">Your aggregated holdings across all vaults.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Total Value" value={totalValue} />
          <Stat label="Total PnL" value={totalPnl} accent />
          <Stat label="Assets" value={HOLDINGS.length} sub="Across 2 vaults" />
        </div>

        <div>
          <div className="flex gap-4 border-b border-line mb-4">
            <button
              onClick={() => setTab("holdings")}
              className={`pb-2 text-[13px] font-medium border-b-2 ${tab === "holdings" ? "border-ink text-ink" : "border-transparent text-fg-70 hover:text-ink"}`}
            >
              Holdings
            </button>
            <button
              onClick={() => setTab("history")}
              className={`pb-2 text-[13px] font-medium border-b-2 ${tab === "history" ? "border-ink text-ink" : "border-transparent text-fg-70 hover:text-ink"}`}
            >
              Transaction History
            </button>
          </div>

          {tab === "holdings" && (
            <div className="rounded-[12px] border border-line bg-surface overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-fg-70 text-left">
                    <th className="px-4 py-3 font-medium">Token</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                    <th className="px-4 py-3 font-medium">PnL %</th>
                    <th className="px-4 py-3 font-medium">Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {HOLDINGS.map((h) => (
                    <tr key={h.token} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">{h.token}</td>
                      <td className="px-4 py-3">{h.amount}</td>
                      <td className="px-4 py-3">{h.value}</td>
                      <td className={`px-4 py-3 ${h.pnl > 0 ? "text-fg-70" : h.pnl < 0 ? "text-danger" : "text-fg-70"}`}>
                        {h.pnl > 0 ? "+" : ""}{h.pnl}%
                      </td>
                      <td className="px-4 py-3">{h.allocation}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "history" && (
            <div className="rounded-[12px] border border-line bg-surface overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-fg-70 text-left">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((tx, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">{tx.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          tx.type === "Deposit" ? "bg-surface-2 text-fg-70" :
                          tx.type === "Withdrawal" ? "bg-danger/10 text-danger" :
                          "bg-surface-2 text-fg-70"
                        }`}>{tx.type}</span>
                      </td>
                      <td className="px-4 py-3">{tx.asset}</td>
                      <td className="px-4 py-3">{tx.amount}</td>
                      <td className="px-4 py-3 text-fg-70 font-mono text-[12px]">{tx.hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
