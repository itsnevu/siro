import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Phase 17 board filter. Reads the append-only output of services/ops/daily.mjs. An agent is shown
// only when its latest reconciliation passed; never reconciled or unreconciled means hidden.
export type Hidden = { agent_id: string; reason: string };
type Row = { agent_id: string; day: string; reconciliation: { status: string; worst_relative_diff: number } };

export function latestReconciliations(file = process.env.SIRO_RECON_FILE): Map<string, Row> {
  const latest = new Map<string, Row>();
  if (!file) return latest;
  const path = resolve(/* turbopackIgnore: true */ file);
  if (!existsSync(path)) return latest;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as Row;
    const prev = latest.get(r.agent_id);
    if (!prev || r.day >= prev.day) latest.set(r.agent_id, r);
  }
  return latest;
}

export function partition<T extends { agent_id: string }>(agents: T[], latest: Map<string, Row>): { visible: T[]; hidden: Hidden[] } {
  const visible: T[] = [], hidden: Hidden[] = [];
  for (const a of agents) {
    const r = latest.get(a.agent_id);
    if (!r) hidden.push({ agent_id: a.agent_id, reason: "never reconciled" });
    else if (r.reconciliation.status === "unreconciled") hidden.push({ agent_id: a.agent_id, reason: `unreconciled on ${r.day}: difference ${(r.reconciliation.worst_relative_diff * 100).toFixed(2)}% exceeds the 0.5% threshold` });
    else visible.push(a);
  }
  return { visible, hidden };
}
