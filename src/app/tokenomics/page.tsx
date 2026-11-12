import type { Metadata } from "next";
import { ProsePage, Section, Note } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Tokenomics  Siro",
  description: "$SIRO supply breakdown, allocation, and vesting schedule.",
};

const allocations = [
  { name: "Community & Ecosystem", pct: 30, vesting: "24-month linear unlock after TGE", color: "var(--secondary)" },
  { name: "Treasury", pct: 20, vesting: "DAO-governed, no cliff", color: "var(--secondary)" },
  { name: "Team", pct: 15, vesting: "12-month cliff, 36-month linear", color: "var(--secondary)" },
  { name: "Liquidity", pct: 15, vesting: "Unlocked at TGE for DEX pools", color: "var(--secondary)" },
  { name: "Investors", pct: 10, vesting: "6-month cliff, 24-month linear", color: "var(--secondary)" },
  { name: "Advisors", pct: 5, vesting: "6-month cliff, 24-month linear", color: "var(--surface-2)" },
  { name: "Reserve", pct: 5, vesting: "Locked, emergency use only", color: "var(--fg-70)" },
];

const toc = [
  { id: "supply", heading: "Supply" },
  { id: "allocation", heading: "Allocation" },
  { id: "vesting", heading: "Vesting Schedule" },
  { id: "contract", heading: "Contract" },
];

export default function TokenomicsPage() {
  return (
    <ProsePage
      eyebrow="Tokenomics"
      title="$SIRO Supply & Allocation"
      lede="Transparent, verifiable token distribution with long vesting for insiders."
      toc={toc}
    >
      <Section id="supply" heading="Supply">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 20, background: "var(--soft, var(--surface))", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-70, var(--secondary))", marginBottom: 4 }}>Total Supply</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>10,000,000</div>
            <div style={{ fontSize: 13, color: "var(--fg-70, var(--secondary))" }}>SIRO</div>
          </div>
          <div style={{ padding: 20, background: "var(--soft, var(--surface))", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-70, var(--secondary))", marginBottom: 4 }}>Circulating at TGE</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>1,500,000</div>
            <div style={{ fontSize: 13, color: "var(--fg-70, var(--secondary))" }}>15% of supply</div>
          </div>
          <div style={{ padding: 20, background: "var(--soft, var(--surface))", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-70, var(--secondary))", marginBottom: 4 }}>Burned to Date</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>216,500</div>
            <div style={{ fontSize: 13, color: "var(--fg-70, var(--secondary))" }}>2.16% of supply</div>
          </div>
        </div>
      </Section>

      <Section id="allocation" heading="Allocation">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line, var(--surface))", textAlign: "left" }}>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Category</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Allocation</th>
              <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Tokens</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={a.name} style={{ borderBottom: "1px solid var(--line, var(--surface))" }}>
                <td style={{ padding: "12px 8px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, display: "inline-block" }} />
                    {a.name}
                  </span>
                </td>
                <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600 }}>{a.pct}%</td>
                <td style={{ padding: "12px 8px", textAlign: "right", fontFamily: "monospace" }}>
                  {(10_000_000 * a.pct / 100).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 4, height: 32, borderRadius: 8, overflow: "hidden", marginTop: 20 }}>
          {allocations.map((a) => (
            <div
              key={a.name}
              style={{ width: `${a.pct}%`, background: a.color, minWidth: 2 }}
              title={`${a.name}: ${a.pct}%`}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginTop: 12, fontSize: 12 }}>
          {allocations.map((a) => (
            <span key={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--fg-70, var(--secondary))" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, display: "inline-block" }} />
              {a.name} ({a.pct}%)
            </span>
          ))}
        </div>
      </Section>

      <Section id="vesting" heading="Vesting Schedule">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line, var(--surface))", textAlign: "left" }}>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Category</th>
              <th style={{ padding: "10px 8px", fontWeight: 600 }}>Vesting</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={a.name} style={{ borderBottom: "1px solid var(--line, var(--surface))" }}>
                <td style={{ padding: "12px 8px", fontWeight: 600 }}>{a.name}</td>
                <td style={{ padding: "12px 8px", color: "var(--fg-70, var(--secondary))" }}>{a.vesting}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section id="contract" heading="Contract">
        <p>
          The $SIRO token contract is deployed on Robinhood Chain (Chain ID: 4663).
        </p>
        <div
          style={{
            padding: 16,
            background: "var(--soft, var(--surface))",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 14,
            wordBreak: "break-all",
            color: "var(--fg-70, var(--secondary))",
          }}
        >
          Contract address: TBD  pending deployment
        </div>
      </Section>

      <Note>
        Token allocations and vesting are enforced onchain. $SIRO is a utility token  it does not
        represent equity, debt, or any claim on revenue. Siro is software, not investment advice.
      </Note>
    </ProsePage>
  );
}
