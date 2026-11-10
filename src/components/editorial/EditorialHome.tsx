"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Section } from "./Section";
import { PillTabs } from "./PillTabs";
import { TypewriterWord } from "./TypewriterWord";
import { NumberedFeatureList } from "./NumberedFeatureList";
import { ScrollRevealText } from "./ScrollRevealText";
import { AllocationBar } from "./AllocationBar";
import { CTABand } from "./CTABand";
import { Faq } from "@/components/Faq";
import { LINKS } from "@/lib/links";
import { strategies } from "@/lib/mock";
import { HeroVisual } from "./HeroVisual";
import { ClassicalArtwork } from "./ClassicalArtwork";
import { CapitalFlow } from "./CapitalFlow";

const WORDS = ["your rules.", "your pace.", "your choice."];
const MODES = [
  { eyebrow: "01 · Discover", title: "Find a strategy that feels like you.", description: "Explore portfolios, compare allocations, and understand the approach before you take the next step.", href: "/strategies", action: "Explore strategies", rows: ["Alpha Momentum", "Steady Yield", "Tech Macro"], meta: "Explore · compare · decide" },
  { eyebrow: "02 · Studio", title: "A little structure. A lot of possibility.", description: "Choose your assets, shape your allocations, and turn an investment idea into a strategy with clear boundaries.", href: "/studio", action: "Open Studio", rows: ["Choose your assets", "Set target weights", "Review your strategy"], meta: "Build · review · refine" },
  { eyebrow: "03 · Agent", title: "An agent that answers to you.", description: "Understand how the agent evaluates trades against your limits. You set the policy; every action should have a reason.", href: "/agent", action: "Meet your agent", rows: ["Check liquidity", "Evaluate risk limits", "Explain the decision"], meta: "Observe · evaluate · explain" },
];

function Arrow() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Glyph({ kind = 0 }: { kind?: number }) {
  return <span className={`ed-glyph ed-glyph-${kind}`} aria-hidden="true"><i /><i /><i /><i /></span>;
}

function ProductPanel() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const mode = MODES[active];
  return <>
    <div className="ed-tabs"><PillTabs tabs={["Discover", "Studio", "Agent"]} activeIndex={active} onChange={setActive} /></div>
    <div className="ed-product-panel">
      <AnimatePresence mode="wait" initial={false}><motion.div key={active} className="ed-product-copy" initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
        <p className="eyebrow">{mode.eyebrow}</p><h3>{mode.title}</h3><p>{mode.description}</p><Link href={mode.href} className="btn-primary">{mode.action}<Arrow /></Link>
      </motion.div></AnimatePresence>
      <div className="ed-app-preview">
        <div className="ed-preview-top"><span className="ed-wordmark">siro.</span><span className="pill-badge">Product preview</span></div>
        <div className="ed-preview-heading"><span>{["Your next starting point", "Your strategy workspace", "Your policy, in practice"][active]}</span><span className="mono-meta">0{active + 1} / 03</span></div>
        <div className="ed-preview-filter"><span>{["All strategies", "Allocation", "Policy checks"][active]}</span><span>{["Watchlist", "Schedule", "Activity"][active]}</span></div>
        {mode.rows.map((name, index) => <div className="ed-preview-row" key={name}><span className="ed-preview-icon"><Glyph kind={index} /></span><div><strong>{name}</strong><span className="mono-meta">{active === 0 ? ["40 / 30 / 30", "20 / 20 / 20 / 20 / 20", "50 / 30 / 20"][index] : ["Step 01", "Step 02", "Step 03"][index]}</span></div><Arrow /></div>)}
        <div className="ed-preview-bottom"><span className="ed-status-dot" />{mode.meta}</div>
      </div>
    </div>
  </>;
}

