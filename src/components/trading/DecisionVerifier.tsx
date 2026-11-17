"use client";
import { useState, type FormEvent } from "react";
import { checkDecisionProof } from "@/lib/decision-proof";
import { useLocale } from "@/lib/use-locale";
import type { Locale } from "@/lib/i18n";

const S = {
  en: {
    failed: "Verification failed.", id: "Decision ID", verify: "Verify", checking: "Checking…", result: "Verification result",
    checks: "Browser checks", commitment: "commitment", hourly: "hourly Merkle proof", daily: "daily Merkle proof", witness: "publication witness",
    hidden: "hidden until reveal", matches: "matches", FAILED: "FAILED",
    absent: "absent, so timely publication is NOT proven", notIncluded: "FAILED: commit hash is not in the witnessed batch",
    afterReveal: "includes this hash; timing checkable after reveal", timely: (s: number) => `timely (${s} s after tick)`, late: (s: number) => `NOT timely (${s} s after tick)`,
    confirm: (root: string) => `Confirm on chain: Anchor.witnessedAt(0x${root}) must equal the witnessed_at shown below.`,
    note: "Commitments remain hidden until reveal time. A valid local hash chain alone does not prove timely public publication. An absent anchor transaction remains unverified.",
  },
} satisfies Record<Locale, unknown>;

export function DecisionVerifier() {
  const [locale] = useLocale();
  const s = S[locale];
  const [id, setId] = useState(""); const [result, setResult] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [local, setLocal] = useState<Awaited<ReturnType<typeof checkDecisionProof>> | null>(null);
  const [chain, setChain] = useState<{ checks: Record<string, boolean>; label: string; root_status: string; execution_status: string } | null>(null);
  async function verify(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setResult(null); setLocal(null); setChain(null);
    try {
      const r = await fetch(`/api/trading/verify/${encodeURIComponent(id.trim())}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || s.failed);
      setResult(data); setChain(data.verification ?? null); setLocal(await checkDecisionProof(data));
    } catch (e) { setError(e instanceof Error ? e.message : s.failed); } finally { setBusy(false); }
  }
  const ok = (v: boolean | null, hiddenText?: string) => (v === null ? hiddenText ?? s.hidden : v ? s.matches : s.FAILED);
  const pub = local?.publication;
  const lag = Math.round((pub?.lagMs ?? 0) / 1000);
  const witness = !pub ? "" : pub.included === null ? s.absent : !pub.included ? s.notIncluded : pub.timely === null ? s.afterReveal : pub.timely ? s.timely(lag) : s.late(lag);
  return <>
    <p>commitment-bound reveal, served by operator</p>
    {chain && <section aria-label="Chain verification"><p>{chain.root_status} · {chain.execution_status}</p>
      <table><tbody>{[
        ['witness_before_execution', 'Witness transaction before execution'],
        ['commitment_leaf_proof', 'Merkle proof: leaf equals commit_hash and resolves to root'],
        ['reveal_hash_match', 'Hash of revealed content equals commit_hash'],
        ['matching_trade_in_window', 'Matching TradeExecuted event in execution window'],
      ].map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{chain.checks[key] === true ? 'PASS' : 'FAIL / unproven'}</td></tr>)}</tbody></table>
      <p>The journal associates the trade with the decision. TradeExecuted does not emit the revealed decision. “Never executed” means no matching event in the supplied execution receipts and checked window.</p>
    </section>}
    {local && <p role="status">{s.checks}: {s.commitment} {ok(local.commitment)}; {s.hourly} {ok(local.hourly)}; {s.daily} {ok(local.daily)}; {s.witness} {witness}.{pub?.root && <> {s.confirm(pub.root)}</>}</p>}
    <form onSubmit={verify} className="my-6 flex flex-wrap gap-3">
      <label className="grow">{s.id}<input required value={id} onChange={e => setId(e.target.value)} className="block w-full border rounded p-3 font-mono" autoComplete="off" /></label>
      <button type="submit" disabled={busy} className="border rounded px-6 py-3">{busy ? s.checking : s.verify}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {result !== null && <pre className="overflow-auto border rounded p-4 text-xs" aria-label={s.result}>{JSON.stringify(result, null, 2)}</pre>}
    <p>{s.note}</p>
  </>;
}
