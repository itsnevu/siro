import type { Metadata } from "next";
import { MarketingShell } from "@/components/editorial/MarketingShell";

export const metadata: Metadata = {
  title: "x402 API — Siro",
  description: "Pay-per-call agent API. Integrate Siro strategies into your own applications.",
};

const TIERS = [
  { name: "Starter", price: "$0.001", rps: "10 req/s", features: ["Read-only market data", "Strategy metadata", "Public leaderboard"] },
  { name: "Pro", price: "$0.01", rps: "100 req/s", features: ["Everything in Starter", "Backtest execution", "Agent prompt relay", "Webhook notifications"] },
  { name: "Enterprise", price: "Custom", rps: "Unlimited", features: ["Everything in Pro", "Dedicated RPC node", "Priority execution", "SLA guarantee", "White-label support"] },
];

const STEPS = [
  { num: "1", title: "Get an API Key", desc: "Generate a key from your Siro dashboard. Keys are scoped to your wallet." },
  { num: "2", title: "Fund Your Balance", desc: "Deposit $SIRO or USDC. Each call deducts from your on-chain balance via x402 protocol." },
  { num: "3", title: "Make Calls", desc: "Send standard HTTP requests. Payment headers are attached automatically by our SDK." },
];

export default function X402Page() {
  return (
    <MarketingShell>
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 16px 48px" }}>
        <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>x402 Agent API</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, marginBottom: 16 }}>
          Pay per call.<br />No subscriptions.
        </h1>
        <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 600 }}>
          Integrate Siro&apos;s agent, backtest engine, and market data into your own apps. Every call is settled on-chain via the x402 payment protocol.
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Pricing Tiers</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {TIERS.map((t) => (
            <div key={t.name} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28, display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>{t.name}</h3>
              <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>{t.price}<span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 400 }}> /call</span></p>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{t.rps}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ fontSize: 14, color: "var(--muted)", padding: "4px 0", borderBottom: "1px solid var(--soft)" }}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Integration Guide</h2>
        {STEPS.map((s) => (
          <div key={s.num} style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
            <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{s.num}</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{s.title}</h3>
              <p style={{ color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 64px" }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Code Samples</h2>

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--muted)" }}>curl</h3>
        <pre style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 10, padding: 20, fontSize: 13, overflowX: "auto", marginBottom: 20, lineHeight: 1.6 }}>
{`curl https://api.siro.trade/v1/strategies \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-402-Payment: SIGNED_TX_HASH"`}
        </pre>

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--muted)" }}>TypeScript</h3>
        <pre style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 10, padding: 20, fontSize: 13, overflowX: "auto", marginBottom: 20, lineHeight: 1.6 }}>
{`import { SiroClient } from "@siro/sdk";

const siro = new SiroClient({ apiKey: "YOUR_API_KEY" });
const strategies = await siro.strategies.list();`}
        </pre>

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--muted)" }}>Python</h3>
        <pre style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 10, padding: 20, fontSize: 13, overflowX: "auto", lineHeight: 1.6 }}>
{`from siro import SiroClient

client = SiroClient(api_key="YOUR_API_KEY")
strategies = client.strategies.list()`}
        </pre>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 28, padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>On-Chain Payment (x402)</h3>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0, fontSize: 14 }}>
            Every API call is settled via the x402 HTTP payment protocol on Elysium. Your client signs a micro-payment with $SIRO or USDC, the server verifies the signature, and the call executes. No invoices, no credit cards, no monthly bills — just on-chain settlement per request.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
