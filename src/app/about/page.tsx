import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "About  Siro",
  description: "Our mission, team, and vision for agentic investing.",
};

const TEAM = [
  { name: "Alex Chen", role: "CEO & Co-Founder", bio: "Ex-quant at Citadel. 10 years in systematic trading." },
  { name: "Maya Nakamura", role: "CTO & Co-Founder", bio: "Former protocol engineer at Uniswap. Solidity & Rust." },
  { name: "Jordan Ellis", role: "Head of Product", bio: "Previously led product at Robinhood Crypto." },
  { name: "Priya Sharma", role: "Head of Research", bio: "PhD in financial engineering. Published in Journal of Finance." },
];

export default function AboutPage() {
  return (
    <MarketingShell artwork="urn">
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "80px 16px 48px" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, marginBottom: 16 }}>About Siro</h1>
        <p style={{ fontSize: 18, color: "var(--fg-70)", lineHeight: 1.6, maxWidth: 600 }}>
          We believe investing should be intelligent, transparent, and accessible to everyone  not just hedge funds and quant desks.
        </p>
      </section>

      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Mission</h2>
        <p style={{ color: "var(--fg-70)", lineHeight: 1.7, fontSize: 16 }}>
          Siro is building the infrastructure for agentic investing on tokenized assets. We combine AI agents, non-custodial smart contracts, and on-chain transparency so that anyone can access institutional-grade strategies  without giving up custody of their funds.
        </p>
      </section>

      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Team</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {TEAM.map((t) => (
            <div key={t.name} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--soft)", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
                {t.name[0]}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{t.name}</h3>
              <p style={{ fontSize: 13, color: "var(--accent)", marginBottom: 8 }}>{t.role}</p>
              <p style={{ fontSize: 14, color: "var(--fg-70)", margin: 0, lineHeight: 1.5 }}>{t.bio}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Investors & Partners</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--fg-70)", margin: 0 }}>Investor and partner logos will be displayed here after our next funding round.</p>
        </div>
      </section>

      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 80px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Contact</h2>
        <p style={{ color: "var(--fg-70)", lineHeight: 1.7 }}>
          General: <a href="mailto:hello@siro.trade" style={{ color: "var(--accent)" }}>hello@siro.trade</a><br />
          Security: <a href="mailto:security@siro.trade" style={{ color: "var(--accent)" }}>security@siro.trade</a><br />
          Press: <a href="mailto:press@siro.trade" style={{ color: "var(--accent)" }}>press@siro.trade</a>
        </p>
      </section>
    </MarketingShell>
  );
}
