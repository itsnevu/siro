"use client";
import { useAccount } from "wagmi";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { WorkspaceAccess } from "@/components/app/WorkspaceAccess";
import { buttonClass, inputClass } from "@/components/app/StrategyStudio";
import { useWorkspace } from "@/lib/workspace";
import { useAgents } from "@/lib/guarded";
import { useNetwork } from "@/lib/network";
type Message = { role: "user" | "assistant"; content: string };
export default function AgentPage() { const net = useNetwork(); const { address } = useAccount(); return <AgentContent key={`${net.id}:${address}`} />; }
function AgentContent() {
  const net = useNetwork(), ws = useWorkspace(), agents = useAgents();
  const [messages, setMessages] = useState<Message[]>([]), [input, setInput] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [vault, setVault] = useState("");
  const config = useQuery<{ configured: boolean; model: string; price: string }>({ queryKey: ["agent-config"], queryFn: async () => { const r = await fetch("/api/agent"); if (!r.ok) throw new Error("Agent configuration is unavailable."); return r.json(); }, retry: false });
  async function send() {
    if (busy || !input.trim()) return;
    const conversation: Message[] = [...messages, { role: "user" as const, content: input.trim() }].slice(-11);
    setBusy(true); setError("");
    try { const r = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: conversation, chainId: net.id, ...(vault ? { vault } : {}) }) }); const body = await r.json(); if (!r.ok) throw new Error(body.error || "Agent request failed."); setMessages([...conversation, { role: "assistant", content: body.text }]); setInput(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Agent unavailable."); }
    finally { setBusy(false); }
  }
  return <AppShell><div className="py-10 space-y-5"><h1 className="font-serif text-3xl">Siro Agent</h1><WorkspaceAccess /><p className="text-sm text-fg-70">OpenRouter model is fixed by the server: {config.data?.model || "Loading..."}. No model switching or paid fallback. Responses can explain your saved strategies and a selected vault; transactions always require separate wallet actions.</p>{config.error && <p role="alert">{config.error.message}</p>}{config.data && !config.data.configured && <p role="status">Set OPENROUTER_API_KEY in the server environment to enable the Agent.</p>}
    <label className="block text-sm">Vault context<select className={inputClass} value={vault} onChange={e => { setVault(e.target.value); setMessages([]); }}><option value="">Saved strategies only</option>{agents.agents.map(a => <option key={a.vault} value={a.vault}>Agent #{a.id} - {a.vault}</option>)}</select></label>
    <div className="space-y-3" aria-live="polite">{!messages.length && <p className="text-sm text-fg-70">Ask about your allocation or vault risk policy. No example conversations are preloaded.</p>}{messages.map((m, i) => <article key={i} className="rounded-xl border border-line p-4"><p className="text-xs text-fg-70">{m.role === "user" ? "You" : "Siro"}</p><p className="whitespace-pre-wrap text-sm mt-2">{m.content}</p></article>)}</div>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); send(); }}><textarea aria-label="Message to Siro" className={inputClass} maxLength={4000} rows={3} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your strategy..." /><button className={buttonClass} disabled={!ws.authenticated || !config.data?.configured || busy || !input.trim()}>{busy ? "Waiting for OpenRouter..." : "Send"}</button><button type="button" className={buttonClass} disabled={busy} onClick={() => setMessages([])}>Clear conversation</button></form>{error && <p role="alert">{error}</p>}</div></AppShell>;
}
