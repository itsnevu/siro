const STEPS = [
  {
    num: "01",
    title: "Browse the Leaderboard",
    desc: "Explore ranked wallets with verified onchain track records: PnL, Sharpe ratio, drawdown, and win rate.",
  },
  {
    num: "02",
    title: "Paper Copy First",
    desc: "Follow any leader without risking real funds. Track simulated results openly for 7 days before committing.",
  },
  {
    num: "03",
    title: "Create Your Vault",
    desc: "Deposit USDC, pick up to 5 leaders and allocations, set your risk limits. All enforced by smart contract.",
  },
  {
    num: "04",
    title: "Auto-Copy with AI",
    desc: "AI agent mirrors leader trades into your vault within seconds. RiskGuard blocks anything outside your limits.",
    highlight: true,
  },
];

export function HowItWorks() {
  return (
    <section className="how-section" id="how" aria-labelledby="how-heading">
      <div className="how-header">
        <span className="section-eyebrow">How it works</span>
        <h2 id="how-heading">
          From leaderboard to <em className="hero-italic">autopilot.</em>
        </h2>
      </div>
      <div className="how-grid">
        {STEPS.map((s) => (
          <div
            key={s.num}
            className={`how-card${s.highlight ? " how-card-highlight" : ""}`}
          >
            <span className="how-card-num">{s.num}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
