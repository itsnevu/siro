import Link from "next/link";
import { ProsePage, Section } from "@/components/ProsePage";

export const metadata = {
  title: "Risk  Siro",
  description:
    "The honest limits of AI copy trading: market risk, smart contract execution, and keeper agent behavior.",
};

const TOC = [
  { id: "market-risk", heading: "Market risk and loss of capital" },
  { id: "keeper-agent", heading: "AI keeper agent limitations" },
  { id: "risk-guard", heading: "RiskGuard is not a guarantee" },
  { id: "contract-risk", heading: "Smart contract execution" },
];

export default function Page() {
  return (
    <ProsePage
      eyebrow="Risk disclosure"
      title="What can go wrong"
      lede="Every constraint and failure mode of copy trading vaults, stated with complete clarity."
      meta={["Updated November 2026"]}
      toc={TOC}
    >
      <Section id="market-risk" heading="Market risk and loss of capital">
        <p>
          Copy trading involves real market risk. The AI keeper executes trades on your behalf based on
          leader activity, but markets can move against any position. Past leader performance does not
          predict future results. You can lose some or all of your deposited capital.
        </p>
        <p>
          Use the kill switch or pause your vault at any time to stop all trading immediately. You can
          always withdraw your remaining balance.
        </p>
      </Section>

      <Section id="keeper-agent" heading="AI keeper agent limitations">
        <p>
          The keeper agent copies trades from leaders you follow through whitelisted DEX routers. It
          operates within the constraints of the RiskGuard contract, but it cannot predict market movements,
          guarantee execution prices, or prevent slippage beyond your configured tolerance.
        </p>
        <p>
          The keeper may skip trades that exceed your risk parameters. This means your vault&rsquo;s
          performance will not exactly mirror a leader&rsquo;s performance.
        </p>
      </Section>

      <Section id="risk-guard" heading="RiskGuard is not a guarantee">
        <p>
          <code>SiroRiskGuard.sol</code> enforces per-trade checks: max trade size, daily loss limit,
          per-token position cap, and slippage tolerance. These checks reduce exposure but do not eliminate
          risk. A token can lose value between the time of purchase and the next trade, and cascading
          losses across multiple positions are possible within daily limits.
        </p>
      </Section>

      <Section id="contract-risk" heading="Smart contract execution">
        <p>
          Siro executes on <code>SiroCopyVault.sol</code>, <code>SiroRiskGuard.sol</code>, and{" "}
          <code>SiroLeaderboard.sol</code>. While the contracts enforce non-custodial invariants (only you
          can withdraw your funds), software bugs or network-level delays can occur.
        </p>
        <p>
          A vault exists only on the chain it was created on. The contracts may be deployed on multiple
          networks; each deployment is independent.
        </p>
        <p>
          The protocol is in open beta. Start with small amounts. See also the{" "}
          <Link href="/terms">terms of use</Link> and <Link href="/docs">documentation</Link>.
        </p>
      </Section>
    </ProsePage>
  );
}
