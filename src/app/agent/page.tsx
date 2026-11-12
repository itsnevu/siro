import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";
import { CinematicBackground } from "@/components/editorial/CinematicBackground";

export const metadata: Metadata = {
  title: "Agent  Siro",
  description: "Describe your investment goal in plain English. Siro's AI agent builds, tests, and manages it.",
};

const FLOW = [
  { step: "You Describe", desc: "Tell the agent what you want in plain English." },
  { step: "Agent Drafts", desc: "AI assembles a strategy from Studio building blocks." },
  { step: "Policy Checks", desc: "RiskGuard validates against your risk parameters." },
  { step: "Backtested", desc: "5 years of historical simulation, instant results." },
  { step: "You Decide", desc: "Approve, tweak, or reject. Nothing deploys without your signature." },
];

const PROMPTS = [
  "Build me a tech-heavy portfolio with monthly rebalancing and a 10% stop-loss.",
  "Create a dividend-focused strategy that rotates into value stocks during downturns.",
  "I want equal-weight exposure to AI companies, rebalanced weekly, max 5% per position.",
  "Copy the top 3 leaders but limit my drawdown to 8% and pause if vol exceeds 30.",
];

const GUARANTEES = [
  { title: "Can't touch your funds", desc: "The agent proposes transactions. Only your wallet key can sign them." },
  { title: "Spending limits", desc: "Set per-trade and daily caps. The agent cannot exceed them." },
  { title: "Approval required", desc: "Every live action needs your explicit on-chain approval." },
  { title: "Kill switch", desc: "Pause the agent instantly  funds return to your wallet." },
];

export default function AgentPage() {
  return (
    <MarketingShell artwork="arch">
      <section className="cinematic-section ed-product-hero" style={{ maxWidth: 900, margin: "0 auto", padding: "80px 16px 48px" }}>
        <CinematicBackground variant="dusk" />
        <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Siro Agent</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.1, marginBottom: 16 }}>
          Describe it.<br />The agent builds it.
        </h1>
        <p style={{ fontSize: 18, color: "var(--fg-70)", maxWidth: 600, marginBottom: 48 }}>
          Tell our AI agent what you want in plain language. It drafts the strategy, backtests it, and waits for your approval before anything goes live.
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 32 }}>How It Works</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {FLOW.map((f, i) => (
            <div key={f.step} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{f.step}</h3>
                <p style={{ color: "var(--fg-70)", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Example Prompts</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {PROMPTS.map((p) => (
            <div key={p} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px", fontSize: 15, color: "var(--fg-70)", fontStyle: "italic" }}>
              &ldquo;{p}&rdquo;
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 32 }}>Safety Guarantees</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {GUARANTEES.map((g) => (
            <div key={g.title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{g.title}</h3>
              <p style={{ fontSize: 14, color: "var(--fg-70)", margin: 0, lineHeight: 1.5 }}>{g.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
