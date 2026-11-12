"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "./Brand";
import { PixelIcon } from "./PixelIcon";

const features = [
  ["01", "Guarded Vaults", "ERC-4626 vaults enforce token allowlists, allocation caps, daily-loss limits, slippage bounds, cooldowns, and an instant kill switch."],
  ["02", "Decision Proofs", "Every run commits inputs, policy, output, and execution evidence to a Merkle root that anyone can verify."],
  ["03", "Agent Launchpad", "Creators publish strategy vaults, set fees within protocol caps, and earn only when followers choose to allocate."],
  ["04", "Copy Vaults", "Follow a strategy without granting custody. Shares remain redeemable by the holder under the vault's explicit rules."],
  ["05", "Natural Language Studio", "Describe a strategy in plain English. VAULTA converts it to a typed, reviewable policy before any deployment."],
  ["06", "VAULTA Risk Score", "A transparent score summarizes concentration, turnover, drawdown rules, oracle coverage, and execution permissions."],
  ["07", "The Arena", "Planned paper-trading seasons compare agents on the same data window with reproducible scoring."],
];

const decisions = [
  { state: "READY", title: "Policy compiled", detail: "Schema valid · allocation caps enforced", time: "LOCAL" },
  { state: "BLOCKED", title: "Trade exceeds policy", detail: "Illustrative: position cap would be breached", time: "DEMO" },
  { state: "VERIFIED", title: "Decision root", detail: "Awaiting the first production agent run", time: "ONCHAIN" },
];

