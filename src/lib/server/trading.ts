import type { TradingAgent } from "../trading-report";
import { latestReconciliations, partition, type Hidden } from "./reconciliation";
export async function tradingRead(path: string): Promise<unknown> {
  const base = process.env.SIRO_ENGINE_API;
  if (!base) throw new Error("Trading engine API is not configured.");
  const url = new URL(path, `${base.replace(/\/$/, "")}/`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid trading API URL.");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Trading engine returned HTTP ${response.status}.`);
  return response.json();
}
/** Agents whose latest daily reconciliation passed. Better blank than wrong (phase 17). */
export async function tradingAgents(): Promise<TradingAgent[]> {
  return (await tradingBoard()).visible;
}
export async function tradingBoard(): Promise<{ visible: TradingAgent[]; hidden: Hidden[] }> {
  const envelope = await tradingRead("agents") as { data?: unknown };
  if (!Array.isArray(envelope.data)) throw new Error("Invalid trading engine response.");
  return partition(envelope.data as TradingAgent[], latestReconciliations());
}
