"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";

const AVAILABLE_ASSETS = ["ETH", "WBTC", "SOL", "ARB", "OP", "AVAX", "MATIC", "LINK", "UNI", "AAVE"];
const SCHEDULES = ["Daily", "Weekly", "Bi-weekly", "Monthly"];

export default function StudioPage() {
  const [name, setName] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [schedule, setSchedule] = useState("Weekly");
  const [rebalanceThreshold, setRebalanceThreshold] = useState("5");
  const [conditions, setConditions] = useState("");
  const [maxTradeSize, setMaxTradeSize] = useState("10");
  const [dailyLossLimit, setDailyLossLimit] = useState("5");
  const [takeProfitPct, setTakeProfitPct] = useState("25");
  const [stopLossPct, setStopLossPct] = useState("10");
  const [backtestPeriod, setBacktestPeriod] = useState("90");
  const [backtestFee, setBacktestFee] = useState("0.3");
  const [backtestSlippage, setBacktestSlippage] = useState("0.5");

  const toggleAsset = (asset: string) => {
    setSelectedAssets((prev) =>
      prev.includes(asset) ? prev.filter((a) => a !== asset) : [...prev, asset]
    );
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-[28px] text-ink">Strategy Studio</h1>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700">Beta</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy Builder */}
          <div className="lg:col-span-2 space-y-5">
            {/* Name */}
            <Section title="Strategy Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blue Chip Momentum"
                className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-ink"
              />
            </Section>

            {/* Assets */}
            <Section title="Assets">
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ASSETS.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAsset(a)}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition ${
                      selectedAssets.includes(a)
                        ? "border-ink bg-ink text-bg"
                        : "border-line bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Section>

            {/* Weights */}
            <Section title="Weights">
              {selectedAssets.length === 0 ? (
                <p className="text-[12px] text-muted">Select assets above to set weights.</p>
              ) : (
                <div className="space-y-3">
                  {selectedAssets.map((a) => (
                    <div key={a} className="flex items-center gap-3">
                      <span className="text-[12px] font-medium w-12">{a}</span>
                      <input type="range" min={0} max={100} defaultValue={Math.floor(100 / selectedAssets.length)} className="flex-1" />
                      <span className="text-[12px] text-muted w-10 text-right">{Math.floor(100 / selectedAssets.length)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Schedule */}
            <Section title="Rebalance Schedule">
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none"
              >
                {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Section>

            {/* Rebalance Trigger */}
            <Section title="Rebalance Trigger">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={rebalanceThreshold}
                  onChange={(e) => setRebalanceThreshold(e.target.value)}
                  className="w-20 rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none"
                />
                <span className="text-[12px] text-muted">% drift threshold</span>
              </div>
            </Section>

            {/* Conditions */}
            <Section title="Conditions">
              <textarea
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. Only rebalance when ETH RSI < 70"
                rows={3}
                className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none resize-none"
              />
            </Section>

            {/* Risk Limits */}
            <Section title="Risk Limits">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Max Trade Size (%)" value={maxTradeSize} onChange={setMaxTradeSize} />
                <InputField label="Daily Loss Limit (%)" value={dailyLossLimit} onChange={setDailyLossLimit} />
              </div>
            </Section>

            {/* Exit Rules */}
            <Section title="Exit Rules">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Take Profit (%)" value={takeProfitPct} onChange={setTakeProfitPct} />
                <InputField label="Stop Loss (%)" value={stopLossPct} onChange={setStopLossPct} />
              </div>
            </Section>
          </div>

          {/* Backtest Panel */}
          <div className="space-y-5">
            <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4 sticky top-4">
              <h3 className="font-serif text-[18px] text-ink">Backtest</h3>

              <InputField label="Period (days)" value={backtestPeriod} onChange={setBacktestPeriod} />
              <InputField label="Fee (%)" value={backtestFee} onChange={setBacktestFee} />
              <InputField label="Slippage (%)" value={backtestSlippage} onChange={setBacktestSlippage} />

              <button className="w-full px-4 py-2.5 rounded-[10px] bg-ink text-bg text-[13px] font-medium hover:opacity-90 transition">
                Run Backtest
              </button>

              <div className="rounded-[8px] border border-line bg-bg p-4 text-center">
                <p className="text-[12px] text-muted">Results will appear here after running a backtest.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-5 space-y-3">
      <h3 className="text-[13px] font-medium text-ink">{title}</h3>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] text-muted mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-ink"
      />
    </div>
  );
}
