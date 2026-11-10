import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "How It Works — Siro",
  description: "From wallet connection to live strategy in 5 steps.",
};

const STEPS = [
  { icon: "🔗", title: "Connect Wallet", desc: "Sign in with your existing wallet or create a new one via Privy. Non-custodial — your keys, your funds." },
  { icon: "🔍", title: "Browse Strategies", desc: "Explore the marketplace: filter by return, risk, Sharpe ratio, or asset class. Every strategy has a transparent track record." },
  { icon: "📈", title: "Backtest", desc: "Run any strategy against 5 years of historical data. See simulated returns, max drawdown, win rate, and more — before risking a dollar." },
  { icon: "📝", title: "Paper Trade", desc: "Deploy on Elysium testnet with virtual USDC. Watch it trade in real market conditions with zero risk." },
  { icon: "🚀", title: "Go Live", desc: "Deposit USDC into your vault. The strategy executes on-chain via Siro's keeper network. Withdraw anytime." },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "80px 16px 48px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, marginBottom: 16 }}>How Siro Works</h1>
        <p style={{ fontSize: 18, color: "var(--muted)" }}>Five steps from zero to live strategy.</p>
      </section>

      <section style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px 80px" }}>
        {STEPS.map((s, i) => (
          <div key={s.title} style={{ display: "flex", gap: 24, marginBottom: 40, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{s.icon}</div>
              {i < STEPS.length - 1 && <div style={{ width: 2, height: 40, background: "var(--line)", marginTop: 8 }} />}
            </div>
            <div style={{ paddingTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>Step {i + 1}</p>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{s.title}</h2>
              <p style={{ color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </MarketingShell>
  );
}
