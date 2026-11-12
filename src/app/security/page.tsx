import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "Security  Siro",
  description: "Non-custodial architecture, audits, bug bounty, and incident response.",
};

const PRINCIPLES = [
  { title: "Non-Custodial", desc: "Siro never holds your private keys. Funds stay in your smart-contract vault, controlled only by your wallet." },
  { title: "On-Chain Execution", desc: "Every trade is an on-chain transaction on Robinhood Chain. Fully transparent, fully verifiable." },
  { title: "RiskGuard Policies", desc: "Per-vault risk parameters (max trade size, daily loss limit, position caps, slippage tolerance) enforced at the contract level." },
  { title: "Keeper-Only Swaps", desc: "The keeper can only route through whitelisted DEX routers. No arbitrary calls, no fund extraction." },
];

const CONTRACTS = [
  { name: "SiroCopyVault", desc: "Deposit, withdraw, follow leaders, keeper-executed swaps." },
  { name: "SiroRiskGuard", desc: "Per-vault risk parameters, token whitelist, kill switch." },
  { name: "SiroLeaderboard", desc: "Leader registration, stats tracking, paginated queries." },
];

export default function SecurityPage() {
  return (
    <MarketingShell artwork="arch">
      <section className="glow-intro" style={{ maxWidth: 900, margin: "0 auto", padding: "80px 16px 48px" }}>
        <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Security</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, marginBottom: 16 }}>Your keys. Your funds. Always.</h1>
        <p style={{ fontSize: 18, color: "var(--fg-70)", maxWidth: 600 }}>
          Siro is non-custodial by design. Every component is built so you never have to trust us with your assets.
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {PRINCIPLES.map((p) => (
            <div key={p.title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: "var(--fg-70)", margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Audits</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--fg-70)", margin: 0 }}>Audit reports will be published here once completed. Siro&apos;s smart contracts are currently undergoing review.</p>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Bug Bounty</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
          <p style={{ color: "var(--fg-70)", lineHeight: 1.6, marginBottom: 12 }}>
            Found a vulnerability? We offer bounties up to <strong style={{ color: "var(--ink)" }}>$50,000</strong> for critical smart contract bugs.
          </p>
          <p style={{ fontSize: 14, color: "var(--fg-70)", margin: 0 }}>
            Report to <a href="mailto:security@siro.trade" style={{ color: "var(--accent)" }}>security@siro.trade</a>. Please include a proof of concept and refrain from exploiting the vulnerability.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Smart Contracts</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {CONTRACTS.map((c) => (
            <div key={c.name} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, fontFamily: "monospace", marginBottom: 4 }}>{c.name}</h3>
              <p style={{ fontSize: 14, color: "var(--fg-70)", margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "var(--fg-70)", marginTop: 12 }}>
          Contract addresses will be published after mainnet deployment. Testnet addresses are available in the{" "}
          <a href="/docs" style={{ color: "var(--accent)" }}>documentation</a>.
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Incident Response</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--fg-70)", lineHeight: 1.8, fontSize: 14 }}>
            <li>All incidents are disclosed publicly within 48 hours.</li>
            <li>Affected users are notified via on-chain events and email.</li>
            <li>Post-mortem reports are published on the blog.</li>
            <li>Emergency pause: protocol owner can pause all vaults instantly via RiskGuard kill switch.</li>
          </ul>
        </div>
      </section>
    </MarketingShell>
  );
}
