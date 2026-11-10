import Link from "next/link";
import { LINKS } from "@/lib/links";

export function Tabs() {
  return (
    <>
      <nav className="borrow-navigation" aria-label="Copy trading navigation">
        <Link href="/#leaderboard" aria-current="page">
          Leaderboard
        </Link>
        <Link href={LINKS.app}>Copy Vault</Link>
        <Link href="/#how">How it works</Link>
      </nav>
      <p className="borrow-pool-summary">
        <strong>Portfolio Copy Trading:</strong> Follow top-performing wallets with verified onchain track records.
        AI agent copies trades into your non-custodial vault automatically, within risk limits you control.
      </p>
    </>
  );
}
