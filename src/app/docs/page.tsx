import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";
import { ALL_CHAINS } from "@/lib/chains";

export const metadata: Metadata = {
  title: "Documentation | Siro",
  description: "How Siro works: decisions, risk permits, session keys, verification and costs on Robinhood Chain mainnet.",
};

const MAINNET = ALL_CHAINS[4663];

export default function DocsPage() {
  return (
    <ProsePage eyebrow="Documentation" title="How Siro works" lede="Agents trade tokenized stocks on Robinhood Chain from vaults their owners control. Every decision is committed before it can execute and can be verified by anyone.">
      <h2>1. Decisions</h2>
      <p>Once per hour, after a bar closes, the engine computes features from closed bars only, produces a probability and a target weight, and writes a decision. The decision is hashed (RFC 8785 JSON, SHA-256), chained to the previous one and committed before it can execute. Its content is revealed one hour later.</p>
      <h2>2. Risk permit</h2>
      <p>A separate risk process must sign every order. The permit is bound to the exact order, valid for at most 5 seconds, and can veto or shrink it: maximum weight per asset, sector cap, daily trade and turnover caps, correlation trim, stale or disputed prices, stop loss per position and a drawdown governor that liquidates and stops the agent at 20%.</p>
      <h2>3. Session keys</h2>
      <p>The agent never holds your funds. It trades through a session key you grant on <code>SessionExecutor</code>, limited by a per-trade cap, a daily cap, an asset and router allowlist and an expiry. You can revoke one key or every key at once.</p>
      <h2>4. Prices and costs</h2>
      <p>Prices come from Uniswap v3 USDG pools on Robinhood Chain, checked against Chainlink at the same block. Net results subtract pool fees, slippage from pool depth, and gas. Disputed or stale prices block new positions.</p>
      <h2>5. Verification</h2>
      <p>Any decision can be checked at <Link href="/verify">/verify</Link> without an account: commitment, Merkle proofs, the daily anchor and the publication witness on chain.</p>
      <h2>6. Contracts on Robinhood Chain (4663)</h2>
      <ul>
        <li><code>Anchor</code>: {MAINNET.anchor ? <code>{MAINNET.anchor}</code> : "not deployed"}</li>
        <li><code>SessionExecutor</code>: {MAINNET.sessionExecutor ? <code>{MAINNET.sessionExecutor}</code> : "not deployed"}</li>
        <li>Vault factory, registry and oracle: {MAINNET.guardedVaultFactory ? <code>{MAINNET.guardedVaultFactory}</code> : "not deployed yet"}</li>
      </ul>
      <h2>7. Fees</h2>
      <p>15% of realized profit above the high-water mark: 10% to the strategy creator, 5% to the protocol, fixed in the <code>FeeSplitter</code> contract. No profit, no fee.</p>
      <h2>8. Status</h2>
      <p>No agent trades real money yet, and no contract has a third-party audit. See <Link href="/security">Security</Link> and <Link href="/roadmap">Roadmap</Link>. The full technical documentation, including every known limitation, lives in the repository under <code>docs/</code>.</p>
    </ProsePage>
  );
}
