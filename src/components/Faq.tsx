import Link from "next/link";
import "@/styles/faq.css";
import { ClassicalArtwork } from "@/components/editorial/ClassicalArtwork";
import type { ReactNode } from "react";

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What does Siro do?",
    a: (
      <p>
        An agent trades tokenized stocks on Robinhood Chain from a vault you own. Each hourly decision is
        committed as a hash before it can execute and revealed afterwards, so anyone can check it at{" "}
        <Link className="rusd-text-link" href="/verify">/verify</Link> without an account.
      </p>
    ),
  },
  {
    q: "Can Siro or the agent withdraw my funds?",
    a: (
      <p>
        No. The agent acts through a session key you grant on the SessionExecutor contract: it can only swap
        within a per-trade cap, a daily cap, an asset and router allowlist and an expiry. You can revoke one
        key or all keys at once. The vault contracts and a Uniswap V3 swap adapter are on mainnet; a vault trades only after its owner allows the adapter, tokens and an executor.
      </p>
    ),
  },
  {
    q: "Which risk limits apply?",
    a: (
      <p>
        Every order needs a signed risk permit valid for at most 5 seconds. Limits include a maximum weight per
        asset (25% by default), a sector cap, a daily trade and turnover cap, a correlation trim, an 8% stop loss
        per position by default, and a drawdown governor that liquidates and stops the agent at 20%.
      </p>
    ),
  },
  {
    q: "What are the fees?",
    a: (
      <p>
        <strong>15% of realized profit</strong> above the high-water mark: 10% to the strategy creator and 5% to
        the protocol, fixed in the FeeSplitter contract. No new profit, no fee. There is no management fee.
      </p>
    ),
  },
  {
    q: "Is there a track record?",
    a: (
      <p>
        Not yet. No agent trades real money. Published numbers are labelled backtest or paper, gross or net,
        and an agent is shown only after its daily reconciliation passes.
      </p>
    ),
  },
  {
    q: "Is it audited?",
    a: (
      <p>
        No third-party audit has been done. Known weaknesses are listed in{" "}
        <Link className="rusd-text-link" href="/security">Security</Link> and in the repository&apos;s limitations page.
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
          What Siro does, what it cannot do, and what is not built yet.
          Read the{" "}
          <Link className="rusd-text-link" href="/docs">
            documentation
          </Link>
          .
        </p>
        <ClassicalArtwork name="arch" className="classical-faq" />
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