export function VaultaLanding() {
  const [strategy, setStrategy] = useState("Buy approved stock tokens when momentum is positive. Cap each position at 20% and stop for the day after a 3% loss.");
  return (
    <div className="v-site">
      <header className="v-nav">
        <Brand />
        <nav aria-label="Primary navigation"><Link href="#product">Product</Link><Link href="/studio">Studio</Link><Link href="/launchpad">Agents</Link><Link href="/docs">Docs</Link></nav>
        <Link className="v-btn v-btn-small" href="/studio">Open Studio <span>↗</span></Link>
      </header>

      <main>
        <section className="v-hero" aria-labelledby="hero-title">
          <div className="v-grid-noise" aria-hidden="true" />
          <div className="v-hero-copy">
            <p className="v-kicker"><span /> Built for Robinhood Chain · Chain 4663</p>
            <h1 id="hero-title">TRADING AGENTS.<br /><em>GUARDED.</em></h1>
            <p className="v-hero-lede">Build, launch, and copy agents for tokenized stocks. Every trade is constrained by a vault policy and every decision leaves a verifiable proof.</p>
            <div className="v-hero-actions"><Link className="v-btn" href="/studio">Build an Agent <span>↗</span></Link><Link className="v-text-link" href="#how">See how it works <span>↓</span></Link></div>
            <p className="v-disclaimer">Non-custodial software · Not audited · Not investment advice</p>
          </div>
          <div className="v-hero-art">
            <PixelIcon className="v-pixel-canvas" />
            <div className="v-terminal-float v-terminal-a"><span>POLICY</span><strong>ENFORCED</strong></div>
            <div className="v-terminal-float v-terminal-b"><span>PROOF</span><strong>0x…READY</strong></div>
          </div>
        </section>

        <section className="v-trust" aria-label="Protocol facts">
          <p><span>01</span> Funds stay in smart-contract vaults</p><p><span>02</span> Agents cannot bypass policy</p><p><span>03</span> Every decision is verifiable</p>
        </section>

        <section className="v-section" id="product">
          <div className="v-section-head"><p className="v-kicker">THE PROTOCOL</p><h2>Control the machine.<br /><em>Not the other way around.</em></h2><p>Automation should expand what you can do without expanding what can go wrong.</p></div>
          <div className="v-bento">
            {features.map(([num, title, copy], index) => <article className={`v-feature v-feature-${index + 1}`} key={title}><span>{num}</span><div className="v-feature-glyph" aria-hidden="true">{index % 2 ? "□·□" : "[+]"}</div><h3>{title}</h3><p>{copy}</p>{title === "The Arena" && <b>PLANNED</b>}</article>)}
          </div>
        </section>

        <section className="v-section v-studio-band" id="how">
          <div className="v-section-head"><p className="v-kicker">AGENT STUDIO</p><h2>From intent to policy.<br /><em>Without hidden steps.</em></h2></div>
          <div className="v-studio-shell">
            <div className="v-studio-prompt">
              <label htmlFor="strategy">DESCRIBE YOUR STRATEGY</label>
              <textarea id="strategy" value={strategy} onChange={(event) => setStrategy(event.target.value)} />
              <div><span>{strategy.length} CHARACTERS</span><Link href="/studio">Compile policy ↗</Link></div>
            </div>
            <div className="v-code-panel" aria-label="Compiled strategy preview">
              <div><span>VAULTA/POLICY.JSON</span><i>VALID SCHEMA</i></div>
              <pre>{`{
  "universe": "approved_stock_tokens",
  "signal": "momentum_positive",
  "maxPositionBps": 2000,
  "dailyLossLimitBps": 300,
  "humanReview": true
}`}</pre>
            </div>
          </div>
        </section>

        <section className="v-section v-proof-section">
          <div className="v-section-head"><p className="v-kicker">DECISION PROOFS</p><h2>Trust less.<br /><em>Verify every run.</em></h2></div>
          <div className="v-decision-layout">
            <div className="v-decision-feed">
              <div className="v-feed-head"><span>DECISION FEED</span><span><i /> LISTENING</span></div>
              {decisions.map((decision) => <article key={decision.title}><b className={`v-state v-state-${decision.state.toLowerCase()}`}>{decision.state}</b><div><h3>{decision.title}</h3><p>{decision.detail}</p></div><time>{decision.time}</time></article>)}
            </div>
            <div className="v-proof-copy"><p>Each agent run produces a canonical record:</p><ol><li><span>INPUT</span> market snapshot + oracle reference</li><li><span>POLICY</span> immutable strategy and risk limits</li><li><span>OUTPUT</span> proposed actions and reasons</li><li><span>PROOF</span> Merkle root anchored onchain</li></ol><Link className="v-text-link" href="/verify">Open verifier ↗</Link></div>
          </div>
        </section>

        <section className="v-section v-modes">
          <div className="v-section-head"><p className="v-kicker">CHOOSE YOUR MODE</p><h2>Start with simulation.<br /><em>Graduate deliberately.</em></h2></div>
          <div className="v-mode-grid">
            <article><span>01</span><h3>Backtest</h3><p>Replay typed policies against a selected historical window. Results are labeled simulation—not promises.</p><Link href="/studio">Run a backtest ↗</Link></article>
            <article><span>02</span><h3>Paper Agent</h3><p>Observe scheduled decisions on live data without moving funds. Compare proofs before going onchain.</p><b>PLANNED</b></article>
            <article><span>03</span><h3>Guarded Vault</h3><p>Deposit USDG into an ERC-4626 vault whose agent can execute only through enforced policy and approved routers.</p><Link href="/vaults">Inspect vaults ↗</Link></article>
          </div>
        </section>

        <section className="v-section v-safety">
          <div><p className="v-kicker">SAFETY MODEL</p><h2>Your agent gets permissions.<br /><em>Never a blank check.</em></h2><p>Vault owners can pause execution and redeem shares. Executors can propose and route approved trades, but cannot withdraw user funds or rewrite policy.</p><Link className="v-btn" href="/docs#safety">Read the safety model ↗</Link></div>
          <PixelIcon className="v-safety-icon" animated={false} />
        </section>

        <section className="v-final-cta"><p className="v-kicker">BUILD WITH CONSTRAINTS</p><h2>Give your strategy<br /><em>a safer place to run.</em></h2><div><Link className="v-btn" href="/studio">Open Agent Studio ↗</Link><Link className="v-text-link" href="/docs">Read the docs</Link></div></section>
      </main>

      <footer className="v-footer"><Brand /><p>Guarded trading agents for tokenized stocks on Robinhood Chain.</p><div><Link href="/docs">Docs</Link><Link href="/verify">Verify</Link><Link href="/security">Security</Link><a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer">Explorer ↗</a></div><small>© {new Date().getFullYear()} VAULTA · Not audited · Not investment advice · Stock Tokens may be restricted in your jurisdiction.</small></footer>
    </div>
  );
}
