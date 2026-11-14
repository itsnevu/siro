import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";
import { Leaderboard } from "@/components/trading/Leaderboard";
import { tradingBoard } from "@/lib/server/trading";
export const dynamic = "force-dynamic";
export const metadata = { title: "Trading evidence | Siro" };

const TEXT = {
  en: {
    eyebrow: "Evidence", title: "We don't ask you to trust us. Check it yourself.",
    lede: "Net performance, costs, validation failures and decision proofs from the trading engine. Only agents whose latest daily reconciliation passed are shown.",
    verify: "Verify a decision", hiddenTitle: "Hidden until reconciled", hiddenBody: "These agents' numbers are withheld: a wrong number is worse than none.",
    unavailable: "Trading data is unavailable.", noEstimate: "No performance figures are estimated.", empty: "No agent has passed reconciliation yet, so no numbers are shown.",
  },
};

export default async function EvidencePage() {
  const t = TEXT.en;
  let agents; let error; let hidden: { agent_id: string; reason: string }[] = [];
  try { const board = await tradingBoard(); agents = board.visible; hidden = board.hidden; } catch (e) { error = e instanceof Error ? e.message : t.unavailable; }
  return (
    <ProsePage wide eyebrow={t.eyebrow} title={t.title} lede={t.lede}>
      <p><Link className="underline" href="/verify">{t.verify}</Link></p>
      {hidden.length > 0 && <section aria-label={t.hiddenTitle}><h2>{t.hiddenTitle}</h2><p>{t.hiddenBody}</p><ul>{hidden.map(h => <li key={h.agent_id}><code>{h.agent_id}</code>: {h.reason}</li>)}</ul></section>}
      {error && <p role="status">{error} {t.noEstimate}</p>}
      {agents && agents.length === 0 && !error && <p role="status">{t.empty}</p>}
      {agents && agents.length > 0 && <Leaderboard agents={agents} />}
    </ProsePage>
  );
}
