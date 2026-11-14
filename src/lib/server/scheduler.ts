import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseAbi, type Address } from "viem";
import { db, HttpError } from "./store";
import { serverClient } from "./rpc";

const ownable = parseAbi(["function owner() view returns (address)"]);
/**
 * Activation authority: the signed-in address must be the on-chain owner of every vault it
 * activates. Without this, anyone who knows a registered vault could start its engine job.
 */
export async function assertVaultOwner(wallets: string[], chainId: number, vaults: string[]) {
  const mine = new Set(wallets.map(w => w.toLowerCase()));
  const client = serverClient(chainId);
  for (const vault of new Set(vaults.map(v => v.toLowerCase()))) {
    let owner: string;
    try { owner = await client.readContract({ address: vault as Address, abi: ownable, functionName: "owner" }); }
    catch { throw new HttpError(503, "Could not confirm vault ownership on chain. Try again."); }
    if (!mine.has(owner.toLowerCase())) throw new HttpError(403, "Only the vault owner can enable its engine schedule.");
  }
}
import type { Schedule } from "../workspace-model";

export type EngineJob = { id: string; name: string; chain_id: number; vault: string };
export type JobState = { job: string; status: string; detail: string; last_tick: number; updated: number };

/** Public part of the operator registry (no config paths or env). Empty when not configured. */
export function engineJobs(): EngineJob[] {
  const path = process.env.SIRO_SCHEDULER_REGISTRY;
  if (!path) return [];
  const raw = JSON.parse(readFileSync(resolve(/* turbopackIgnore: true */ path), "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("Scheduler registry is invalid.");
  return raw.map(j => ({ id: String(j.id), name: String(j.name), chain_id: Number(j.chain_id), vault: String(j.vault).toLowerCase() }));
}

function ensureTables() {
  db().exec(`CREATE TABLE IF NOT EXISTS scheduler_heartbeat(id INTEGER PRIMARY KEY,worker TEXT NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS scheduler_jobs(job TEXT PRIMARY KEY,status TEXT NOT NULL,detail TEXT NOT NULL,last_tick INTEGER NOT NULL DEFAULT -1,lease_until INTEGER NOT NULL DEFAULT 0,lease_owner TEXT,updated INTEGER NOT NULL);`);
}

export function jobStates(): Map<string, JobState> {
  ensureTables();
  const rows = db().prepare("SELECT job,status,detail,last_tick,updated FROM scheduler_jobs").all() as JobState[];
  return new Map(rows.map(r => [r.job, r]));
}

export function schedulerOnline(): boolean {
  ensureTables();
  const row = db().prepare("SELECT updated FROM scheduler_heartbeat WHERE id=1").get() as { updated: number } | undefined;
  return !!row && Date.now() - row.updated < 120_000;
}

/** Why an enabled schedule may not be enabled, or null if it may. */
export function activationError(s: Schedule, chainId: number, jobs: EngineJob[], states: Map<string, JobState>): string | null {
  if (!s.enabled) return null;
  if (!s.engineJobId) return "Only schedules linked to a validated engine job can be enabled.";
  const job = jobs.find(j => j.id === s.engineJobId);
  if (!job) return `Engine job ${s.engineJobId} is not registered by the operator.`;
  if (job.chain_id !== chainId) return `Engine job ${job.id} runs on chain ${job.chain_id}, not this network.`;
  if (job.vault !== s.vault.toLowerCase()) return `Engine job ${job.id} trades for a different vault.`;
  const state = states.get(job.id)?.status;
  if (state === "halted" || state === "gate_failed") return `Engine job ${job.id} is ${state}; the operator must reset it first.`;
  return null;
}
