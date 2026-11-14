// End-to-end: the real scheduler worker against a real SQLite workspace store, with a fake replay
// that records what it was asked to run. Paper/live replay itself needs fresh market data and a
// passed release gate, so it is out of scope here (docs/limitations.md).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const HOUR = 3_600_000;
const vault = "0x" + "ab".repeat(20);

function setup(fakeExit, fakeStderr = "") {
  const dir = mkdtempSync(join(tmpdir(), "siro-sched-"));
  const fake = join(dir, "fake-replay.mjs");
  writeFileSync(fake, `import { readFileSync, appendFileSync } from "node:fs";
const [command, config] = process.argv.slice(2);
appendFileSync(${JSON.stringify(join(dir, "calls.jsonl"))}, JSON.stringify({ command, config: JSON.parse(readFileSync(config, "utf8")) }) + "\\n");
if (${JSON.stringify(fakeStderr)}) process.stderr.write(${JSON.stringify(fakeStderr)});
process.exit(${fakeExit});`);
  writeFileSync(join(dir, "base.json"), JSON.stringify({ mode: "paper", from: 0, through: 0, marker: "base" }));
  writeFileSync(join(dir, "registry.json"), JSON.stringify([{ id: "eth-1h", name: "Test job", chain_id: 1, vault, config: "base.json", command: "portfolio" }]));
  const db = new DatabaseSync(join(dir, "siro.sqlite"));
  db.exec("CREATE TABLE workspaces(address TEXT NOT NULL,chain INTEGER NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(address,chain))");
  const workspace = { strategies: [], settings: { displayName: "" }, schedules: [{ id: "s1", strategyId: "", intervalHours: 1, startsAt: "2026-01-01T00:00:00Z", vault, adapter: "", enabled: true, engineJobId: "eth-1h" }] };
  db.prepare("INSERT INTO workspaces VALUES(?,?,?,?)").run(OWNER, 1, 1, JSON.stringify(workspace));
  db.close();
  return dir;
}
// A fake JSON-RPC in its own process answers owner() with whatever address the test sets;
// the worker uses its production eth_call path against it.
const OWNER_FILE = join(mkdtempSync(join(tmpdir(), "siro-rpc-")), "owner.txt");
const rpc = spawn(process.execPath, ["tests/fixtures/fake-owner-rpc.mjs", OWNER_FILE], { stdio: ["ignore", "pipe", "inherit"] });
const port = await new Promise(r => rpc.stdout.once("data", d => r(String(d).trim())));
test.after(() => rpc.kill());
const OWNER = "0x" + "0e".repeat(20);
const worker = (dir, extra = [], owner = OWNER) => { if (owner) writeFileSync(OWNER_FILE, owner); else rmSync(OWNER_FILE, { force: true }); return spawnSync(process.execPath, ["services/scheduler/worker.mjs", "--once", ...extra], {
  encoding: "utf8",
  env: { ...process.env, SIRO_RPC_1: `http://127.0.0.1:${port}`, ALCHEMY_RPC_URL_1: "", SIRO_DATA_DIR: dir, SIRO_SCHEDULER_REGISTRY: join(dir, "registry.json"), SIRO_REPLAY_BINARY: process.execPath, SIRO_REPLAY_ARGS: JSON.stringify([join(dir, "fake-replay.mjs")]), SIRO_SCHEDULER_DATA_DELAY_MS: "0" },
}); };
const state = dir => { const db = new DatabaseSync(join(dir, "siro.sqlite")); const r = db.prepare("SELECT * FROM scheduler_jobs WHERE job='eth-1h'").get(); db.close(); return r; };
const calls = dir => existsSync(join(dir, "calls.jsonl")) ? readFileSync(join(dir, "calls.jsonl"), "utf8").trim().split("\n").map(l => JSON.parse(l)) : [];

test("activated job runs once per due tick with only `through` moved", () => {
  const dir = setup(0);
  const r = worker(dir);
  assert.equal(r.status, 0, r.stderr);
  const due = Math.floor(Date.now() / HOUR) * HOUR;
  const [call] = calls(dir);
  assert.equal(call.command, "portfolio");
  assert.equal(call.config.marker, "base");
  assert.ok([due, due - HOUR].includes(call.config.through), "through is the latest closed hour");
  assert.equal(state(dir).status, "ok");
  worker(dir);
  assert.equal(calls(dir).length, 1, "a second pass in the same hour does not rerun");
  rmSync(dir, { recursive: true, force: true });
});

test("a halting runner stops the job until an operator resets it", () => {
  const dir = setup(1, "Error: kill switch halted runner");
  worker(dir);
  assert.equal(state(dir).status, "halted");
  worker(dir);
  assert.equal(calls(dir).length, 1, "halted job is not run again");
  assert.equal(worker(dir, ["--reset", "eth-1h"]).status, 0);
  assert.equal(state(dir).status, "reset");
  rmSync(dir, { recursive: true, force: true });
});

test("no enabled schedule means the job never runs", () => {
  const dir = setup(0);
  const db = new DatabaseSync(join(dir, "siro.sqlite"));
  const body = JSON.parse(db.prepare("SELECT body FROM workspaces").get().body);
  body.schedules[0].enabled = false;
  db.prepare("UPDATE workspaces SET body=?").run(JSON.stringify(body));
  db.close();
  worker(dir);
  assert.equal(calls(dir).length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("vault ownership is re-checked before every run", () => {
  const dir = setup(0);
  worker(dir, [], "0x" + "99".repeat(20));
  assert.equal(calls(dir).length, 0, "vault moved to another owner: no run");
  assert.equal(state(dir).status, "unauthorized");
  worker(dir, [], null);
  assert.equal(calls(dir).length, 0, "owner unreadable: fail closed");
  assert.equal(state(dir).status, "degraded");
  worker(dir);
  assert.equal(calls(dir).length, 1, "owner restored: runs again");
  rmSync(dir, { recursive: true, force: true });
});
