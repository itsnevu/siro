"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgents } from "@/lib/guarded";
import { useAccount } from "wagmi";
import { useNetwork } from "@/lib/network";
import { AppShell } from "@/components/app/AppShell";
import { WorkspaceAccess } from "@/components/app/WorkspaceAccess";
import { buttonClass, inputClass } from "@/components/app/StrategyStudio";
import { useWorkspace } from "@/lib/workspace";
import type { Schedule } from "@/lib/workspace-model";

type Job = { id: string; name: string; chain_id: number; vault: string; state: { status: string; detail: string; last_tick: number; updated: number } | null };

export default function SchedulesPage() {
  const ws = useWorkspace(); const net = useNetwork(); const agents = useAgents(); const { address } = useAccount();
  const [vault, setVault] = useState(""), [adapter, setAdapter] = useState(""), [strategy, setStrategy] = useState(""), [hours, setHours] = useState(168), [jobId, setJobId] = useState(""), [message, setMessage] = useState("");
  const keeper = useQuery<{ heartbeat: { online: boolean; mode: string; signer: string | null } | null }>({ queryKey: ["keeper", address], queryFn: async () => { const r = await fetch("/api/keeper"); const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; }, enabled: ws.authenticated, refetchInterval: 10_000, retry: false });
  const scheduler = useQuery<{ online: boolean; jobs: Job[] }>({ queryKey: ["scheduler", address], queryFn: async () => { const r = await fetch("/api/scheduler"); const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; }, enabled: ws.authenticated, refetchInterval: 10_000, retry: false });
  const jobs = (scheduler.data?.jobs ?? []).filter(j => j.chain_id === net.id);
  const save = async (schedules: Schedule[], done: string) => { try { await ws.save({ ...ws.workspace!, schedules }); setMessage(done); } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); } };
  const schedules = ws.workspace?.schedules ?? [];
  return <AppShell><div className="py-10 space-y-5">
    <h1 className="font-serif text-3xl">Schedules</h1>
    <WorkspaceAccess />
    <p className="text-sm text-fg-70">Automated trading runs only through the validated engine runner: each hourly decision is committed, risk-permitted, and gated by its release evidence before any order. A schedule can be enabled only when it links an engine job registered for your vault on this network, and only by the vault owner.</p>
    <p className="text-sm">Engine scheduler: {scheduler.data ? (scheduler.data.online ? "online" : "offline. Enabled schedules will not run until it is back") : "unknown"}. Legacy keeper (monitoring only): {keeper.data?.heartbeat?.online ? keeper.data.heartbeat.mode : "Offline"}.</p>
    {(scheduler.error || keeper.error) && <p role="alert">{(scheduler.error ?? keeper.error)?.message}</p>}

    <section className="rounded-xl border border-line p-5 space-y-3" aria-labelledby="engine-heading">
      <h2 id="engine-heading" className="font-serif text-xl">Link an engine job</h2>
      {jobs.length === 0 ? <p className="text-sm">No engine job is registered for this network. The operator registers jobs in the scheduler registry.</p> : <>
        <label className="text-sm">Engine job<select className={inputClass} value={jobId} onChange={e => setJobId(e.target.value)}><option value="">Select an engine job</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.name} | vault {j.vault} | {j.state?.status ?? "not run yet"}</option>)}</select></label>
        <button className={buttonClass} disabled={!ws.workspace || !jobId || ws.busy} onClick={() => { const job = jobs.find(j => j.id === jobId)!; void save([...schedules, { id: crypto.randomUUID(), strategyId: "", intervalHours: 1, startsAt: new Date().toISOString(), vault: job.vault, adapter: "", enabled: false, engineJobId: job.id }], "Engine schedule saved paused. Enable it to let the scheduler run the job."); }}>Save engine schedule (paused)</button>
      </>}
    </section>

    <section className="rounded-xl border border-line p-5 space-y-3" aria-labelledby="legacy-heading">
      <h2 id="legacy-heading" className="font-serif text-xl">Rebalance configuration (not automated)</h2>
      <p className="text-sm text-fg-70">Allocation rebalances have no committed decisions or release gate, so they cannot be enabled. They are stored for reference only.</p>
      <label className="text-sm">Strategy<select className={inputClass} value={strategy} onChange={e => setStrategy(e.target.value)}><option value="">Select a saved strategy</option>{ws.workspace?.strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-sm">Interval (hours)<input className={inputClass} min="1" max="8760" type="number" value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
      <label className="text-sm">Vault<select className={inputClass} value={vault} onChange={e => setVault(e.target.value)}><option value="">Select vault</option>{agents.agents.map(a => <option key={a.vault} value={a.vault}>Agent #{a.id} - {a.vault}</option>)}</select></label>
      <label className="text-sm">Guarded router adapter<input className={inputClass} value={adapter} onChange={e => setAdapter(e.target.value)} placeholder="Adapter contract address" /></label>
      <button className={buttonClass} disabled={!ws.workspace || !strategy || ws.busy} onClick={() => void save([...schedules, { id: crypto.randomUUID(), strategyId: strategy, intervalHours: hours, startsAt: new Date(Date.now() + hours * 3600_000).toISOString(), vault, adapter, enabled: false }], "Rebalance configuration saved. It is not automated.")}>Save rebalance configuration</button>
    </section>

    {schedules.map(s => { const job = scheduler.data?.jobs.find(j => j.id === s.engineJobId); return <article key={s.id} className="rounded-xl border border-line p-5 space-y-3">
      <h2>{s.engineJobId ? `Engine job: ${job?.name ?? s.engineJobId}` : ws.workspace!.strategies.find(x => x.id === s.strategyId)?.name ?? "Rebalance configuration"}</h2>
      <p className="text-sm">{s.engineJobId ? "Runs every closed hour" : `Every ${s.intervalHours} hours (not automated)`} | {s.enabled ? "Enabled" : "Paused"}</p>
      <p className="text-xs break-all">Vault: {s.vault || "Not selected"}{s.adapter ? ` | Adapter: ${s.adapter}` : ""}</p>
      {job?.state && <p className="text-sm">Scheduler: {job.state.status} - {job.state.detail}{job.state.last_tick >= 0 ? ` | Last tick ${new Date(job.state.last_tick).toISOString()}` : ""}</p>}
      {s.engineJobId && <button className={buttonClass} disabled={ws.busy} onClick={() => void save(schedules.map(x => x.id === s.id ? { ...x, enabled: !s.enabled } : x), s.enabled ? "Schedule paused. The scheduler starts no new tick for it; an order already broadcast cannot be cancelled here." : "Schedule enabled. The scheduler runs the job from the next due tick.")}>{s.enabled ? "Pause" : "Enable"}</button>}
      {!s.engineJobId && s.enabled && <button className={buttonClass} disabled={ws.busy} onClick={() => void save(schedules.map(x => !x.engineJobId ? { ...x, enabled: false } : x), "Legacy schedules paused.")}>Pause legacy schedules</button>}
      <button className={buttonClass} disabled={ws.busy} onClick={() => void save(schedules.filter(x => x.id !== s.id), "Schedule deleted.")}>Delete schedule</button>
    </article>; })}
    {message && <p role="status">{message}</p>}
  </div></AppShell>;
}
