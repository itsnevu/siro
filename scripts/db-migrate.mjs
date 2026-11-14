// Migration runner against DATABASE_URL (production or staging Postgres). No Docker.
//   DATABASE_URL=postgres://... node scripts/db-migrate.mjs up | status
//   DATABASE_URL=postgres://... node scripts/db-migrate.mjs down --i-know-this-drops-tables
// Each applied migration is recorded with its checksum; an edited migration is refused.
// Production is forward-only: `down` refuses unless explicitly confirmed.
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";

const dir = "db/migrations";
const sha = s => createHash("sha256").update(s).digest("hex");
export const migrations = () => readdirSync(dir).filter(f => f.endsWith(".up.sql")).sort().map(f => ({ id: f.replace(".up.sql", ""), up: readFileSync(`${dir}/${f}`, "utf8"), down: readFileSync(`${dir}/${f.replace(".up.sql", ".down.sql")}`, "utf8") }));

export async function connect() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" } });
  await client.connect();
  return client;
}

async function applied(client) {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
  const { rows } = await client.query("SELECT id, checksum FROM schema_migrations ORDER BY id");
  return new Map(rows.map(r => [r.id, r.checksum]));
}

export async function up(client) {
  const done = await applied(client);
  for (const m of migrations()) {
    if (done.has(m.id)) { if (done.get(m.id) !== sha(m.up)) throw new Error(`${m.id} was edited after it was applied`); continue; }
    await client.query("BEGIN");
    try {
      await client.query(m.up);
      await client.query("INSERT INTO schema_migrations(id, checksum) VALUES ($1, $2)", [m.id, sha(m.up)]);
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw new Error(`${m.id} failed: ${e.message}`); }
    console.log(`applied ${m.id}`);
  }
}

export async function down(client) {
  const done = await applied(client);
  const last = migrations().filter(m => done.has(m.id)).at(-1);
  if (!last) return console.log("nothing to roll back");
  await client.query("BEGIN");
  try {
    await client.query(last.down);
    await client.query("DELETE FROM schema_migrations WHERE id = $1", [last.id]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw new Error(`${last.id} rollback failed: ${e.message}`); }
  console.log(`rolled back ${last.id}`);
}

if (process.argv[1]?.endsWith("db-migrate.mjs")) {
  const cmd = process.argv[2];
  const client = await connect();
  try {
    if (cmd === "up") await up(client);
    else if (cmd === "status") console.log([...(await applied(client)).keys()].join("\n") || "(none)");
    else if (cmd === "down") {
      if (!process.argv.includes("--i-know-this-drops-tables")) throw new Error("down drops tables. Production is forward-only; pass --i-know-this-drops-tables only on a copy.");
      await down(client);
    } else { console.error("usage: db-migrate.mjs up|status|down"); process.exitCode = 2; }
  } finally { await client.end(); }
}
