import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Roadmap | Siro",
  description: "What is live, what is in testing, and what is only planned.",
};

type Status = "LIVE" | "TESTING" | "PLANNED";
const ITEMS: { title: string; status: Status; note: string }[] = [
  { title: "Guarded vault and risk-guard contracts", status: "TESTING", note: "Contracts and tests exist. No production deployment holds user funds." },
  { title: "Commit–reveal decision ledger and public verification", status: "TESTING", note: "Implemented and tested. The on-chain publication witness is not deployed, so timely publication is not yet proven for any decision." },
  { title: "Decision engine, risk process and backtest runner", status: "TESTING", note: "Single-asset and multi-asset (long-only) runners. No historical data ships with it; operators bring their own." },
  { title: "Engine scheduler and live-execution recovery", status: "TESTING", note: "Implemented and tested against simulated chains only." },
  { title: "Strategy Studio", status: "TESTING", note: "Allocation builder and in-browser backtest. Saved rebalances are not automated." },
  { title: "Mainnet deployment", status: "PLANNED", note: "Depends on audits and a passed release gate." },
  { title: "SIRO token, buyback with burns, paid agent API, referral program", status: "PLANNED", note: "Not built. No token exists." },
  { title: "Mobile apps", status: "PLANNED", note: "Not started." },
];

export default function RoadmapPage() {
  return (
    <ProsePage eyebrow="Roadmap" title="Roadmap" lede="Three labels only. Nothing here is LIVE yet. PLANNED items have no committed dates.">
      {ITEMS.map(i => (
        <section key={i.title}>
          <h2>{i.title} · {i.status}</h2>
          <p>{i.note}</p>
        </section>
      ))}
    </ProsePage>
  );
}
