"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";

type Approval = {
  id: string;
  strategy: string;
  action: string;
  assets: string[];
  estimatedCost: string;
  riskLevel: "Low" | "Medium" | "High";
  timestamp: string;
};

const MOCK_APPROVALS: Approval[] = [
  {
    id: "1",
    strategy: "Blue Chip Momentum",
    action: "Rebalance: sell 0.5 ETH, buy 120 LINK",
    assets: ["ETH", "LINK"],
    estimatedCost: "$4.21",
    riskLevel: "Low",
    timestamp: "2 min ago",
  },
  {
    id: "2",
    strategy: "AI Agent Alpha",
    action: "New position: buy 2.0 ETH with USDC",
    assets: ["USDC", "ETH"],
    estimatedCost: "$5,124.00 + $2.88 gas",
    riskLevel: "Medium",
    timestamp: "15 min ago",
  },
  {
    id: "3",
    strategy: "Stablecoin Yield",
    action: "Rotate USDT to DAI for better yield",
    assets: ["USDT", "DAI"],
    estimatedCost: "$1.05",
    riskLevel: "Low",
    timestamp: "1 hr ago",
  },
];

const riskColor: Record<string, string> = {
  Low: "text-green-600",
  Medium: "text-yellow-600",
  High: "text-red-500",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);

  const dismiss = (id: string) => setApprovals((prev) => prev.filter((a) => a.id !== id));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-[28px] text-ink">Pending Approvals</h1>
          <p className="text-[13px] text-muted mt-1">{approvals.length} proposals awaiting your review.</p>
        </div>

        {approvals.length === 0 ? (
          <div className="rounded-[12px] border border-line bg-surface p-12 text-center">
            <p className="text-muted text-[14px]">All caught up. No pending approvals.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((a) => (
              <div key={a.id} className="rounded-[12px] border border-line bg-surface p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[14px] font-medium text-ink">{a.strategy}</div>
                    <div className="text-[12px] text-muted mt-0.5">{a.timestamp}</div>
                  </div>
                  <span className={`text-[12px] font-medium ${riskColor[a.riskLevel]}`}>{a.riskLevel} Risk</span>
                </div>

                <p className="text-[13px] text-ink">{a.action}</p>

                <div className="flex items-center gap-4 text-[12px] text-muted">
                  <span>Assets: {a.assets.join(", ")}</span>
                  <span>Est. cost: {a.estimatedCost}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => dismiss(a.id)}
                    className="px-4 py-2 rounded-[8px] bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => dismiss(a.id)}
                    className="px-4 py-2 rounded-[8px] border border-red-300 text-red-500 text-[12px] font-medium hover:bg-red-50 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
