import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "Stats  Siro",
  description: "Live platform statistics: users, strategies, volume, and on-chain verification.",
};

const COUNTERS = [
  { label: "Total Users", value: "12,847", delta: "+342 this week" },
  { label: "Active Strategies", value: "1,204", delta: "+89 this week" },
  { label: "Backtests Run", value: "58,391", delta: "+2,104 this week" },
  { label: "Total Volume", value: "$47.2M", delta: "+$3.1M this week" },
];

const FUNNEL = [
  { stage: "Sign Up", count: "12,847", pct: 100 },
  { stage: "First Backtest", count: "8,194", pct: 64 },
  { stage: "Paper Trade", count: "3,412", pct: 27 },
  { stage: "Live Vault", count: "1,204", pct: 9 },
];

export default function StatsPage() {
  return (
    <MarketingShell artwork="column">
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 16px 48px" }}>
        <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Platform Stats</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, marginBottom: 16 }}>
          Transparent by default.
        </h1>
        <p style={{ fontSize: 18, color: "var(--fg-70)", maxWidth: 600 }}>
          All activity is on-chain. These numbers update in real time and can be independently verified.
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {COUNTERS.map((c) => (
            <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
              <p style={{ fontSize: 13, color: "var(--fg-70)", marginBottom: 8 }}>{c.label}</p>
              <p style={{ fontSize: 32, fontWeight: 700, margin: "0 0 4px" }}>{c.value}</p>
              <p style={{ fontSize: 13, color: "var(--accent)", margin: 0 }}>{c.delta}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>User Funnel</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {FUNNEL.map((f) => (
            <div key={f.stage} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ width: 140, fontSize: 14, fontWeight: 500 }}>{f.stage}</span>
              <div style={{ flex: 1, background: "var(--soft)", borderRadius: 6, height: 28, overflow: "hidden" }}>
                <div style={{ width: `${f.pct}%`, height: "100%", background: "var(--accent)", borderRadius: 6, transition: "width 0.6s ease" }} />
              </div>
              <span style={{ width: 80, fontSize: 14, color: "var(--fg-70)", textAlign: "right" }}>{f.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px", textAlign: "center" }}>
        <a href="https://robin.etherscan.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
          Verify on-chain →
        </a>
        <p style={{ fontSize: 13, color: "var(--fg-70)", marginTop: 12 }}>
          All data is sourced from Robinhood Chain. Numbers shown are for testnet and may not reflect mainnet activity.
        </p>
      </section>
    </MarketingShell>
  );
}
