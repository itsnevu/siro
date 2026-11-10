import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "Studio — Siro",
  description: "Build, backtest, and deploy custom investment strategies with Siro Studio.",
};

const BLOCKS = [
  { icon: "📊", name: "Assets", desc: "Pick from 200+ tokenized stocks, ETFs, and crypto pairs." },
  { icon: "⚖️", name: "Weights", desc: "Set target allocations — equal, market-cap, or custom." },
  { icon: "📅", name: "Schedule", desc: "Daily, weekly, monthly, or event-driven rebalancing." },
  { icon: "🔄", name: "Rebalance Trigger", desc: "Drift threshold, calendar, or price-based triggers." },
  { icon: "⚡", name: "Conditions", desc: "If-then rules: pause when volatility spikes, rotate on momentum." },
  { icon: "🛡️", name: "Risk Limits", desc: "Max drawdown, position caps, daily loss limits, slippage tolerance." },
  { icon: "🚪", name: "Exit Rules", desc: "Take-profit, stop-loss, trailing stops, time-based exits." },
];

const STEPS = [
  { num: "01", label: "Build", desc: "Drag building blocks into your strategy canvas. No code required." },
  { num: "02", label: "Backtest", desc: "Run against 5 years of historical data. See returns, drawdowns, Sharpe ratio." },
  { num: "03", label: "Paper Trade", desc: "Deploy on testnet with virtual funds. Validate in real market conditions." },
  { num: "04", label: "Go Live", desc: "One click to deploy on Elysium. Your vault, your keys, your strategy." },
];

export default function StudioPage() {
  return (
    <MarketingShell>
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 16px 40px" }}>
        <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Siro Studio</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.1, marginBottom: 16 }}>
          Build strategies<br />without writing code.
        </h1>
        <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 600, marginBottom: 48 }}>
          Seven building blocks. Infinite combinations. Backtest on historical data, paper-trade on testnet, then go live — all from one canvas.
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 32 }}>The 7 Building Blocks</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {BLOCKS.map((b) => (
            <div key={b.name} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
              <span style={{ fontSize: 28 }}>{b.icon}</span>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "12px 0 6px" }}>{b.name}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 32 }}>From Idea to Live in 4 Steps</h2>
        <div style={{ display: "grid", gap: 24 }}>
          {STEPS.map((s) => (
            <div key={s.num} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums", minWidth: 48 }}>{s.num}</span>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{s.label}</h3>
                <p style={{ color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>Try the Demo</h2>
          <p style={{ color: "var(--muted)", marginBottom: 24 }}>
            Build a sample strategy in the sandbox — no wallet needed.
          </p>
          <a href="/launch" style={{ display: "inline-block", background: "var(--ink)", color: "var(--bg)", padding: "12px 32px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>
            Launch Studio →
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
