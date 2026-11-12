"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";

type Strategy = {
  id: string;
  name: string;
  status: "Live" | "Paper" | "Draft";
  pnl: string;
  created: string;
  assets: string[];
};

const MOCK_STRATEGIES: Strategy[] = [
  { id: "1", name: "Blue Chip Momentum", status: "Live", pnl: "+12.4%", created: "Oct 15, 2026", assets: ["ETH", "WBTC", "SOL"] },
  { id: "2", name: "Stablecoin Yield", status: "Paper", pnl: "+3.2%", created: "Nov 1, 2026", assets: ["USDC", "USDT", "DAI"] },
  { id: "3", name: "AI Agent Alpha", status: "Draft", pnl: "-", created: "Nov 6, 2026", assets: ["ETH", "ARB"] },
];

const statusColor: Record<string, string> = {
  Live: "bg-surface-2 text-fg-70",
  Paper: "bg-surface-2 text-fg-70",
  Draft: "bg-surface-2 text-fg-70",
};

export default function StrategiesPage() {
  const [strategies] = useState<Strategy[]>(MOCK_STRATEGIES);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[28px] text-ink">My Strategies</h1>
            <p className="text-[13px] text-fg-70 mt-1">Manage your copy trading strategies.</p>
          </div>
          <a
            href="/app/studio"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ink text-bg text-[13px] font-medium hover:opacity-90 transition"
          >
            + Create New
          </a>
        </div>

        {strategies.length === 0 ? (
          <div className="rounded-[12px] border border-line bg-surface p-12 text-center">
            <p className="text-fg-70 text-[14px]">No strategies yet.</p>
            <p className="text-fg-70 text-[12px] mt-1">Create your first strategy in the Studio.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {strategies.map((s) => (
              <div key={s.id} className="rounded-[12px] border border-line bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink text-[15px]">{s.name}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${statusColor[s.status]}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-fg-70">
                    Created {s.created} · Assets: {s.assets.join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[11px] text-fg-70 uppercase tracking-wide">PnL</div>
                    <div className={`font-serif text-[20px] ${s.pnl.startsWith("+") ? "text-fg-70" : "text-ink"}`}>{s.pnl}</div>
                  </div>
                  <a href="/app/studio" className="text-[12px] text-fg-70 hover:text-ink underline">Edit</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
