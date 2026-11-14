import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";
import { Leaderboard } from "@/components/trading/Leaderboard";
import { OnChainStatus, type Stage } from "@/components/trading/OnChainStatus";
import { tradingBoard } from "@/lib/server/trading";
import { chainStatus } from "@/lib/server/chain-status";
import { deployment } from "@/lib/generated/deployment";
export const dynamic = "force-dynamic";
export const metadata = { title: "Trading evidence | Siro" };

const TEXT = {
  en: {
    eyebrow: "Evidence", title: "We don't ask you to trust us. Check it yourself.",
    lede: "Live contract state from Robinhood Chain, plus net performance, costs and decision proofs from the trading engine. Only agents whose latest daily reconciliation passed are shown.",
    verify: "Verify a decision ↗", hiddenTitle: "Hidden until reconciled", hiddenBody: "These agents' numbers are withheld: a wrong number is worse than none.",
    perfTitle: "Agent performance", noEngine: "Performance appears here once the trading engine publishes its first reconciled day. Nothing is estimated in the meantime.",
    empty: "No agent has passed reconciliation yet, so no numbers are shown.", chainDown: "Robinhood Chain RPC did not answer. Refresh in a moment.",
  },
};

export default async function EvidencePage() {
  const t = TEXT.en;
  const [board, chain] = await Promise.all([tradingBoard().then((b) => b, () => null), chainStatus().then((s) => s, () => null)]);
  const agents = board?.visible ?? [];
  const hidden = board?.hidden ?? [];
  const router = "uniswapV3Adapter" in deployment;
  const stages: Stage[] = [
    { label: "Contracts on mainnet", done: !!chain && Object.values(chain.live).every(Boolean), note: "Anchor, executor, vault factory, registry and oracle." },
    { label: "Vault creation", done: !!chain?.live.GuardedVaultFactory, note: "Anyone can create a guarded USDG vault from the app." },
    { label: "Swap router", done: router, note: router ? "Agents can route trades through the approved adapter." : "UniswapV3Adapter is being deployed so agents can trade." },
    { label: "Trading engine", done: !!board, note: board ? "Engine is publishing reconciled days." : "Engine service is being brought online on our server." },
  ];
  return (
    <ProsePage wide eyebrow={t.eyebrow} title={t.title} lede={t.lede}>
      <p><Link className="underline" href="/verify">{t.verify}</Link></p>
      {chain ? <OnChainStatus s={chain} stages={stages} /> : <p role="status">{t.chainDown}</p>}
      <h2>{t.perfTitle}</h2>
      {hidden.length > 0 && <section aria-label={t.hiddenTitle}><h3>{t.hiddenTitle}</h3><p>{t.hiddenBody}</p><ul>{hidden.map(h => <li key={h.agent_id}><code>{h.agent_id}</code>: {h.reason}</li>)}</ul></section>}
      {!board && <p role="status">{t.noEngine}</p>}
      {board && agents.length === 0 && <p role="status">{t.empty}</p>}
      {agents.length > 0 && <Leaderboard agents={agents} />}
    </ProsePage>
  );
}
