import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductShell, StatusTag } from "@/components/vaulta/ProductShell";

const agents = {
  "constraint-first": { name: "Constraint First", summary: "A momentum example that prioritizes enforceable position and loss limits." },
  "balanced-rwa": { name: "Balanced RWA", summary: "An inverse-volatility example for approved stock tokens." },
  "cash-buffer": { name: "Cash Buffer", summary: "A weekly rebalance example with an explicit USDG reserve." },
} as const;
export function generateStaticParams() { return Object.keys(agents).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const agent = agents[slug as keyof typeof agents]; return { title: agent?.name ?? "Agent" }; }
export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const agent = agents[slug as keyof typeof agents]; if (!agent) notFound(); return <ProductShell eyebrow="AGENT DETAIL / DEMO" title={agent.name.toUpperCase()} lede={agent.summary}><section className="vp-content"><div className="vp-grid"><article className="vp-card"><StatusTag tone="neutral">SIMULATION</StatusTag><h2>Performance</h2><p>No verified performance history yet. Backtest results will always show data window, fee assumptions, and source.</p></article><article className="vp-card"><StatusTag tone="lime">ENFORCED</StatusTag><h2>Risk policy</h2><p>Only approved assets and routers. Explicit position, slippage, cooldown, and daily-loss bounds.</p></article><article className="vp-card"><StatusTag tone="neutral">NO DEPLOYMENT</StatusTag><h2>Vault</h2><p>This is an illustrative agent. It cannot accept deposits or execute trades.</p></article></div><div className="vp-note" style={{ margin: "40px 0 0" }}><StatusTag tone="red">DEMO ONLY</StatusTag><p>Never send funds to an address that is not shown in the verified deployment registry.</p></div><p style={{ marginTop: 35 }}><Link className="v-btn" href="/studio">Remix in Studio ↗</Link></p></section></ProductShell>; }
