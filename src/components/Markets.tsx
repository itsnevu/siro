import Link from "next/link";

const SAMPLE_LEADERS = [
  { rank: 1, name: "AlphaVault", wallet: "0x8f3a…d21c", pnl: "+42.3%", sharpe: "1.82", drawdown: "12%", followers: 34, tier: "Aggressive" },
  { rank: 2, name: "DeFiWhale", wallet: "0x2b9e…7a0f", pnl: "+31.7%", sharpe: "2.14", drawdown: "8%", followers: 51, tier: "Balanced" },
  { rank: 3, name: "SteadyEdge", wallet: "0xc4d1…e8b2", pnl: "+28.1%", sharpe: "1.67", drawdown: "15%", followers: 22, tier: "Balanced" },
  { rank: 4, name: "ConservPro", wallet: "0x91fa…3c5d", pnl: "+24.9%", sharpe: "1.93", drawdown: "6%", followers: 47, tier: "Conservative" },
  { rank: 5, name: "MomentumX", wallet: "0x5e7b…f412", pnl: "+19.6%", sharpe: "1.45", drawdown: "18%", followers: 15, tier: "Aggressive" },
];

export function Markets() {
  return (
    <div id="leaderboard" style={{ scrollMarginTop: 96 }}>
      <div className="rusd-market-panel" style={{ borderRadius: 20, overflow: "hidden" }}>
        <h2 className="rusd-market-title">Top Performers (90d)</h2>
        <table className="rusd-market-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--rusd-line)", fontSize: 12, color: "var(--rusd-muted)", textAlign: "left" }}>
              <th style={{ padding: "12px 16px", fontWeight: 500 }}>#</th>
              <th style={{ padding: "12px 8px", fontWeight: 500 }}>Leader</th>
              <th style={{ padding: "12px 8px", fontWeight: 500 }}>PnL 90d</th>
              <th style={{ padding: "12px 8px", fontWeight: 500 }}>Sharpe</th>
              <th style={{ padding: "12px 8px", fontWeight: 500 }}>Max DD</th>
              <th style={{ padding: "12px 8px", fontWeight: 500 }}>Followers</th>
              <th style={{ padding: "12px 8px", fontWeight: 500 }}>Tier</th>
              <th style={{ padding: "12px 16px", fontWeight: 500 }}></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_LEADERS.map((l) => (
              <tr key={l.rank} style={{ borderBottom: "1px solid var(--rusd-line)" }}>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--rusd-muted)" }}>{l.rank}</td>
                <td style={{ padding: "14px 8px", fontSize: 13 }}>
                  <strong>{l.name}</strong>
                  <br />
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--rusd-muted)" }}>{l.wallet}</span>
                </td>
                <td style={{ padding: "14px 8px", fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>{l.pnl}</td>
                <td style={{ padding: "14px 8px", fontSize: 13 }}>{l.sharpe}</td>
                <td style={{ padding: "14px 8px", fontSize: 13 }}>{l.drawdown}</td>
                <td style={{ padding: "14px 8px", fontSize: 13 }}>{l.followers}</td>
                <td style={{ padding: "14px 8px" }}>
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: l.tier === "Conservative" ? "var(--surface)" : l.tier === "Balanced" ? "var(--bg)" : "var(--surface)",
                    color: l.tier === "Conservative" ? "var(--fg)" : l.tier === "Balanced" ? "var(--fg)" : "var(--accent-ink)",
                  }}>
                    {l.tier}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <Link
                    href="/launch"
                    style={{
                      padding: "6px 16px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: "var(--rusd-ink)",
                      color: "var(--rusd-surface)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Follow
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "16px", textAlign: "center" }}>
          <Link href="/launch" style={{ color: "var(--rusd-bright)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
            View full leaderboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
