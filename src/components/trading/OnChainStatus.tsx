import { ALL_CHAINS } from "@/lib/chains";
import { CONTRACTS, type ChainStatus } from "@/lib/server/chain-status";

const EXPLORER = ALL_CHAINS[4663]?.explorerUrl;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ago = (s: number) => { const m = Math.max(0, Math.round((Date.now() / 1000 - s) / 60)); return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
const card = "rounded-xl border border-line bg-surface p-5";

export type Stage = { label: string; done: boolean; note: string };

export function OnChainStatus({ s, stages }: { s: ChainStatus; stages: Stage[] }) {
  const stats = [
    { label: "Latest block", value: s.block.toLocaleString("en-US"), note: ago(s.blockTime) },
    { label: "Contracts live", value: `${Object.values(s.live).filter(Boolean).length} / ${CONTRACTS.length}`, note: "bytecode checked on this request" },
    { label: "Agents registered", value: s.agents === null ? "—" : String(s.agents), note: "AgentRegistry.nextAgentId − 1" },
    { label: "USDG / USD", value: s.usdg ? `$${s.usdg.price.toFixed(4)}` : "—", note: s.usdg ? `Chainlink, updated ${ago(s.usdg.updatedAt)}` : "feed unavailable" },
  ];
  return (
    <div className="not-prose space-y-10">
      <section aria-labelledby="live-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="live-title" className="text-xl font-medium">Live on Robinhood Chain</h2>
          <span className="inline-flex items-center gap-2 text-sm text-fg-70"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />Read from mainnet just now</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((x) => <div key={x.label} className={card}><p className="text-sm text-fg-70">{x.label}</p><p className="mt-2 text-2xl font-medium tabular-nums">{x.value}</p><p className="mt-1 text-xs text-fg-70">{x.note}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="contracts-title">
        <h2 id="contracts-title" className="text-xl font-medium">Contracts</h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {CONTRACTS.map((k) => (
            <li key={k.name} className={`${card} flex items-start justify-between gap-4`}>
              <div><p className="font-medium">{k.name}</p><p className="mt-1 text-sm text-fg-70">{k.role}</p>
                {EXPLORER ? <a className="mt-2 inline-block font-mono text-sm underline" href={`${EXPLORER}/address/${k.address}`} target="_blank" rel="noreferrer">{short(k.address)} ↗</a> : <code className="mt-2 inline-block text-sm">{short(k.address)}</code>}</div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${s.live[k.name] ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>{s.live[k.name] ? "Live" : "Not found"}</span>
            </li>
          ))}
        </ul>
        {s.killed !== null && <p className="mt-3 text-sm text-fg-70">SessionExecutor kill switch: <strong>{s.killed ? "ON, all agent sessions stopped" : "off"}</strong></p>}
      </section>

      <section aria-labelledby="anchor-title">
        <h2 id="anchor-title" className="text-xl font-medium">Anchored decision roots · last 14 days</h2>
        {s.anchoredDays.length ? (
          <ul className="mt-5 space-y-2">{s.anchoredDays.map((d) => <li key={d.day} className={`${card} flex justify-between gap-4 py-3`}><span>{new Date(d.day * 86400000).toISOString().slice(0, 10)}</span><code className="text-sm">{short(d.root)}</code></li>)}</ul>
        ) : (
          <p className="mt-3 text-fg-70">No daily root anchored in the last 14 days. Roots appear here once an agent makes decisions; each one can be checked on <a className="underline" href="/verify">/verify</a>.</p>
        )}
      </section>

      <section aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" className="text-xl font-medium">What is live, what is next</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-2">
          {stages.map((x, i) => (
            <li key={x.label} className={`${card} flex gap-4`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-medium ${x.done ? "bg-emerald-400/15 text-emerald-300" : "border border-line text-fg-70"}`}>{x.done ? "✓" : i + 1}</span>
              <div><p className="font-medium">{x.label}</p><p className="mt-1 text-sm text-fg-70">{x.note}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
