import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Whitepaper | Siro",
  description: "Design of Siro: committed decisions, separate risk authority, scoped session keys and falsifiable claims.",
};

export default function WhitepaperPage() {
  return (
    <ProsePage eyebrow="Whitepaper" title="Trading agents you can check" lede="Siro's claim is narrow: an agent's decisions cannot be changed after prices move, and its numbers can be recomputed by anyone. It does not claim that any agent is profitable.">
      <h2>Problem</h2>
      <p>Published trading results are easy to select, back-date or overstate. A reader usually cannot tell which decisions were made before the price moved, which costs were subtracted, or how many strategies were tried before the one that is shown.</p>
      <h2>Design</h2>
      <ol>
        <li><strong>Commit before execution.</strong> Each decision is hashed and chained before its order can execute, revealed after, and grouped into Merkle roots. A permissionless on-chain witness records when each batch of hashes became public.</li>
        <li><strong>Separate risk authority.</strong> A risk process outside the decision engine signs a short-lived permit for every order and can veto or shrink it.</li>
        <li><strong>Owner custody.</strong> Funds stay in contracts the owner controls. The agent holds only a capped, expiring, revocable session key.</li>
        <li><strong>Net, labelled numbers.</strong> Results are net of fees, slippage and gas, labelled backtest, paper or live, and hidden until a daily reconciliation against fills passes.</li>
        <li><strong>Validation before money.</strong> A strategy reaches paper or live only after walk-forward validation, a deflated Sharpe test, parameter sensitivity and out-of-sample periods locked on chain in advance.</li>
      </ol>
      <h2>What would prove it wrong</h2>
      <p>The conditions under which Siro adds no value are written down in advance with metrics and dates, in the repository under <code>docs/falsification.md</code>. Corrections are logged in <code>docs/honesty-log.md</code>.</p>
      <h2>Status</h2>
      <p>The evidence and vault contracts are on Robinhood Chain mainnet. No router adapter is configured, so no agent trades real money, and nothing has a third-party audit. See <Link href="/security">Security</Link>.</p>
    </ProsePage>
  );
}
