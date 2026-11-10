import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "Roadmap  Siro",
  description: "What we've shipped, what we're building, and what's next.",
};

type Item = { title: string; desc: string; status: "shipped" | "in-progress" | "planned"; quarter: string };

const ITEMS: Item[] = [
  { title: "CopyVault Smart Contracts", desc: "Non-custodial vault with keeper-executed swaps and high-water mark fees.", status: "shipped", quarter: "Q3 2026" },
  { title: "RiskGuard & Kill Switch", desc: "Per-vault risk parameters enforced at contract level.", status: "shipped", quarter: "Q3 2026" },
  { title: "Leaderboard Contract", desc: "On-chain leader registration and stats tracking.", status: "shipped", quarter: "Q3 2026" },
  { title: "Strategy Studio (v1)", desc: "Visual strategy builder with 7 building blocks.", status: "in-progress", quarter: "Q4 2026" },
  { title: "AI Agent (v1)", desc: "Natural-language strategy creation with policy checks.", status: "in-progress", quarter: "Q4 2026" },
  { title: "Backtest Engine", desc: "5 years of historical data, instant simulation.", status: "in-progress", quarter: "Q4 2026" },
  { title: "$SIRO Token Launch", desc: "Utility token for fees, governance, and buyback.", status: "planned", quarter: "Q1 2027" },
  { title: "x402 Agent API", desc: "Pay-per-call API with on-chain settlement.", status: "planned", quarter: "Q1 2027" },
  { title: "Buyback Ladder", desc: "Protocol revenue used to buy and burn $SIRO.", status: "planned", quarter: "Q1 2027" },
  { title: "Elysium Mainnet Deployment", desc: "Production deployment on Elysium mainnet (chain 99901).", status: "planned", quarter: "Q2 2027" },
  { title: "Mobile App", desc: "iOS and Android apps for vault management.", status: "planned", quarter: "Q2 2027" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  shipped: { bg: "var(--accent)", color: "var(--card)", label: "Shipped" },
  "in-progress": { bg: "var(--ink)", color: "var(--bg)", label: "In Progress" },
  planned: { bg: "var(--soft)", color: "var(--fg-70)", label: "Planned" },
};

export default function RoadmapPage() {
  return (
    <MarketingShell artwork="column">
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "80px 16px 48px" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, marginBottom: 16 }}>Roadmap</h1>
        <p style={{ fontSize: 18, color: "var(--fg-70)" }}>What we&apos;ve shipped, what we&apos;re building, and what&apos;s next.</p>
      </section>

      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 80px" }}>
        {ITEMS.map((item) => {
          const s = STATUS_STYLE[item.status];
          return (
            <div key={item.title} style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "flex-start" }}>
              <div style={{ width: 80, fontSize: 13, color: "var(--fg-70)", paddingTop: 4, flexShrink: 0 }}>{item.quarter}</div>
              <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{item.title}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 14, color: "var(--fg-70)", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          );
        })}
      </section>
    </MarketingShell>
  );
}
