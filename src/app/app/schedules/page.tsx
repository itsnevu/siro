"use client";

import { AppShell } from "@/components/app/AppShell";

const MOCK_SCHEDULES = [
  { name: "DCA into ETH", frequency: "Weekly, Monday 9AM UTC", amount: "$100 USDC → ETH", status: "Preview" },
  { name: "Rebalance Portfolio", frequency: "Monthly, 1st at 00:00 UTC", amount: "Target weights", status: "Preview" },
  { name: "Auto-compound Yields", frequency: "Daily at 12:00 UTC", amount: "Claim + restake", status: "Preview" },
];

export default function SchedulesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-[28px] text-ink">Automated Schedules</h1>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-2 text-fg-70">
            Coming Soon
          </span>
        </div>
        <p className="text-[13px] text-fg-70">
          Set up recurring DCA, rebalancing, and auto-compound schedules  all executed by your agent with policy checks.
        </p>

        <div className="space-y-4">
          {MOCK_SCHEDULES.map((s) => (
            <div key={s.name} className="rounded-[12px] border border-line bg-surface p-5 opacity-70">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-[14px] font-medium text-ink">{s.name}</div>
                  <div className="text-[12px] text-fg-70">{s.frequency}</div>
                  <div className="text-[12px] text-fg-70">{s.amount}</div>
                </div>
                <button
                  disabled
                  className="px-4 py-2 rounded-[8px] border border-line text-[12px] font-medium text-fg-70 cursor-not-allowed"
                >
                  Activate
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[12px] border border-dashed border-line bg-soft p-8 text-center space-y-2">
          <p className="text-[14px] text-ink font-medium">Schedules are coming in Q1 2027</p>
          <p className="text-[12px] text-fg-70">
            You&apos;ll be able to automate DCA, rebalancing triggers, and yield compounding
             all with the same approval and policy framework.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
