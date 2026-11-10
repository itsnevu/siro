import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProsePage, Section, Note } from "@/components/ProsePage";
import { strategies } from "@/lib/mock";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = strategies.find((s) => s.id === id);
  return {
    title: s ? `${s.name}  Siro` : "Strategy  Siro",
    description: s?.description ?? "Strategy detail on Siro.",
  };
}

export default async function StrategyDetailPage({ params }: Props) {
  const { id } = await params;
  const s = strategies.find((st) => st.id === id);
  if (!s) notFound();

  const toc = [
    { id: "performance", heading: "Performance" },
    { id: "allocation", heading: "Allocation" },
    { id: "rules", heading: "Rules" },
    { id: "creator", heading: "Creator" },
    { id: "fees", heading: "Fees" },
  ];

  return (
    <ProsePage
      eyebrow="Strategy"
      title={s.name}
      lede={s.description}
      meta={[`${s.followers} followers`, `AUM: $${(s.aum / 1_000_000).toFixed(1)}M`, `Risk: ${s.risk}`]}
      toc={toc}
    >
      <Section id="performance" heading="Performance">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 16, background: "var(--soft, var(--surface))", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-70, var(--secondary))", marginBottom: 4 }}>CAGR</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.cagr >= 0 ? "var(--secondary)" : "var(--fg-70)" }}>
              {s.cagr >= 0 ? "+" : ""}{s.cagr.toFixed(1)}%
            </div>
          </div>
          <div style={{ padding: 16, background: "var(--soft, var(--surface))", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-70, var(--secondary))", marginBottom: 4 }}>Max Drawdown</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-70)" }}>{s.maxDrawdown.toFixed(1)}%</div>
          </div>
          <div style={{ padding: 16, background: "var(--soft, var(--surface))", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-70, var(--secondary))", marginBottom: 4 }}>Sharpe Ratio</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{s.sharpe.toFixed(1)}</div>
          </div>
        </div>
        <div
          style={{
            height: 240,
            background: "var(--soft, var(--surface))",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--fg-70, var(--secondary))",
            fontSize: 14,
          }}
        >
          Performance chart  coming soon
        </div>
      </Section>

      <Section id="allocation" heading="Allocation">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line, var(--surface))" }}>
              <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600 }}>Token</th>
              <th style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>Allocation</th>
            </tr>
          </thead>
          <tbody>
            {s.allocation.map((a) => (
              <tr key={a.token} style={{ borderBottom: "1px solid var(--line, var(--surface))" }}>
                <td style={{ padding: "8px 0" }}>{a.token}</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>{a.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section id="rules" heading="Rules">
        <ul>
          {s.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Section>

      <Section id="creator" heading="Creator">
        <p>
          <strong>{s.creator}</strong>
        </p>
        <p style={{ fontSize: 13, color: "var(--fg-70, var(--secondary))", fontFamily: "monospace", wordBreak: "break-all" }}>
          {s.creatorAddress}
        </p>
      </Section>

      <Section id="fees" heading="Fees">
        <p>
          <strong>{s.fees.performance}% performance fee</strong> on profit only (10% to leaders, 5% to protocol).
          No management fee. Uses a high-water mark  you never pay fees on losses.
        </p>
      </Section>

      <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
        <Link
          href="/app/studio"
          style={{
            padding: "12px 24px",
            background: "var(--ink, var(--fg))",
            color: "var(--card)",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Copy to Studio
        </Link>
        <Link
          href="/app/agent"
          style={{
            padding: "12px 24px",
            background: "var(--soft, var(--surface))",
            color: "var(--ink, var(--fg))",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Run with Agent
        </Link>
      </div>

      <Note>
        Past performance is not indicative of future results. Copy trading involves risk of loss.
        Siro is software, not investment advice.
      </Note>
    </ProsePage>
  );
}
