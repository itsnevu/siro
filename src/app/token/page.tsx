import type { Metadata } from "next";
import { ProsePage, Section, Note } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "$SIRO Token  Siro",
  description: "$SIRO is the utility token powering the Siro platform. Useful, not required.",
};

const tiers = [
  { name: "Bronze", threshold: "100 SIRO", discount: "5%", credits: "50/mo", staking: "—", color: "var(--secondary)" },
  { name: "Silver", threshold: "1,000 SIRO", discount: "10%", credits: "200/mo", staking: "1.5x boost", color: "var(--secondary)" },
  { name: "Gold", threshold: "10,000 SIRO", discount: "20%", credits: "1,000/mo", staking: "2x boost", color: "var(--secondary)" },
  { name: "Platinum", threshold: "50,000 SIRO", discount: "30%", credits: "Unlimited", staking: "3x boost", color: "var(--surface-2)" },
];

const toc = [
  { id: "useful", heading: "Useful, Not Required" },
  { id: "tiers", heading: "Holder Tiers" },
  { id: "credits", heading: "Agent & API Credits" },
  { id: "staking", heading: "Creator Staking" },
  { id: "flywheel", heading: "The Flywheel" },
];

export default function TokenPage() {
  return (
    <ProsePage
      eyebrow="Token"
      title="$SIRO"
      lede="The utility token powering the Siro platform  fee discounts, agent credits, and creator staking. Useful, not required."
      toc={toc}
    >
      <Section id="useful" heading="Useful, Not Required">
        <p>
          You can use Siro without holding any $SIRO. The platform is fully functional with USDC.
          $SIRO gives you perks  lower fees, more agent credits, staking boosts  but it is never
          a gate. No token required to copy trade, create strategies, or run agents.
        </p>
      </Section>

      <Section id="tiers" heading="Holder Tiers">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line, var(--surface))", textAlign: "left" }}>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Tier</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Threshold</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Fee Discount</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Agent Credits</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Staking Boost</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.name} style={{ borderBottom: "1px solid var(--line, var(--surface))" }}>
                  <td style={{ padding: "12px 8px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, display: "inline-block" }} />
                      <strong>{t.name}</strong>
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px", fontFamily: "monospace" }}>{t.threshold}</td>
                  <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--secondary)" }}>{t.discount}</td>
                  <td style={{ padding: "12px 8px" }}>{t.credits}</td>
                  <td style={{ padding: "12px 8px" }}>{t.staking}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="credits" heading="Agent & API Credits">
        <p>
          Every Siro account receives free agent execution credits monthly. $SIRO holders get more.
          Credits are consumed when AI agents evaluate trades, run backtests, or access premium data feeds.
        </p>
        <ul>
          <li><strong>Free tier:</strong> 10 agent executions/month</li>
          <li><strong>Bronze:</strong> 50 executions/month</li>
          <li><strong>Silver:</strong> 200 executions/month</li>
          <li><strong>Gold:</strong> 1,000 executions/month</li>
          <li><strong>Platinum:</strong> Unlimited executions</li>
        </ul>
      </Section>

      <Section id="staking" heading="Creator Staking">
        <p>
          Strategy creators can stake $SIRO on their strategies. Staked strategies rank higher on the
          leaderboard and earn a multiplier on their share of performance fees. This aligns creator
          incentives  skin in the game.
        </p>
        <ul>
          <li><strong>Silver:</strong> 1.5x fee share boost</li>
          <li><strong>Gold:</strong> 2x fee share boost</li>
          <li><strong>Platinum:</strong> 3x fee share boost + featured placement</li>
        </ul>
      </Section>

      <Section id="flywheel" heading="The Flywheel">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          {[
            { step: "1", title: "Trade", desc: "Users copy strategies and generate trading volume on Robinhood Chain." },
            { step: "2", title: "Fee", desc: "Protocol earns 5% of profits. Revenue accumulates in the treasury." },
            { step: "3", title: "Buyback", desc: "Treasury buys $SIRO from the open market at regular intervals." },
            { step: "4", title: "Burn", desc: "Purchased $SIRO is permanently burned, reducing circulating supply." },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                padding: 20,
                background: "var(--soft, var(--surface))",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent, var(--secondary))", marginBottom: 8 }}>
                {item.step}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "var(--fg-70, var(--secondary))" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Note>
        $SIRO is a utility token. It does not represent equity, debt, or any claim on revenue.
        Token value may fluctuate. Siro is software, not investment advice.
      </Note>
    </ProsePage>
  );
}
