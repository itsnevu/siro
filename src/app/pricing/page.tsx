import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "Pricing  Siro",
  description: "Transparent fee structure. No hidden costs. Performance fees only on profit.",
};

const PLATFORM_FEES = [
  { item: "Vault Creation", fee: "Free" },
  { item: "Deposits / Withdrawals", fee: "Gas only" },
  { item: "Performance Fee", fee: "15% on profit above high-water mark" },
  { item: "Leader Share", fee: "10% (of performance fee)" },
  { item: "Protocol Share", fee: "5% (of performance fee)" },
  { item: "Management Fee", fee: "None" },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    desc: "Get started with basic strategies.",
    features: ["1 live vault", "3 backtests / day", "Public leaderboard", "Community support"],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$29",
    desc: "For active traders and strategy builders.",
    features: ["Unlimited vaults", "Unlimited backtests", "Agent access", "Priority execution", "Email support"],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For funds, DAOs, and institutions.",
    features: ["Everything in Pro", "White-label vaults", "Dedicated RPC", "Custom risk policies", "SLA & dedicated support"],
    cta: "Contact Sales",
  },
];

const FAQ = [
  { q: "When is the performance fee charged?", a: "Only when your vault realizes profit above its high-water mark. If your vault is flat or down, you pay nothing." },
  { q: "Are there withdrawal fees?", a: "No. You only pay Elysium gas fees (fractions of a cent)." },
  { q: "Can I switch plans?", a: "Yes. Upgrade or downgrade at any time. Pro is billed monthly in $SIRO or USDC." },
  { q: "Is there a free trial for Pro?", a: "Yes  14 days, no credit card required." },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 16px 48px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, marginBottom: 16 }}>Simple, transparent pricing</h1>
        <p style={{ fontSize: 18, color: "var(--fg-70)" }}>No hidden fees. Performance fees only on profit.</p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {PLANS.map((p) => (
            <div key={p.name} style={{ background: "var(--surface)", border: p.highlight ? "2px solid var(--accent)" : "1px solid var(--line)", borderRadius: 28, padding: 28, display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: 20, fontWeight: 600 }}>{p.name}</h3>
              <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px" }}>{p.price}{p.price !== "Custom" && <span style={{ fontSize: 14, fontWeight: 400, color: "var(--fg-70)" }}>/mo</span>}</p>
              <p style={{ fontSize: 14, color: "var(--fg-70)", marginBottom: 20 }}>{p.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", flex: 1 }}>
                {p.features.map((f) => <li key={f} style={{ fontSize: 14, color: "var(--fg-70)", padding: "5px 0" }}>✓ {f}</li>)}
              </ul>
              <a href="/launch" style={{ display: "block", textAlign: "center", padding: "10px 0", borderRadius: 8, background: p.highlight ? "var(--ink)" : "var(--soft)", color: p.highlight ? "var(--bg)" : "var(--ink)", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>{p.cta}</a>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Platform Fees</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {PLATFORM_FEES.map((f) => (
                <tr key={f.item} style={{ borderBottom: "1px solid var(--soft)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{f.item}</td>
                  <td style={{ padding: "12px 16px", color: "var(--fg-70)", textAlign: "right" }}>{f.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>FAQ</h2>
        {FAQ.map((f) => (
          <div key={f.q} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{f.q}</h3>
            <p style={{ color: "var(--fg-70)", margin: 0, lineHeight: 1.6 }}>{f.a}</p>
          </div>
        ))}
      </section>
    </MarketingShell>
  );
}
