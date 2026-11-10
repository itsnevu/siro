import Link from "next/link";
import type { ReactNode } from "react";

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "How does Siro copy trades?",
    a: (
      <p>
        Siro indexes every swap on supported chains, scores wallet performance, and ranks them on a public
        leaderboard. When a leader you follow makes a trade, an AI agent evaluates it. If it passes
        your risk limits, it executes a proportional swap in your non-custodial vault automatically.
      </p>
    ),
  },
  {
    q: "Can the keeper or Siro withdraw my funds?",
    a: (
      <p>
        No. Your vault is a Safe smart contract with a Roles module that only permits swaps through
        whitelisted DEX routers. The keeper cannot transfer, approve, or withdraw funds to any external
        address. You can pause or withdraw at any time without anyone&apos;s permission.
      </p>
    ),
  },
  {
    q: "What is RiskGuard?",
    a: (
      <p>
        RiskGuard is an onchain guard contract that checks every trade before execution. It enforces your
        limits: max trade size (% of vault), daily loss cap, max position per token, token whitelist,
        and slippage tolerance. If any rule fails, the transaction reverts.
      </p>
    ),
  },
  {
    q: "What are the fees?",
    a: (
      <p>
        Siro charges a <strong>15% performance fee</strong> only on new profit (high-water mark).
        If your vault doesn&apos;t grow, you pay nothing. Of the 15%, leaders receive 10% and Siro
        receives 5%. No management fees, no subscription required for basic features.
      </p>
    ),
  },
  {
    q: "What is paper copy?",
    a: (
      <p>
        Paper copy lets you follow a leader without depositing real funds. Your simulated results are
        tracked openly so you can evaluate a leader&apos;s performance before committing capital.
      </p>
    ),
  },
  {
    q: "How do leaders earn?",
    a: (
      <p>
        Leaders earn 10% of the profit their followers make. They can claim their wallet by signing a
        message, set up a public profile, and optionally stake to appear in the top rankings.
        Leaders never have access to follower funds.
      </p>
    ),
  },
];

export function Faq() {
  return (
    <section className="rusd-faq" id="faq" aria-labelledby="faq-heading">
      <div className="rusd-faq-heading">
        <h2 id="faq-heading">Frequently <em className="hero-italic">asked</em></h2>
        <p>
          Learn how Siro protects your funds while copying the best onchain traders.
          Read the{" "}
          <Link className="rusd-text-link" href="/docs">
            documentation
          </Link>
          .
        </p>
        <img
          className="rusd-faq-art"
          alt=""
          width={1536}
          height={1024}
          src="/illustrations/pyris-arch.svg"
        />
      </div>
      <div className="rusd-faq-list">
        {FAQ.map(({ q, a }) => (
          <details key={q}>
            <summary>
              {q}
              <span className="rusd-faq-toggle" aria-hidden="true" />
            </summary>
            <div className="rusd-faq-answer">{a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default Faq;
