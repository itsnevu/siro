// Verifies phase 12 guarantees on DATABASE_URL without changing data: every check runs inside
// one transaction that is always rolled back, so it is safe on production.
//   DATABASE_URL=postgres://... node scripts/db-verify.mjs
//   ... --roundtrip   additionally runs down -> up; refused unless the database is empty (copies only)
import assert from "node:assert/strict";
import { connect, up, down } from "./db-migrate.mjs";

const client = await connect();
const tick = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 2, 10)).toISOString();
const insert = (id, tickId, ts = tick) => client.query(
  "INSERT INTO decisions(decision_id,tick_ts,tick_id,agent_id,agent_version,commit_ts,reveal_ts,prev_hash,commit_hash,record,trace_id) VALUES ($1,$2,$3,'verify-agent',1,$2,$2,$4,$5,'{}','trace-verify')",
  [id, ts, tickId, "0".repeat(64), "a".repeat(64)]);
// Each failing statement aborts the transaction, so every probe runs behind a savepoint.
async function expectError(label, fn, pattern) {
  await client.query("SAVEPOINT probe");
  try { await fn(); assert.fail(`${label}: expected an error`); }
  catch (e) { if (e.code === "ERR_ASSERTION") throw e; assert.match(e.message, pattern, label); }
  finally { await client.query("ROLLBACK TO SAVEPOINT probe"); }
}

try {
  const { rows } = await client.query("SELECT count(*)::int AS n FROM schema_migrations WHERE id = '0001_core'");
  assert.equal(rows[0].n, 1, "run `node scripts/db-migrate.mjs up` first");
  await client.query("BEGIN");
  await client.query("SET LOCAL ROLE siro_app");
  await insert("00000000-0000-7000-8000-000000000001", "tick-verify");
  await expectError("same tick_id twice is rejected", () => insert("00000000-0000-7000-8000-000000000002", "tick-verify"), /duplicate|unique/i);
  await expectError("app UPDATE rejected", () => client.query("UPDATE decisions SET trace_id = 'x' WHERE agent_id = 'verify-agent'"), /permission denied|append-only/i);
  await expectError("app DELETE rejected", () => client.query("DELETE FROM decisions WHERE agent_id = 'verify-agent'"), /permission denied|append-only/i);
  await expectError("tick with no partition fails loudly", () => insert("00000000-0000-7000-8000-000000000003", "tick-far", "2099-01-01T00:00:00Z"), /no partition/i);
  await client.query("RESET ROLE");
  await expectError("owner UPDATE also rejected by trigger", () => client.query("UPDATE decisions SET trace_id = 'x' WHERE agent_id = 'verify-agent'"), /append-only/);
  const part = await client.query("SELECT tableoid::regclass::text AS p FROM decisions WHERE tick_id = 'tick-verify'");
  assert.match(part.rows[0].p, /^decisions_\d{4}_\d{2}$/, "row routed to its monthly partition");
  await client.query("ROLLBACK");
  console.log("db-verify: append-only (app and owner), partition routing and tick_id idempotency passed; no data was changed");

  if (process.argv.includes("--roundtrip")) {
    const { rows: [{ n }] } = await client.query("SELECT count(*)::int AS n FROM decisions");
    if (n > 0) throw new Error("--roundtrip refused: the database holds decisions. Run it only on an empty copy.");
    await down(client); await up(client);
    console.log("db-verify: down -> up round trip passed");
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  await client.end();
}
