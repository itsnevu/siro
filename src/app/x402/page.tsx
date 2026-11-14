import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Agent API | Siro",
  description: "Paid API access is planned, not available.",
};

export default function X402Page() {
  return (
    <ProsePage eyebrow="Agent API · PLANNED" title="No paid API" lede="Pay-per-call (x402) access, rate-limit tiers and paid backtests are not implemented. There are no prices.">
      <h2>What is available</h2>
      <p>The engine exposes a free, read-only API when an operator runs it: agents, decisions, Merkle roots, and per-decision verification. It has no public host yet. The specification is in the repository under docs/api/.</p>
    </ProsePage>
  );
}
