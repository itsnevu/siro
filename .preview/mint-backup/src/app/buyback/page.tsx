import type { Metadata } from "next";
import { ProsePage, Section, Note } from "@/components/ProsePage";
import { buybackRuns, platformStats } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Buyback & Burn — Siro",
  description: "How Siro buys back and burns $SIRO from protocol revenue.",
};

const toc = [
  { id: "summary", heading: "Summary" },
  { id: "rule", heading: "The Rule" },
  { id: "ladder", heading: "Fee Ladder" },
  { id: "receipts", heading: "Receipts" },
];

export default function BuybackPage() {
  const totalBurned = platformStats.totalBurned;
  const burnPct = platformStats.burnPct;
  const numRuns = platformStats.buybackRuns;

  return (
    <ProsePage
      eyebrow="Buyback"
      title="Buyback & Burn"
      lede="Protocol revenue buys $SIRO from the open market and burns it permanently."
      toc={toc}
    >
      <Section id="summary" heading="Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 20, background: "var(--soft, #d4f2e8)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#5d6f68" }}>
              {totalBurned.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted, #3d7a68)" }}>$SIRO Burned</div>
          </div>
          <div style={{ padding: 20, background: "var(--soft, #d4f2e8)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{burnPct}%</div>
            <div style={{ fontSize: 13, color: "var(--muted, #3d7a68)" }}>of Total Supply</div>
          </div>
          <div style={{ padding: 20, background: "var(--soft, #d4f2e8)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{numRuns}</div>
            <div style={{ fontSize: 13, color: "var(--muted, #3d7a68)" }}>Buyback Runs</div>
          </div>
        </div>
      </Section>

      <Section id="rule" heading="The Rule">
        <p>Every protocol fee is split: leaders earn 10% of follower profits, and 5% goes to the treasury. The treasury portion funds buybacks.</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div style={{ padding: 20, background: "var(--soft, #d4f2e8)", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>1. Collect</div>
            <p style={{ fontSize: 13, color: "var(--muted, #3d7a68)", margin: 0 }}>
              Protocol fees accumulate in USDC in the treasury multisig. No discretion — every fee is routed automatically.
            </p>
          </div>
          <div style={{ padding: 20, background: "var(--soft, #d4f2e8)", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>2. Buy</div>
            <p style={{ fontSize: 13, color: "var(--muted, #3d7a68)", margin: 0 }}>
              At regular intervals, the treasury executes a market buy of $SIRO via TWAP to minimize price impact.
            </p>
          </div>
          <div style={{ padding: 20, background: "var(--soft, #d4f2e8)", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>3. Burn</div>
            <p style={{ fontSize: 13, color: "var(--muted, #3d7a68)", margin: 0 }}>
              Purchased $SIRO is sent to the burn address. Irreversible. Every burn is verifiable onchain.
            </p>
          </div>
        </div>
      </Section>

      <Section id="ladder" heading="Fee Ladder">
        <p>
          The buyback percentage of protocol revenue increases as platform features unlock:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {[
            { pct: "10%", trigger: "Launch", desc: "Base rate at platform launch", active: true },
            { pct: "15%", trigger: "Strategy Studio", desc: "Unlocked when Studio goes live", active: false },
            { pct: "20%", trigger: "x402 Payments", desc: "Unlocked with HTTP 402 micropayments", active: false },
            { pct: "25%", trigger: "Full DAO", desc: "Unlocked when governance transitions to DAO", active: false },
          ].map((level) => (
            <div
              key={level.pct}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 20px",
                background: level.active ? "var(--ink, #043D32)" : "var(--soft, #d4f2e8)",
                color: level.active ? "#fff" : "var(--ink, #043D32)",
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, minWidth: 48 }}>{level.pct}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{level.trigger}</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{level.desc}</div>
              </div>
              {level.active && (
                <span
                  style={{
                    marginLeft: "auto",
                    padding: "2px 10px",
                    background: "#365b45",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section id="receipts" heading="Receipts">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line, #b8e4d6)", textAlign: "left" }}>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>USDC Spent</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>SIRO Burned</th>
                <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Avg Price</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Fee Tier</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Tx</th>
              </tr>
            </thead>
            <tbody>
              {buybackRuns.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--line, #b8e4d6)" }}>
                  <td style={{ padding: "12px 8px" }}>{r.date}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", fontFamily: "monospace" }}>
                    ${r.siroSpent.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, fontFamily: "monospace" }}>
                    {r.siroBurned.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "right", fontFamily: "monospace" }}>
                    ${r.avgPrice.toFixed(3)}
                  </td>
                  <td style={{ padding: "12px 8px" }}>{r.feeTier}</td>
                  <td style={{ padding: "12px 8px", fontFamily: "monospace", fontSize: 12, color: "var(--muted, #3d7a68)" }}>
                    {r.txHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Note>
        Buyback execution is transparent and verifiable onchain. Past burns do not guarantee future buybacks.
        $SIRO is a utility token — it does not represent equity, debt, or any claim on revenue.
        Siro is software, not investment advice.
      </Note>
    </ProsePage>
  );
}
