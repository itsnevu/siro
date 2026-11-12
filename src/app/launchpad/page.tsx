import type { Metadata } from "next";
import Link from "next/link";
import { ProductShell, StatusTag } from "@/components/vaulta/ProductShell";

export const metadata: Metadata = { title: "Agent Launchpad", description: "Discover clearly labeled Siro agent deployments and demos." };
const agents = [
  ["constraint-first", "Constraint First", "Demo", "Momentum policy with a 15% position cap and 2% daily-loss stop."],
  ["balanced-rwa", "Balanced RWA", "Demo", "Inverse-volatility allocation across an approved stock-token universe."],
  ["cash-buffer", "Cash Buffer", "Demo", "Rebalances weekly while retaining at least 30% of vault assets in USDG."],
];
export default function LaunchpadPage() { return <ProductShell eyebrow="Agent launchpad" title="Discover the policy, not the pitch." lede="No fake TVL or invented returns. Demo agents are illustrative until verified deployments and reproducible histories exist."><section className="vp-content"><div className="vp-grid">{agents.map(([slug, name, status, copy]) => <article className="vp-card" key={slug}><StatusTag tone="neutral">{status}</StatusTag><h2>{name}</h2><p>{copy}</p><Link href={`/agents/${slug}`}>Inspect agent ↗</Link></article>)}<article className="vp-card"><StatusTag tone="lime">Creators</StatusTag><h2>Launch yours</h2><p>Compile a policy, run a backtest, and prepare a guarded vault deployment.</p><Link href="/studio">Open Studio ↗</Link></article></div></section></ProductShell>; }
