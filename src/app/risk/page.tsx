import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Risk disclosures | Siro",
  description: "The ways you can lose money using Siro, stated plainly.",
};

export default function RiskPage() {
  return (
    <ProsePage eyebrow="Risk" title="Risk disclosures" lede="You can lose all of the funds you put into a Siro vault. Siro is software, not investment advice.">
      <h2>Market risk</h2>
      <p>Agents trade tokenized stocks whose prices move against positions. Backtests and paper results do not predict live results. Stop losses are checked once per hour on the hourly open, so a fast move can lose more than the stop.</p>
      <h2>Drawdown liquidation</h2>
      <p>At a 20% drawdown the agent sells every position and stops permanently. Selling happens in a falling market, so the final loss can exceed 20%.</p>
      <h2>Liquidity and cost risk</h2>
      <p>Tokenized-stock pools on Robinhood Chain can be thin. Slippage, pool fees and gas are estimated from pool depth and can be higher in practice; front-running (MEV) is not modelled in backtests.</p>
      <h2>Smart contract risk</h2>
      <p>No Siro contract has a third-party audit. A bug can lose funds. Contract owners are single addresses, not multisigs.</p>
      <h2>Key and operator risk</h2>
      <p>A leaked session key can trade up to its caps until it expires or you revoke it. Operator keys for anchoring are held by the operator. Revoke keys you no longer trust.</p>
      <h2>Issuer and chain risk</h2>
      <p>Tokenized stocks depend on their issuer; Siro does not guarantee redemption. Robinhood Chain can halt or reorganize, delaying or reversing transactions.</p>
      <h2>Model and data risk</h2>
      <p>Prices come from on-chain pools checked against Chainlink. Data can be wrong or stale; disputed prices block new positions but cannot prevent every error.</p>
    </ProsePage>
  );
}
