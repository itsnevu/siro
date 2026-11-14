import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Terms | Siro",
  description: "Terms of use for Siro, non-custodial trading-agent software on Robinhood Chain.",
};

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Terms" title="Terms of use" lede="Draft terms. They have not been reviewed by legal counsel.">
      <h2>What Siro is</h2>
      <p>Siro is software. It is not a bank, broker, fund manager or investment adviser. It provides an interface to contracts on Robinhood Chain that you control.</p>
      <h2>Your funds and keys</h2>
      <p>Funds stay in contracts owned by your wallet. You grant agents limited session keys and can revoke them at any time. You are responsible for your private keys.</p>
      <h2>Fees</h2>
      <p>15% of realized profit above the high-water mark: 10% to the strategy creator and 5% to the protocol, as fixed in the FeeSplitter contract.</p>
      <h2>Numbers</h2>
      <p>Published results are historical or simulated and labelled as such. They do not promise future results.</p>
      <h2>Jurisdictions</h2>
      <p>You must make sure using Siro is legal where you are. Access is blocked from some jurisdictions.</p>
      <h2>No warranty</h2>
      <p>The software and contracts are provided as is, without a third-party audit. See <Link href="/risk">Risk disclosures</Link>.</p>
      <h2>Contact</h2>
      <p><a href="mailto:support@usesiro.xyz">support@usesiro.xyz</a></p>
    </ProsePage>
  );
}
