"use client";

import { AppShell, Stat } from "@/components/app/AppShell";

const TIERS = [
  { name: "Bronze", min: 0, color: "bg-secondary" },
  { name: "Silver", min: 1000, color: "bg-secondary" },
  { name: "Gold", min: 10000, color: "bg-secondary" },
  { name: "Platinum", min: 100000, color: "bg-secondary" },
];

export default function TokenPage() {
  const balance = 4_250;
  const staked = 2_000;
  const creditsUsed = 67;
  const currentTier = TIERS.filter((t) => t.min <= balance).pop()!;
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-[28px] text-ink">$SIRO Token</h1>
          <p className="text-[13px] text-fg-70 mt-1">Your token balance, tier status, and staking.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Balance" value={`${balance.toLocaleString("en-US")} SIRO`} />
          <Stat label="Staked" value={`${staked.toLocaleString("en-US")} SIRO`} sub="Earning 12% APY" />
          <Stat
            label="Tier"
            value={
              <span className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${currentTier.color}`} />
                {currentTier.name}
              </span>
            }
            sub={nextTier ? `${(nextTier.min - balance).toLocaleString("en-US")} SIRO to ${nextTier.name}` : "Max tier reached"}
          />
        </div>

        {/* Credits Usage */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-3">
          <h3 className="text-[14px] font-medium text-ink">Agent Credits Usage</h3>
          <p className="text-[12px] text-fg-70">Monthly credits consumed by your AI agent.</p>
          <div className="w-full h-3 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-ink rounded-full transition-all" style={{ width: `${creditsUsed}%` }} />
          </div>
          <div className="flex justify-between text-[12px] text-fg-70">
            <span>{creditsUsed}% used</span>
            <span>{100 - creditsUsed}% remaining</span>
          </div>
        </div>

        {/* Staking */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-medium text-ink">Staking</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-fg-70 mb-1">Stake Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0"
                  className="flex-1 rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none"
                />
                <button className="px-4 py-2 rounded-[8px] bg-ink text-bg text-[12px] font-medium hover:opacity-90 transition">
                  Stake
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-fg-70 mb-1">Unstake Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0"
                  className="flex-1 rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none"
                />
                <button className="px-4 py-2 rounded-[8px] border border-line text-[12px] font-medium text-fg-70 hover:text-ink transition">
                  Unstake
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Claim */}
        <div className="rounded-[12px] border border-line bg-surface p-5 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-medium text-ink">Pending Rewards</div>
            <div className="text-[12px] text-fg-70 mt-0.5">24.8 SIRO available to claim</div>
          </div>
          <button className="px-5 py-2.5 rounded-[10px] bg-ink text-bg text-[13px] font-medium hover:opacity-90 transition">
            Claim Rewards
          </button>
        </div>
      </div>
    </AppShell>
  );
}
