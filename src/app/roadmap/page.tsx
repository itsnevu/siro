import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Roadmap | Siro",
  description: "What is live, what is in testing, and what is only planned.",
};

type Status = "LIVE" | "TESTING" | "PLANNED";
const ITEMS: { title: string; status: Status; note: string }[] = [
  { title: "Guarded vault and risk-guard contracts", status: "TESTING", note: "Deployed on mainnet; unaudited. The vault holds 25 units of the 0x7D5AfaBD… USDG token, while deposits use 0x5fc5360D… USDG. Matching tickers do not make these the same asset." },
  { title: "Commit–reveal decision ledger and public verification", status: "TESTING", note: "Anchor is deployed at 0xbf9f13791c1c5bcd6e342fb500c711e574fb04e0. As of 2026-11-17, its three lifetime transactions are configuration only: zero decision roots published. witness(bytes32) is permissionless; anchor() is owner-only." },
  { title: "Decision engine, risk process and backtest runner", status: "TESTING", note: "Single-asset and multi-asset (long-only) runners. No historical data ships with it; operators bring their own." },
  { title: "Engine scheduler and live-execution recovery", status: "TESTING", note: "Implemented and tested against simulated chains only." },
  { title: "Strategy Studio", status: "TESTING", note: "Allocation builder and in-browser backtest. Saved rebalances are not automated." },
  { title: "Mainnet deployment — 2026-11-14", status: "LIVE", note: "Contracts deployed on Robinhood Chain (4663). Deployment does not establish live decision execution, timely commitments, or a verified performance history." },
  { title: "SIRO token, buyback with burns, paid agent API, referral program", status: "PLANNED", note: "Not built. No token exists." },
  { title: "Mobile apps", status: "PLANNED", note: "Not started." },
];

export default function RoadmapPage() {
  return (
    <ProsePage eyebrow="Roadmap" title="Roadmap" lede="Status dated 2026-11-17. Deployed contracts and proven agent operation are separate milestones. PLANNED items have no committed dates.">
      {ITEMS.map(i => (
        <section key={i.title}>
          <h2>{i.title} · {i.status}</h2>
          <p>{i.note}</p>
        </section>
      ))}
      <section><h2>v2 migration: T2 / T4 / T6 / T7 / T8</h2><p>These tasks require a separately reviewed v2 migration and are outside this release. DecisionLog.sol exists but is undeployed. Per-decision onchain commitments could make the operator journal optional for retrieving and verifying decisions, at the cost of transaction fees, storage, throughput, and revealing more metadata. A root witness alone cannot reconstruct missing content.</p></section>
    </ProsePage>
  );
}
