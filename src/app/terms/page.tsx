import { ProsePage, Section } from "@/components/ProsePage";

export const metadata = {
  title: "Terms  Siro",
  description:
    "Siro is non-custodial copy trading software. The terms, parameters, and user responsibilities.",
};

const TOC = [
  { id: "what-this-is", heading: "What this is" },
  { id: "what-it-costs", heading: "What it costs" },
  { id: "what-you-risk", heading: "Copy trading risks" },
  { id: "your-responsibility", heading: "Your responsibility" },
];

export default function Page() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Terms of Use"
      lede="Plain language, clear parameters. Siro is software that interacts directly with onchain smart contracts."
      meta={["Updated November 2026"]}
      toc={TOC}
    >
      <Section id="what-this-is" heading="What this is">
        <p>
          Siro is non-custodial copy trading software, not a bank, not a fund manager, and not a financial
          advisor. It provides an interface to <code>SiroCopyVault.sol</code>, <code>SiroRiskGuard.sol</code>,
          and <code>SiroLeaderboard.sol</code>. Responsibility for selecting leaders, configuring risk
          parameters, and managing your vault resides entirely with the user.
        </p>
      </Section>

      <Section id="what-it-costs" heading="What it costs">
        <p>
          Siro charges a 15% performance fee on profit above your vault&rsquo;s high-water mark, collected
          on withdrawal. 10% goes to the leaders you follow, 5% to the protocol. All transactions require
          the network gas fee.
        </p>
      </Section>

      <Section id="what-you-risk" heading="Copy trading risks">
        <p>
          Funds deposited into a copy vault are held by the smart contract and traded by an AI keeper
          agent through whitelisted DEX routers. Trading involves risk of loss. Past performance of leaders
          does not guarantee future returns. The RiskGuard contract enforces your risk parameters, but cannot
          eliminate market risk.
        </p>
        <p>
          Withdrawals are always available. Performance fees are deducted from profit only. If your vault
          balance is at or below the high-water mark, no fee is charged.
        </p>
      </Section>

      <Section id="your-responsibility" heading="Your responsibility">
        <p>
          You are responsible for safeguarding your private keys, evaluating the leaders you follow,
          configuring appropriate risk parameters, and managing your own tax and regulatory obligations.
        </p>
        <p>
          Questions: <a href="mailto:support@siro.trade">support@siro.trade</a>
        </p>
      </Section>
    </ProsePage>
  );
}
