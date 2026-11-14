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
  id: {
    failed: "Verifikasi gagal.", id: "ID keputusan", verify: "Verifikasi", checking: "Memeriksa…", result: "Hasil verifikasi",
    checks: "Pemeriksaan di browser", commitment: "komitmen", hourly: "proof Merkle per jam", daily: "proof Merkle harian", witness: "witness publikasi",
    hidden: "tersembunyi sampai reveal", matches: "cocok", FAILED: "GAGAL",
    absent: "tidak ada, jadi publikasi tepat waktu TIDAK terbukti", notIncluded: "GAGAL: commit hash tidak ada di batch yang di-witness",
    afterReveal: "memuat hash ini; waktunya bisa dicek setelah reveal", timely: (s: number) => `tepat waktu (${s} detik setelah tick)`, late: (s: number) => `TIDAK tepat waktu (${s} detik setelah tick)`,
    confirm: (root: string) => `Cek di chain: Anchor.witnessedAt(0x${root}) harus sama dengan witnessed_at di bawah.`,
    note: "Komitmen tetap tersembunyi sampai waktu reveal. Rantai hash yang valid saja tidak membuktikan publikasi tepat waktu. Transaksi anchor yang tidak ada berarti belum terverifikasi.",
  },
} satisfies Record<Locale, unknown>;

export function DecisionVerifier() {
  const [locale] = useLocale();
  const s = S[locale];
  const [id, setId] = useState(""); const [result, setResult] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [local, setLocal] = useState<Awaited<ReturnType<typeof checkDecisionProof>> | null>(null);
  async function verify(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setResult(null); setLocal(null);
    try {
      const r = await fetch(`/api/trading/verify/${encodeURIComponent(id.trim())}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || s.failed);
      setResult(data); setLocal(await checkDecisionProof(data));
    } catch (e) { setError(e instanceof Error ? e.message : s.failed); } finally { setBusy(false); }
  }
  const ok = (v: boolean | null, hiddenText?: string) => (v === null ? hiddenText ?? s.hidden : v ? s.matches : s.FAILED);
  const pub = local?.publication;
  const lag = Math.round((pub?.lagMs ?? 0) / 1000);
  const witness = !pub ? "" : pub.included === null ? s.absent : !pub.included ? s.notIncluded : pub.timely === null ? s.afterReveal : pub.timely ? s.timely(lag) : s.late(lag);
  return <>
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
