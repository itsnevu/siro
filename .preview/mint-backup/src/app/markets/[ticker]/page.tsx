import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProsePage, Section, Note } from "@/components/ProsePage";
import { markets, strategies } from "@/lib/mock";

type Props = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  const m = markets.find((m) => m.ticker === ticker);
  return {
    title: m ? `${m.ticker} — ${m.name} — Siro` : "Asset — Siro",
    description: m ? `${m.name} (${m.ticker}) on Siro — price, stats, and strategies.` : "Asset detail on Siro.",
  };
}

function fmtBig(n: number) {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default async function AssetDetailPage({ params }: Props) {
  const { ticker } = await params;
  const m = markets.find((mk) => mk.ticker === ticker);
  if (!m) notFound();

  const relatedStrategies = strategies.filter((s) =>
    s.allocation.some((a) => a.token === m.ticker)
  );

  const stats = [
    { label: "Market Cap", value: fmtBig(m.marketCap) },
    { label: "24h Volume", value: fmtBig(m.volume) },
    { label: "Liquidity", value: fmtBig(m.liquidity) },
    { label: "Sector", value: m.sector },
    { label: "Issuer", value: m.issuer },
  ];

  return (
    <ProsePage
      eyebrow={m.ticker}
      title={m.name}
      lede={`Tokenized ${m.name} on Elysium — trade 24/7, settle instantly.`}
      meta={[m.sector, `Issued by ${m.issuer}`]}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 32 }}>
        <span style={{ fontSize: 36, fontWeight: 700 }}>
          ${m.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: m.change24h >= 0 ? "#365b45" : "#5d6f68",
          }}
        >
          {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: 16, background: "var(--soft, #d4f2e8)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--muted, #3d7a68)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {relatedStrategies.length > 0 && (
        <Section id="strategies" heading="Strategies Using This Asset">
          <ul>
            {relatedStrategies.map((s) => (
              <li key={s.id}>
                <Link href={`/strategies/${s.id}`} style={{ color: "var(--ink, #043D32)", fontWeight: 600 }}>
                  {s.name}
                </Link>
                {" — "}
                <span style={{ color: "var(--muted, #3d7a68)" }}>
                  {s.allocation.find((a) => a.token === m.ticker)?.pct}% allocation, {s.cagr.toFixed(1)}% CAGR
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Note>
        Tokenized stocks are synthetic assets. Prices are sourced from onchain oracles and may differ from
        traditional exchanges. Not available in all jurisdictions. Siro is software, not investment advice.
      </Note>
    </ProsePage>
  );
}
