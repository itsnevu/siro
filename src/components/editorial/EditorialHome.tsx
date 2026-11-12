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
import { strategies } from "@/lib/mock";
import { HeroVisual } from "./HeroVisual";
import { ClassicalArtwork } from "./ClassicalArtwork";
import { CapitalFlow } from "./CapitalFlow";
import { CinematicBackground } from "./CinematicBackground";
import { PixelShield } from "./PixelShield";
import { LaptopMockup } from "./LaptopMockup";
import "@/styles/agent-sections.css";

const WORDS = ["within limits.", "onchain.", "provable."];
const LIMITS = [
  ["Max per trade", "Set by you, checked onchain"],
  ["Rolling 24h notional cap", "Cannot be exceeded"],
  ["Token and router whitelist", "Nothing else is tradable"],
  ["Max drawdown", "Vault pauses itself"],
  ["Kill switch", "Instant. Unpause waits 24h"],
];
// Illustrative rows: no agent has committed a decision onchain yet.
const FEED = [
  { act: "BUY", ticker: "NVDA", reason: "Price fell 5% below its 48h average." },
  { act: "HOLD", ticker: "TSLA", reason: "No rule fired this hour." },
  { act: "SELL", ticker: "AAPL", reason: "Stop loss of 8% reached." },
];
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
      <div className="ed-hero-copy cinematic-section">
        <CinematicBackground variant="dusk" image="/images/siro-hero-architecture.webp" />
        <CapitalFlow />

        <h1>Agents that<br /><em>can’t go rogue.</em><br /><span className="ed-hero-last">Always <TypewriterWord words={WORDS} /></span></h1>
        <p>Describe a strategy in one sentence. Your agent trades tokenized stocks inside a vault<br className="ed-desktop-break" /> with limits it can never break, and proves every move onchain.</p>
        <div className="ed-actions"><Link href="/studio" className="btn-primary">Build your agent <Arrow /></Link><Link href="/leaderboard" className="btn-secondary">See live agents <span aria-hidden="true">↗</span></Link></div>
        <span className="ed-hero-note">Built for Robinhood Chain. Not audited yet. Not investment advice.</span>
      </div>
      <HeroVisual />
      <div className="ed-principles"><span>The agent can trade. It can never withdraw.</span><div><span>Guarded vaults</span><i /><span>Proof of Decision</span><i /><span>Instant kill switch</span></div></div>
    </Section>
    <Section className="ed-why" id="why"><div className="ed-split-heading"><div><p className="eyebrow">The problem</p><h2>Giving a bot your wallet<br />is a bet.<br /><em>Trusting a screenshot is a bigger one.</em></h2><p className="ed-supporting">Agents with wallet access are a liability.<br />Track records kept offchain can be edited.</p><ClassicalArtwork name="column" className="classical-why" /></div><NumberedFeatureList items={[
      { title: "Describe.", description: "Type a strategy in one sentence. It becomes editable rule blocks, checked against a strict schema.", icon: <Glyph /> },
      { title: "Replay 30 days.", description: "Backtest hourly with a 0.5% cost per trade. Results sit next to buy-and-hold and cash, even when the agent loses.", icon: <Glyph kind={1} /> },
      { title: "Launch in a guarded vault.", description: "Funds sit in a per-agent contract. The agent’s key can only make whitelisted swaps inside your limits.", icon: <Glyph kind={2} /> },
      { title: "Prove and tokenize.", description: "Every hour of decisions is committed onchain as a Merkle root. After 14 verified days an agent can launch its token.", icon: <Glyph kind={3} /> },
    ]} /></div></Section>
    <Section className="ed-product-showcase">
      <div className="ed-showcase-layout">
        <div className="ed-showcase-copy">
          <p className="eyebrow">Built around you</p>
          <h2>Your strategy.<br /><em>Your rules.</em></h2>
          <p>Set your allocation, define your limits, and let the agent handle execution — all inside a guarded vault on Robinhood Chain.</p>
          <Link href="/studio" className="btn-primary">Open Studio <Arrow /></Link>
        </div>
        <LaptopMockup />
      </div>
    </Section>
    <Section id="how" className="ed-workspace"><div className="ed-section-heading"><div><p className="eyebrow">One platform. Your own approach.</p><h2><em>Three</em> ways in.</h2></div><p>Find your starting point.<br />Make the next move your own.</p></div><ProductPanel /></Section>
    <Section id="leaderboard" className="ed-strategies"><div className="ed-section-heading"><div><p className="eyebrow">Strategy templates</p><h2>A little inspiration<br />to <em>start</em> from.</h2></div><Link href="/strategies" className="ed-text-link">View all strategies <Arrow /></Link></div>
      <div className="ed-template-grid">{strategies.slice(0, 3).map((strategy, index) => <Link href={`/strategies/${strategy.id}`} key={strategy.id} className="ed-template-card card-lift"><div className="ed-card-top"><Glyph kind={index} /><span className="pill-badge">Template</span></div><h3>{strategy.name}</h3><p>{strategy.description}</p><AllocationBar segments={strategy.allocation.map(asset => ({ label: asset.token, value: asset.pct }))} /><div className="ed-card-meta"><span>{strategy.allocation.length} assets · {strategy.type.replaceAll("-", " ")}</span><Arrow /></div></Link>)}</div>
      <p className="ed-disclaimer">Illustrative templates using mock data. Investing involves risk. Returns are not guaranteed.</p>
    </Section>
    <Section id="guard" className="ag-guard"><div className="ag-guard-layout">
      <div className="ag-shield-stage">
        <span className="ag-flow ag-flow-checks">inputs → checks → proposal <i /> ⊗</span>
        <span className="ag-flow ag-flow-deposit">deposit <i /></span>
        <PixelShield className="ag-shield" />
        <span className="ag-flow ag-flow-proof"><i /> proof</span>
        <span className="ag-flow ag-flow-withdraw"><i /> withdraw</span>
      </div>
      <div><p className="eyebrow">The Guard</p><h2>Limits the agent<br /><em>cannot break.</em></h2>
        <ul className="ag-limits">{LIMITS.map(([name, value]) => <li key={name}><span>{name}</span><strong>{value}</strong></li>)}</ul>
        <p className="ag-note">Even if our server is compromised, the agent key can only trade whitelisted tokens inside these limits. Withdrawals stay open while a vault is paused.</p>
      </div>
    </div></Section>
    <Section id="proof" className="ag-proof"><div className="ed-section-heading"><div><p className="eyebrow">Proof of Decision</p><h2>A record nobody<br />can <em>edit.</em></h2></div><p>Each hour, every decision becomes a Merkle leaf.<br />The root is committed onchain.</p></div>
      <div className="ag-feed"><div className="ag-feed-head"><span>Action</span><span>Ticker</span><span>Reason</span><span>Proof</span></div>
        {FEED.map((row) => <div className="ag-feed-row" key={row.ticker}><span className={`ag-act ag-act-${row.act.toLowerCase()}`}>{row.act}</span><span>{row.ticker}</span><p>{row.reason}</p><span className="ag-verify">Illustrative</span></div>)}
      </div>
      <p className="ed-disclaimer">Example rows. No agent has committed decisions onchain yet; live rows will link to their transaction.</p>
    </Section>
    <Section className="ed-manifesto"><div className="ed-manifesto-layout"><div><p className="eyebrow">Designed for a longer view</p><ScrollRevealText text="An agent should be safe enough to trust with real money, and honest enough that nobody can fake its track record. Limits it cannot break. Decisions anyone can verify." /><Link href="/security" className="ed-text-link">Explore our approach to security <Arrow /></Link></div><ClassicalArtwork name="urn" className="classical-manifesto" /></div></Section>
    <Section className="ed-faq-section"><Faq /></Section>
    <CTABand headline={<>Your strategy.<br /><em>Our guard. Onchain proof.</em></>} subtitle="Build an agent in one sentence. Start on paper. Go live only when you choose." primaryLabel="Build your agent" primaryHref="/studio" secondaryLabel="Read the documentation" secondaryHref="/docs" />
  </main>;
}
