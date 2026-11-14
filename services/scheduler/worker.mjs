// Validated engine scheduler. Runs `replay run` for each registered job whose vault owner has an
// enabled workspace schedule, once per due hourly tick, under a lease. Never places orders itself:
// orders only come from the Rust runner (commit, risk permit, release gate, live bridge).
//
//   node services/scheduler/worker.mjs [--once]
//   node services/scheduler/worker.mjs --reset JOB_ID   (operator: clear halted/gate_failed)
//
// Env: SIRO_SCHEDULER_REGISTRY (JSON registry), SIRO_REPLAY_BINARY, SIRO_DATA_DIR,
//      SIRO_SCHEDULER_DATA_DELAY_MS (default 120000), SIRO_SCHEDULER_RUN_TIMEOUT_MS (default 3000000)
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { validateWorkspace } from "../../src/lib/workspace-model.ts";
import { dueTick, validateRegistry, activations, classify, plan, derivedConfig, ownershipVerdict } from "./core.mjs";

const required = n => { if (!process.env[n]) throw new Error(`${n} is required`); return process.env[n]; };
const registryPath = resolve(required("SIRO_SCHEDULER_REGISTRY"));
const replay = required("SIRO_REPLAY_BINARY");
// Optional leading arguments (JSON array), e.g. a script path when the binary is an interpreter in tests.
const replayArgs = process.env.SIRO_REPLAY_ARGS ? JSON.parse(process.env.SIRO_REPLAY_ARGS) : [];
const delayMs = Number(process.env.SIRO_SCHEDULER_DATA_DELAY_MS ?? 120_000);
const timeoutMs = Number(process.env.SIRO_SCHEDULER_RUN_TIMEOUT_MS ?? 3_000_000);
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 60_000 || timeoutMs >= 3_600_000) throw new Error("SIRO_SCHEDULER_RUN_TIMEOUT_MS must be within one hour");
const dir = resolve(process.env.SIRO_DATA_DIR || ".data"); mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(resolve(dir, "siro.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS workspaces(address TEXT NOT NULL,chain INTEGER NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(address,chain));
CREATE TABLE IF NOT EXISTS scheduler_heartbeat(id INTEGER PRIMARY KEY,worker TEXT NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS scheduler_jobs(job TEXT PRIMARY KEY,status TEXT NOT NULL,detail TEXT NOT NULL,last_tick INTEGER NOT NULL DEFAULT -1,lease_until INTEGER NOT NULL DEFAULT 0,lease_owner TEXT,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS scheduler_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,job TEXT NOT NULL,through INTEGER NOT NULL,status TEXT NOT NULL,detail TEXT NOT NULL,started INTEGER NOT NULL,finished INTEGER NOT NULL);`);
const worker = randomUUID();

const resetIndex = process.argv.indexOf("--reset");
if (resetIndex > 0) {
  const job = process.argv[resetIndex + 1];
  const r = db.prepare("UPDATE scheduler_jobs SET status='reset',detail='Operator reset; resumes on next due tick',lease_until=0,updated=? WHERE job=?").run(Date.now(), job);
  console.log(r.changes ? `Job ${job} reset.` : `No job ${job}.`); db.close(); process.exit(r.changes ? 0 : 1);
}

function registry() {
  const jobs = validateRegistry(JSON.parse(readFileSync(registryPath, "utf8")));
  for (const j of jobs) {
    // The live bridge trades for the vault in SIRO_EXECUTION_CONFIG; it must be the registered vault.
    const exec = j.env.SIRO_EXECUTION_CONFIG;
    if (exec && JSON.parse(readFileSync(exec, "utf8")).vault?.toLowerCase() !== j.vault) throw new Error(`Job ${j.id}: execution config vault differs from registry vault`);
  }
  return jobs;
}

// Accounts may have linked wallets (phase 13); the table exists once the web app has run.
function walletsOf(account) {
  try { return [account, ...db.prepare("SELECT wallet FROM account_wallets WHERE account=?").all(account).map(r => r.wallet)]; }
  catch { return [account]; }
}
/** On-chain owner() of the vault, or null. RPC from SIRO_RPC_<chain> or ALCHEMY_RPC_URL_<chain>. */
async function vaultOwner(job) {
  const rpc = process.env[`SIRO_RPC_${job.chain_id}`] || process.env[`ALCHEMY_RPC_URL_${job.chain_id}`];
  if (!rpc) return null;
  try {
    const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: job.vault, data: "0x8da5cb5b" }, "latest"] }), signal: AbortSignal.timeout(10_000) });
    const { result } = await r.json();
    return /^0x[0-9a-f]{64}$/i.test(result) ? "0x" + result.slice(-40).toLowerCase() : null;
  } catch { return null; }
}
function workspaces() {
  return db.prepare("SELECT address,chain,body FROM workspaces").all().flatMap(r => {
    try { return [{ address: r.address, chain: r.chain, workspace: validateWorkspace(JSON.parse(r.body)) }]; } catch { return []; }
  });
}

const state = job => db.prepare("SELECT * FROM scheduler_jobs WHERE job=?").get(job) ?? null;
function lease(job, until, now) {
  db.prepare("INSERT OR IGNORE INTO scheduler_jobs(job,status,detail,updated) VALUES(?,'queued','Waiting for first due tick',?)").run(job, now);
  return db.prepare("UPDATE scheduler_jobs SET lease_until=?,lease_owner=? WHERE job=? AND lease_until<=? AND status NOT IN ('halted','gate_failed')").run(until, worker, job, now).changes === 1;
}
function finish(job, through, status, detail, advance, started) {
  const now = Date.now();
  db.prepare("UPDATE scheduler_jobs SET status=?,detail=?,last_tick=CASE WHEN ? THEN ? ELSE last_tick END,lease_until=0,lease_owner=NULL,updated=? WHERE job=? AND lease_owner=?").run(status, detail, advance ? 1 : 0, through, now, job, worker);
  db.prepare("INSERT INTO scheduler_runs(job,through,status,detail,started,finished) VALUES(?,?,?,?,?,?)").run(job, through, status, detail, started, now);
}

function runner(job, through) {
  return new Promise(done => {
    const base = JSON.parse(readFileSync(resolve(dirname(registryPath), job.config), "utf8"));
    const temp = resolve(dir, `scheduler-${job.id}-${through}-${process.pid}.json`);
    writeFileSync(temp, JSON.stringify(derivedConfig(base, through)), { flag: "w", mode: 0o600 });
    // Passed verbatim. Registry paths must be absolute; secrets belong in the worker's own env.
    const env = { ...process.env, ...job.env };
    const child = spawn(replay, [...replayArgs, job.command, temp], { env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", d => { stderr = (stderr + d).slice(-4000); });
    child.stdout.resume();
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on("close", code => { clearTimeout(timer); try { unlinkSync(temp); } catch {} done({ code: code ?? -1, stderr: code === null ? `${stderr}\nrun timed out` : stderr }); });
    child.on("error", e => { clearTimeout(timer); try { if (existsSync(temp)) unlinkSync(temp); } catch {} done({ code: -1, stderr: e.message }); });
  });
}

async function tick() {
  const now = Date.now();
  db.prepare("INSERT INTO scheduler_heartbeat(id,worker,updated) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET worker=excluded.worker,updated=excluded.updated").run(worker, now);
  const jobs = registry(), active = activations(jobs, workspaces()), due = dueTick(now, delayMs);
  for (const job of jobs) {
    const p = plan({ job, state: state(job.id), active: active.get(job.id), due, now });
    if (p.action === "run") {
      const verdict = ownershipVerdict(active.get(job.id), await vaultOwner(job), walletsOf);
      if (!verdict.ok) {
        db.prepare("INSERT INTO scheduler_jobs(job,status,detail,updated) VALUES(?,?,?,?) ON CONFLICT(job) DO UPDATE SET status=excluded.status,detail=excluded.detail,updated=excluded.updated WHERE scheduler_jobs.status NOT IN ('halted','gate_failed')").run(job.id, verdict.status, verdict.reason, now);
        continue;
      }
    }
    if (p.action !== "run" || !lease(job.id, now + timeoutMs + 60_000, now)) continue;
    const started = Date.now();
    let result;
    try { result = await runner(job, p.through); }
    catch (e) { result = { code: -1, stderr: e.message }; }
    const { status, advance } = classify(result.code, result.stderr);
    const detail = (status === "ok" ? `Ran through ${new Date(p.through).toISOString()}` : result.stderr.trim().split("\n").at(-1) || status).replace(/https?:\/\/\S+/g, "[endpoint]").slice(0, 300);
    finish(job.id, p.through, status, detail, advance, started);
    console.log(`${job.id} through ${new Date(p.through).toISOString()}: ${status}`);
  }
}

let stopped = false;
process.on("SIGINT", () => { stopped = true; }); process.on("SIGTERM", () => { stopped = true; });
try {
  do { await tick().catch(e => { console.error(e.message); process.exitCode = 1; }); if (process.argv.includes("--once") || stopped) break; await new Promise(r => setTimeout(r, 30_000)); } while (!stopped);
} finally {
  db.prepare("UPDATE scheduler_heartbeat SET updated=0 WHERE id=1 AND worker=?").run(worker); db.close();
}