export function EditorialHome() {
  return <main className="ed-home" id="main-content" tabIndex={-1}>
    <Section className="ed-hero">
      <div className="ed-hero-copy">
        <CapitalFlow />
        <Link className="ed-announcement" href="/about"><span className="ed-status-dot" /> A more considered way to follow smart money <Arrow /></Link>
        <h1>Good instincts.<br /><em>Onchain intelligence.</em><br /><span className="ed-hero-last">Always <TypewriterWord words={WORDS} /></span></h1>
        <p>Follow real traders. Let an AI agent handle the details.<br className="ed-desktop-break" /> Keep your capital within limits you control.</p>
        <div className="ed-actions"><Link href={LINKS.app} className="btn-primary">Explore Siro <Arrow /></Link><Link href="#how" className="btn-secondary">See how it works <span aria-hidden="true">↗</span></Link></div>
        <span className="ed-hero-note">Your vault. Your decisions. Your way forward.</span>
      </div>
      <HeroVisual />
      <div className="ed-principles"><span>Thoughtful by design. Onchain by nature.</span><div><span>Non-custodial</span><i /><span>Transparent</span><i /><span>You’re in control</span></div></div>
    </Section>
    <Section className="ed-why" id="why"><div className="ed-split-heading"><div><p className="eyebrow">A different kind of autopilot</p><h2>Let intelligence<br />do the work.<br /><em>Keep the say.</em></h2><p className="ed-supporting">Automation should give you more clarity.<br />And a little more room to breathe.</p><ClassicalArtwork name="column" className="classical-why" /></div><NumberedFeatureList items={[
      { title: "Track records, in the open.", description: "Start with a trader’s onchain history. Understand the decisions behind a portfolio before following along.", icon: <Glyph /> },
      { title: "Your capital stays yours.", description: "A non-custodial vault keeps you in control. Define the boundaries, pause your strategy, or choose to exit.", icon: <Glyph kind={1} /> },
      { title: "Every move has a reason.", description: "The agent evaluates liquidity, slippage, and risk limits. Follow the thinking, as well as the trades.", icon: <Glyph kind={2} /> },
      { title: "A shared sense of direction.", description: "Explore strategies and evaluate an approach on its own merits. Take your time before committing capital.", icon: <Glyph kind={3} /> },
    ]} /></div></Section>
    <Section id="how" className="ed-workspace"><div className="ed-section-heading"><div><p className="eyebrow">One platform. Your own approach.</p><h2><em>Three</em> ways in.</h2></div><p>Find your starting point.<br />Make the next move your own.</p></div><ProductPanel /></Section>
    <Section id="leaderboard" className="ed-strategies"><div className="ed-section-heading"><div><p className="eyebrow">Strategy templates</p><h2>A little inspiration<br />to <em>start</em> from.</h2></div><Link href="/strategies" className="ed-text-link">View all strategies <Arrow /></Link></div>
      <div className="ed-template-grid">{strategies.slice(0, 3).map((strategy, index) => <Link href={`/strategies/${strategy.id}`} key={strategy.id} className="ed-template-card card-lift"><div className="ed-card-top"><Glyph kind={index} /><span className="pill-badge">Template</span></div><h3>{strategy.name}</h3><p>{strategy.description}</p><AllocationBar segments={strategy.allocation.map(asset => ({ label: asset.token, value: asset.pct }))} /><div className="ed-card-meta"><span>{strategy.allocation.length} assets · {strategy.type.replaceAll("-", " ")}</span><Arrow /></div></Link>)}</div>
      <p className="ed-disclaimer">Illustrative templates using mock data. Investing involves risk. Returns are not guaranteed.</p>
    </Section>
    <Section className="ed-manifesto"><div className="ed-manifesto-layout"><div><p className="eyebrow">Designed for a longer view</p><ScrollRevealText text="The future of finance should feel less like keeping up, and more like moving forward. With intelligence you can understand, and boundaries you can trust." /><Link href="/security" className="ed-text-link">Explore our approach to security <Arrow /></Link></div><ClassicalArtwork name="urn" className="classical-manifesto" /></div></Section>
    <Section className="ed-faq-section"><Faq /></Section>
    <CTABand headline={<>A little more clarity.<br /><em>A lot more possibility.</em></>} subtitle="Find your next starting point. Keep control of what comes next." primaryLabel="Explore Siro" primaryHref={LINKS.app} secondaryLabel="Read the documentation" secondaryHref="/docs" />
  </main>;
}
