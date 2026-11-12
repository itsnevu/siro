import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";
import { strategies } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Strategies  Siro",
  description: "Browse and copy top-performing tokenized stock strategies on Siro.",
};

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    low: "var(--secondary)",
    medium: "var(--secondary)",
    high: "var(--fg-70)",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: `color-mix(in srgb, ${colors[risk] ?? "var(--fg-70)"} 10%, transparent)`,
        color: colors[risk] ?? "var(--fg-70)",
        textTransform: "capitalize",
      }}
    >
      {risk}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: "var(--soft, var(--surface))",
        color: "var(--ink, var(--fg))",
        textTransform: "capitalize",
      }}
    >
      {type}
    </span>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={up ? "var(--chart-1)" : "var(--danger)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function StrategiesPage() {
  const sorted = [...strategies].sort((a, b) => b.cagr - a.cagr);

  return (
    <ProsePage
      eyebrow="Strategies"
      title="Strategy Marketplace"
      lede="Explore different approaches to onchain investing. Compare allocations, risk profiles, and illustrative performance."
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line, var(--surface))", textAlign: "left" }}>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>#</th>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Strategy</th>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Type</th>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Risk</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>CAGR</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Max DD</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Sharpe</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>AUM</th>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--line, var(--surface))" }}>
                <td style={{ padding: "12px 8px", color: "var(--fg-70, var(--secondary))" }}>{i + 1}</td>
                <td style={{ padding: "12px 8px" }}>
                  <Link href={`/strategies/${s.id}`} style={{ color: "var(--ink, var(--fg))", fontWeight: 600, textDecoration: "none" }}>
                    {s.name}
                  </Link>
                  <div style={{ fontSize: 12, color: "var(--fg-70, var(--secondary))" }}>{s.followers} followers</div>
                </td>
                <td style={{ padding: "12px 8px" }}><TypeBadge type={s.type} /></td>
                <td style={{ padding: "12px 8px" }}><RiskBadge risk={s.risk} /></td>
                <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color: s.cagr >= 0 ? "var(--secondary)" : "var(--fg-70)" }}>
                  {s.cagr >= 0 ? "+" : ""}{s.cagr.toFixed(1)}%
                </td>
                <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--fg-70)" }}>
                  {s.maxDrawdown.toFixed(1)}%
                </td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>{s.sharpe.toFixed(1)}</td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>{fmt(s.aum)}</td>
                <td style={{ padding: "12px 8px" }}><MiniSparkline data={s.sparkline} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 32, fontSize: 13, color: "var(--fg-70, var(--secondary))" }}>
        Illustrative strategies and mock performance data. Past performance does not guarantee future results.
        Siro is software, not investment advice.
      </p>
    </ProsePage>
  );
}
