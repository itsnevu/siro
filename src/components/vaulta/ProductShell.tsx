import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./Brand";

export function ProductShell({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede: string; children: ReactNode }) {
  return <div className="vp-site">
    <header className="v-nav"><Brand /><nav aria-label="Primary navigation"><Link href="/studio">Studio</Link><Link href="/launchpad">Agents</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/docs">Docs</Link></nav><Link className="v-btn v-btn-small" href="/studio">Build Agent ↗</Link></header>
    <main>
      <section className="vp-hero"><p className="v-kicker">{eyebrow}</p><h1>{title}</h1><p>{lede}</p></section>
      {children}
    </main>
    <footer className="vp-footer"><Brand /><p>VAULTA is non-custodial software. Not audited. Not investment advice.</p><Link href="/">Back home ↗</Link></footer>
  </div>;
}

export function StatusTag({ children, tone = "lime" }: { children: ReactNode; tone?: "lime" | "red" | "neutral" }) {
  return <span className={`vp-tag vp-tag-${tone}`}>{children}</span>;
}
