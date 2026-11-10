import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";
import { markets } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Markets  Siro",
  description: "Browse all tokenized stocks available on Siro via Elysium.",
};

function fmtPrice(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtBig(n: number) {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function MarketsPage() {
  return (
    <ProsePage
      eyebrow="Markets"
      title="Tokenized Stocks"
      lede="Trade tokenized US equities 24/7 on Elysium. Real-time settlement, full collateralization."
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          background: "var(--soft, var(--surface))",
          borderRadius: 999,
          fontSize: 13,
          marginBottom: 24,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--secondary)", display: "inline-block" }} />
        Illustrative market snapshot
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line, var(--surface))", textAlign: "left" }}>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Ticker</th>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Name</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Price</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>24h</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Volume</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Liquidity</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Market Cap</th>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Sector</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.ticker} style={{ borderBottom: "1px solid var(--line, var(--surface))" }}>
                <td style={{ padding: "12px 8px" }}>
                  <Link
                    href={`/markets/${m.ticker}`}
                    style={{ color: "var(--ink, var(--fg))", fontWeight: 700, textDecoration: "none", fontFamily: "monospace" }}
                  >
                    {m.ticker}
                  </Link>
                </td>
                <td style={{ padding: "12px 8px", color: "var(--fg-70, var(--secondary))" }}>{m.name}</td>
                <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600 }}>{fmtPrice(m.price)}</td>
                <td
                  style={{
                    padding: "12px 8px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: m.change24h >= 0 ? "var(--secondary)" : "var(--fg-70)",
                  }}
                >
                  {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
                </td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>{fmtBig(m.volume)}</td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>{fmtBig(m.liquidity)}</td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>{fmtBig(m.marketCap)}</td>
                <td style={{ padding: "12px 8px" }}>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      background: "var(--soft, var(--surface))",
                      color: "var(--ink, var(--fg))",
                    }}
                  >
                    {m.sector}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 32, fontSize: 13, color: "var(--fg-70, var(--secondary))" }}>
        Prices are indicative and sourced from onchain oracles. Tokenized stocks are synthetic assets
        fully collateralized on Elysium. Not available in all jurisdictions. Siro is software, not investment advice.
      </p>
    </ProsePage>
  );
}
