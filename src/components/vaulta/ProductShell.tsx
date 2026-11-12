import type { ReactNode } from "react";
import { MarketingShell } from "@/components/editorial/MarketingShell";
import "@/styles/product-shell.css";

export function ProductShell({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede: string; children: ReactNode }) {
  return <MarketingShell>
    <section className="vp-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{lede}</p></section>
    {children}
  </MarketingShell>;
}

export function StatusTag({ children, tone = "lime" }: { children: ReactNode; tone?: "lime" | "red" | "neutral" }) {
  return <span className={`vp-tag vp-tag-${tone}`}>{children}</span>;
}
