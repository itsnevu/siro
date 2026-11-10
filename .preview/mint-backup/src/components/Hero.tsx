import Link from "next/link";

function VaultCard() {
  return (
    <div className="hero-agent-card">
      {/* Header */}
      <div className="hero-agent-header">
        <div className="hero-agent-header-left">
          <img alt="" src="/brand/S-transparent.png" width={28} height={28} className="hero-agent-icon" />
          <span className="hero-agent-label">Copy Vault</span>
        </div>
        <span className="hero-agent-badge">Live</span>
      </div>

      {/* Chat bubble */}
      <div className="hero-agent-bubble">
        Following 3 top traders. AI agent auto-copies trades within your risk limits. Funds never leave your vault.
      </div>

      {/* Structured vault */}
      <div className="hero-agent-panel">
        <div className="hero-agent-panel-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Vault settings
        </div>
        <dl className="hero-agent-dl">
          <dt>deposited</dt><dd>$5,000 USDC</dd>
          <dt>leaders</dt><dd>3 wallets</dd>
          <dt>max per trade</dt><dd>10% vault</dd>
          <dt>daily loss limit</dt><dd>5%</dd>
          <dt>strategy</dt><dd>Balanced</dd>
        </dl>
      </div>

      {/* Security checks */}
      <div className="hero-agent-panel">
        <div className="hero-agent-panel-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L2 4v4.5c0 3.5 2.5 5.5 6 6.5 3.5-1 6-3 6-6.5V4L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          RiskGuard onchain
        </div>
        <div className="hero-agent-checks">
          <span><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="var(--fg)"/><path d="M5.5 9.2l2.2 2.2 4.8-4.8" stroke="var(--card)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>Non-custodial vault</span>
          <span><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="var(--fg)"/><path d="M5.5 9.2l2.2 2.2 4.8-4.8" stroke="var(--card)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>Swap only, no withdrawals</span>
          <span><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="var(--fg)"/><path d="M5.5 9.2l2.2 2.2 4.8-4.8" stroke="var(--card)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>Kill switch anytime</span>
          <span><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="var(--fg)"/><path d="M5.5 9.2l2.2 2.2 4.8-4.8" stroke="var(--card)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>Chainlink price feeds</span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="hero-agent-footer">
        <span>Your funds, your rules</span>
        <span className="hero-agent-review">Withdraw</span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="rusd-hero borrow-hero">
      <div className="rusd-hero-message">
        <p className="hero-eyebrow">Copy the best traders, automatically</p>
        <h1>
          Follow top wallets,{" "}
          <em className="hero-italic">trade on autopilot.</em>
        </h1>
        <p className="rusd-hero-copy">
          Mirror real trader portfolios with onchain track records. AI agent copies trades
          into your non-custodial vault, within risk limits you set. No keys shared, withdraw anytime.
        </p>
        <div className="hero-actions">
          <Link href="/app" className="hero-pill-primary">
            Explore Leaderboard
          </Link>
          <Link href="/#how" className="hero-pill-secondary">
            How it works
          </Link>
        </div>
      </div>

      <VaultCard />
    </section>
  );
}
