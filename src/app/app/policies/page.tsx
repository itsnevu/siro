"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";

const WHITELISTABLE = ["ETH", "WBTC", "SOL", "ARB", "OP", "AVAX", "MATIC", "LINK", "UNI", "AAVE", "USDC", "USDT", "DAI"];

export default function PoliciesPage() {
  const [perTrade, setPerTrade] = useState("1000");
  const [perDay, setPerDay] = useState("5000");
  const [perWeek, setPerWeek] = useState("15000");
  const [maxSlippage, setMaxSlippage] = useState("1.0");
  const [budgetPeriod, setBudgetPeriod] = useState("10000");
  const [whitelist, setWhitelist] = useState<string[]>(["ETH", "WBTC", "SOL", "USDC"]);
  const [saved, setSaved] = useState(false);

  const toggleWhitelist = (token: string) => {
    setWhitelist((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token]
    );
    setSaved(false);
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-[28px] text-ink">Policies</h1>
          <p className="text-[13px] text-fg-70 mt-1">Set spending and risk limits for your agent.</p>
        </div>

        {/* Spending Limits */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-medium text-ink">Spending Limits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Per Trade (USD)" value={perTrade} onChange={(v) => { setPerTrade(v); setSaved(false); }} />
            <Field label="Per Day (USD)" value={perDay} onChange={(v) => { setPerDay(v); setSaved(false); }} />
            <Field label="Per Week (USD)" value={perWeek} onChange={(v) => { setPerWeek(v); setSaved(false); }} />
          </div>
        </div>

        {/* Slippage */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-medium text-ink">Max Slippage</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={maxSlippage}
              onChange={(e) => { setMaxSlippage(e.target.value); setSaved(false); }}
              className="w-24 rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none"
            />
            <span className="text-[12px] text-fg-70">%</span>
          </div>
        </div>

        {/* Allowed Assets */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-medium text-ink">Allowed Assets</h3>
          <p className="text-[12px] text-fg-70">The agent can only trade assets in this whitelist.</p>
          <div className="flex flex-wrap gap-2">
            {WHITELISTABLE.map((t) => (
              <button
                key={t}
                onClick={() => toggleWhitelist(t)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition ${
                  whitelist.includes(t)
                    ? "border-ink bg-ink text-bg"
                    : "border-line bg-bg text-fg-70 hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Budget per Period */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-medium text-ink">Monthly Budget</h3>
          <Field label="Max spend per month (USD)" value={budgetPeriod} onChange={(v) => { setBudgetPeriod(v); setSaved(false); }} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSaved(true)}
            className="px-6 py-2.5 rounded-[10px] bg-ink text-bg text-[13px] font-medium hover:opacity-90 transition"
          >
            Save Policies
          </button>
          {saved && <span className="text-[12px] text-fg-70">Saved successfully</span>}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] text-fg-70 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-ink"
      />
    </div>
  );
}
