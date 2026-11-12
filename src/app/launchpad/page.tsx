import type { Metadata } from "next";
import Link from "next/link";
import { ProductShell, StatusTag } from "@/components/vaulta/ProductShell";

export const metadata: Metadata = { title: "Agent Launchpad", description: "Discover clearly labeled VAULTA agent deployments and demos." };
const agents = [
  ["constraint-first", "Constraint First", "DEMO", "Momentum policy with a 15% position cap and 2% daily-loss stop."],
  ["balanced-rwa", "Balanced RWA", "DEMO", "Inverse-volatility allocation across an approved stock-token universe."],
  ["cash-buffer", "Cash Buffer", "DEMO", "Rebalances weekly while retaining at least 30% of vault assets in USDG."],
];
export default function LaunchpadPage() { return <ProductShell eyebrow="AGENT LAUNCHPAD" title="DISCOVER THE POLICY, NOT THE PITCH." lede="No fake TVL or invented returns. Demo agents are illustrative until verified deployments and reproducible histories exist."><section className="vp-content"><div className="vp-grid">{agents.map(([slug, name, status, copy]) => <article className="vp-card" key={slug}><StatusTag tone="neutral">{status}</StatusTag><h2>{name}</h2><p>{copy}</p><Link href={`/agents/${slug}`}>Inspect agent ↗</Link></article>)}<article className="vp-card"><StatusTag tone="lime">CREATORS</StatusTag><h2>Launch yours</h2><p>Compile a policy, run a backtest, and prepare a guarded vault deployment.</p><Link href="/studio">Open Studio ↗</Link></article></div></section></ProductShell>; }
