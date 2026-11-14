"use client";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/lib/workspace";
import { WorkspaceAccess } from "./WorkspaceAccess";
import { DEFAULT_POLICY, validateWorkspace, type StrategyDraft, type Policy } from "@/lib/workspace-model";
import Link from "next/link";
import { useGuardedActions } from "@/lib/guarded";
import { useNetwork } from "@/lib/network";
import { useAccount } from "wagmi";

export const inputClass = "mt-2 block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink";
export const buttonClass = "rounded-pill border border-line px-5 py-2.5 text-sm disabled:opacity-40";
const blank = (): StrategyDraft => ({ id: "", name: "", allocations: [], policy: { ...DEFAULT_POLICY }, rebalanceHours: 168, driftBps: 500, updatedAt: "" });
export function StrategyStudio() {
  const ws = useWorkspace(), net = useNetwork(), actions = useGuardedActions();
  const { address } = useAccount();
  const [draft, setDraft] = useState<StrategyDraft>(blank), [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState(""), [symbol, setSymbol] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (loaded || !ws.workspace) return;
    const id = new URLSearchParams(window.location.search).get("edit");
    const existing = ws.workspace.strategies.find(s => s.id === id);
    const frame = requestAnimationFrame(() => { if (existing) setDraft(existing); setLoaded(true); });
    return () => cancelAnimationFrame(frame);
  }, [ws.workspace, loaded]);
  const update = (next: StrategyDraft) => { setDraft(next); setMessage(""); };
  function checked() { return validateWorkspace({ strategies: [{ ...draft, id: draft.id || crypto.randomUUID(), updatedAt: new Date().toISOString() }], schedules: [], settings: { displayName: "" } }).strategies[0]; }
  async function save() {
    try { const s = checked(); if (!ws.workspace) throw new Error("Sign in first."); await ws.save({ ...ws.workspace, strategies: [...ws.workspace.strategies.filter(x => x.id !== s.id), s] }); setDraft(s); setMessage("Strategy saved to your wallet workspace."); } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); }
  }
  function add() {
    if (!/^0x[0-9a-fA-F]{40}$/.test(token) || !symbol.trim()) { setMessage("Enter a verified token address on the selected chain and its symbol."); return; }
    if (draft.allocations.some(a => a.token.toLowerCase() === token.toLowerCase() || a.symbol === symbol.trim())) { setMessage("That token or symbol is already selected."); return; }
    update({ ...draft, allocations: [...draft.allocations, { token, symbol: symbol.trim(), weightBps: draft.allocations.length ? 0 : 10000 }] }); setToken(""); setSymbol("");
  }
  return <div className="space-y-6 py-10"><h1 className="font-serif text-3xl">Strategy Studio</h1><WorkspaceAccess />
    <p className="text-sm text-fg-70">Save allocations, review engine validation, and create a vault after deployment. Rebalancing requires a configured executor; saving a strategy does not start trading.</p>
    <section className="rounded-xl border border-line p-5 space-y-4"><label className="block text-sm">Strategy name<input className={inputClass} maxLength={64} value={draft.name} onChange={e => update({ ...draft, name: e.target.value })} /></label>
      <p className="text-sm">Add token addresses from chain {net.id}. Weights must total 100%.</p>
      <div className="grid sm:grid-cols-3 gap-3"><input aria-label="Token address" className={inputClass} placeholder="Verified token address" value={token} onChange={e => setToken(e.target.value)} /><input aria-label="Token symbol" className={inputClass} placeholder="Symbol" maxLength={24} value={symbol} onChange={e => setSymbol(e.target.value)} /><button className={buttonClass} onClick={add}>Add token</button></div>
      {draft.allocations.map((a, i) => <div key={a.token} className="flex flex-wrap items-center gap-3"><span className="text-sm">{a.symbol}</span><input aria-label={`${a.symbol} allocation percent`} className={`${inputClass} max-w-28`} type="number" min="0" max="100" step="0.01" value={a.weightBps / 100} onChange={e => update({ ...draft, allocations: draft.allocations.map((x, j) => j === i ? { ...x, weightBps: Math.round(Number(e.target.value) * 100) } : x) })} /><span>%</span><button className={buttonClass} onClick={() => update({ ...draft, allocations: draft.allocations.filter((_, j) => i !== j) })}>Remove</button></div>)}
      <p className="text-sm">Total: {draft.allocations.reduce((s, a) => s + a.weightBps, 0) / 100}%</p>
      <div className="grid sm:grid-cols-2 gap-3"><label className="block text-sm font-medium">Rebalance interval (hours)<input className={inputClass} type="number" min="1" value={draft.rebalanceHours} onChange={e => update({ ...draft, rebalanceHours: Number(e.target.value) })} /></label><label className="block text-sm font-medium">Drift threshold (%)<input className={inputClass} type="number" min="0.01" step="0.01" value={draft.driftBps / 100} onChange={e => update({ ...draft, driftBps: Math.round(Number(e.target.value) * 100) })} /></label></div>
      <h2 className="font-serif text-xl">Vault risk policy</h2><div className="grid sm:grid-cols-3 gap-3">{(Object.keys(DEFAULT_POLICY) as (keyof Policy)[]).map(key => <label className="text-xs" key={key}>{key} {key.endsWith("Bps") ? "(bps)" : "(seconds)"}<input className={inputClass} type="number" min="0" value={draft.policy[key]} onChange={e => update({ ...draft, policy: { ...draft.policy, [key]: Number(e.target.value) } })} /></label>)}</div>
      <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={!ws.workspace || ws.busy} onClick={save}>Save strategy</button><button className={buttonClass} onClick={() => { try { const url = URL.createObjectURL(new Blob([JSON.stringify(checked(), null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "siro-strategy.json"; a.click(); URL.revokeObjectURL(url); } catch (e) { setMessage(e instanceof Error ? e.message : "Export failed."); } }}>Export JSON</button><button className={buttonClass} disabled={!net.guardedVaultFactory || !address || !!actions.step} onClick={async () => { try { const s = checked(); const metadata = `data:application/json,${encodeURIComponent(JSON.stringify({ version: 1, name: s.name, allocations: s.allocations, rebalanceHours: s.rebalanceHours, driftBps: s.driftBps }))}`; await actions.create(s.name, s.policy, metadata); setMessage("Vault creation confirmed. Open Overview to configure permissions and deposit."); } catch (e) { setMessage(e instanceof Error ? e.message : "Vault creation failed."); } }}>Create onchain vault</button></div>
      <p className="text-xs text-fg-70">Vault creation publishes its name and allocation targets onchain.</p>
    </section>
    <section className="rounded-xl border border-line p-5 space-y-4"><h2 className="font-serif text-xl">Historical validation</h2><p className="text-sm text-fg-70">Published validation uses hourly OHLCV, point-in-time depth, venue fees and walk-forward windows. Results show gross and net together, with every failed release check.</p><Link className="underline" href="/evidence">Inspect engine validation and performance</Link>
    </section>{message && <p role="status" className="text-sm break-words">{message}</p>}{actions.step && <p role="status">{actions.step} - confirm in your wallet.</p>}
  </div>;
}
