import type { ImpactLevel } from "./priceImpact";

/** Strict order from docs/swap-brief.md. The first unmet condition wins. */
export type ButtonState =
  | { kind: "connect"; label: "Connect wallet" }
  | { kind: "wrong_network"; label: "Switch to Robinhood Chain" }
  | { kind: "enter_amount"; label: "Enter an amount" }
  | { kind: "insufficient"; label: string }
  | { kind: "no_route"; label: "No route for this pair" }
  | { kind: "quoting"; label: "Getting quote…" }
  | { kind: "approve"; label: string }
  | { kind: "approving"; label: "Approving…" }
  | { kind: "preparing"; label: "Preparing…" }
  | { kind: "blocked"; label: "Price impact too high" }
  | { kind: "depth_blocked"; label: "Depth limit — deposit held" }
  | { kind: "swap"; label: "Swap and deposit" | "Swap anyway" };

export type ButtonInput = {
  connected: boolean;
  correctChain: boolean;
  amount: bigint | null;
  balance: bigint | null;
  symbol: string;
  quoteStatus: "idle" | "loading" | "ready" | "no_route" | "error";
  needsApproval: boolean;
  approving: boolean;
  preparing: boolean;
  impact: ImpactLevel;
};

export function buttonState(i: ButtonInput): ButtonState {
  if (!i.connected) return { kind: "connect", label: "Connect wallet" };
  if (!i.correctChain) return { kind: "wrong_network", label: "Switch to Robinhood Chain" };
  if (i.amount === null || i.amount <= 0n) return { kind: "enter_amount", label: "Enter an amount" };
  if (i.balance !== null && i.amount > i.balance) return { kind: "insufficient", label: `Insufficient ${i.symbol} balance` };
  if (i.quoteStatus === "no_route") return { kind: "no_route", label: "No route for this pair" };
  if (i.approving) return { kind: "approving", label: "Approving…" };
  if (i.needsApproval) return { kind: "approve", label: `Approve ${i.symbol}` };
  if (i.preparing) return { kind: "preparing", label: "Preparing…" };
  if (i.quoteStatus !== "ready") return { kind: "quoting", label: "Getting quote…" };
  if (i.impact === "blocked") return { kind: "blocked", label: "Price impact too high" };
  return { kind: "swap", label: i.impact === "red" ? "Swap anyway" : "Swap and deposit" };
}
