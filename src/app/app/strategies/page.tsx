"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { WorkspaceAccess } from "@/components/app/WorkspaceAccess";
import { buttonClass } from "@/components/app/StrategyStudio";
import { useWorkspace } from "@/lib/workspace";
import { useNetwork } from "@/lib/network";
export default function StrategiesPage() {
  const ws = useWorkspace(), net = useNetwork(); const [message, setMessage] = useState("");
  return <AppShell><div className="space-y-5 py-10"><h1 className="font-serif text-3xl">My Strategies</h1><WorkspaceAccess /><Link className={buttonClass} href={net.link("/app/studio")}>Create strategy</Link>
    {ws.workspace && !ws.workspace.strategies.length && <p className="text-sm text-fg-70">No saved strategies on this network. Build your first allocation in Studio.</p>}
    {ws.workspace?.strategies.map(s => <article key={s.id} className="rounded-xl border border-line p-5 space-y-3"><h2 className="font-serif text-xl">{s.name}</h2><p className="text-sm">Saved allocation - execution requires a configured vault and keeper</p><p className="text-sm text-fg-70">{s.allocations.map(a => `${a.symbol} ${a.weightBps / 100}%`).join(" / ")} | Rebalance every {s.rebalanceHours} hours | Updated {new Date(s.updatedAt).toLocaleString()}</p><div className="flex flex-wrap gap-3"><Link className={buttonClass} href={`${net.link("/app/studio")}${net.link("/app/studio").includes("?") ? "&" : "?"}edit=${encodeURIComponent(s.id)}`}>Edit / backtest / create vault</Link><button className={buttonClass} disabled={ws.busy} onClick={async () => { try { await ws.save({ ...ws.workspace!, strategies: ws.workspace!.strategies.filter(x => x.id !== s.id), schedules: ws.workspace!.schedules.filter(x => x.strategyId !== s.id) }); setMessage("Strategy and its schedules deleted. Onchain vaults are unaffected."); } catch (e) { setMessage(e instanceof Error ? e.message : "Delete failed."); } }}>Delete saved strategy</button></div></article>)}
    {message && <p role="status">{message}</p>}</div></AppShell>;
}
