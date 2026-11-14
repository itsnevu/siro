import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestReconciliations, partition } from "../src/lib/server/reconciliation.ts";

test("board shows only agents whose latest reconciliation passed", () => {
  const dir = mkdtempSync(join(tmpdir(), "siro-board-"));
  const file = join(dir, "daily.jsonl");
  const row = (agent_id, day, status, worst = 0) => JSON.stringify({ agent_id, day, reconciliation: { status, worst_relative_diff: worst } });
  writeFileSync(file, [row("a", "2026-11-11", "unreconciled", 0.02), row("a", "2026-11-12", "reconciled"), row("b", "2026-11-12", "unreconciled", 0.009), row("c", "2026-11-12", "reconciled_offchain_only")].join("\n") + "\n");
  const agents = [{ agent_id: "a", metrics: 1 }, { agent_id: "b", metrics: 2 }, { agent_id: "c", metrics: 3 }, { agent_id: "d", metrics: 4 }];
  const { visible, hidden } = partition(agents, latestReconciliations(file));
  assert.deepEqual(visible.map(a => a.agent_id), ["a", "c"]);
  assert.deepEqual(hidden.map(h => h.agent_id), ["b", "d"]);
  assert.match(hidden[0].reason, /0\.90%/);
  assert.equal(hidden[1].reason, "never reconciled");
  assert.ok(!("metrics" in hidden[0]), "hidden entries carry no numbers");
  assert.equal(partition(agents, latestReconciliations(undefined)).visible.length, 0, "no reconciliation file: board is empty");
  rmSync(dir, { recursive: true, force: true });
});
