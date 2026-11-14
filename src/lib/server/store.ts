import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { emptyWorkspace, type Workspace } from "../workspace-model";

type SQL = string | number | null;
interface Statement { run(...values: SQL[]): { changes: number }; get(...values: SQL[]): unknown; all(...values: SQL[]): unknown[] }
interface Database { exec(sql: string): void; prepare(sql: string): Statement }
const builtin = (process as typeof process & { getBuiltinModule(name: string): unknown }).getBuiltinModule;
const globals = globalThis as typeof globalThis & { siroDatabase?: Database };
export function db(): Database {
  if (!globals.siroDatabase) {
    const dir = resolve(/* turbopackIgnore: true */ process.env.SIRO_DATA_DIR || resolve(process.cwd(), ".data"));
    mkdirSync(dir, { recursive: true });
    const { DatabaseSync } = builtin("node:sqlite") as { DatabaseSync: new (path: string) => Database };
    const database = new DatabaseSync(resolve(dir, "siro.sqlite"));
    database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY, address TEXT NOT NULL, message TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, address TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS workspaces(address TEXT NOT NULL, chain INTEGER NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(address,chain));
      CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);`);
    database.exec(`CREATE TABLE IF NOT EXISTS keeper_heartbeat(id INTEGER PRIMARY KEY, mode TEXT NOT NULL, signer TEXT, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS keeper_runs(key TEXT PRIMARY KEY, address TEXT NOT NULL, chain INTEGER NOT NULL, schedule TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL, next_run INTEGER NOT NULL, lease_until INTEGER NOT NULL DEFAULT 0, hash TEXT, raw TEXT, updated INTEGER NOT NULL);`);
    globals.siroDatabase = database;
  }
  return globals.siroDatabase;
}
export const secret = () => randomBytes(32).toString("hex");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function limit(key: string, maximum: number, seconds = 60) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const result = db().prepare("INSERT INTO rate_limits(key,window,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window RETURNING count").get(key, window) as { count: number };
  if (result.count > maximum) throw new HttpError(429, "Too many requests. Try again later.");
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new HttpError(403, "Request origin is not allowed.");
}
export async function jsonBody(request: Request, max = 200_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "JSON is required.");
  if (Number(request.headers.get("content-length")) > max) throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw new HttpError(413, "Request is too large."); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new HttpError(400, "Invalid JSON."); }
}
export function session(request: Request): string {
  const raw = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith("siro_session="))?.slice(13);
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) throw new HttpError(401, "Sign in with your wallet first.");
  const row = db().prepare("SELECT address FROM sessions WHERE token=? AND expires>?").get(digest(raw), Date.now()) as { address: string } | undefined;
  if (!row) throw new HttpError(401, "Your session expired. Sign in again.");
  return row.address;
}
export function readWorkspace(address: string, chain: number): { revision: number; workspace: Workspace } {
  const row = db().prepare("SELECT revision,body FROM workspaces WHERE address=? AND chain=?").get(address.toLowerCase(), chain) as { revision: number; body: string } | undefined;
  return row ? { revision: row.revision, workspace: JSON.parse(row.body) as Workspace } : { revision: 0, workspace: emptyWorkspace() };
}
export function writeWorkspace(address: string, chain: number, revision: number, workspace: Workspace) {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const current = readWorkspace(address, chain);
    if (current.revision !== revision) throw new HttpError(409, "Workspace changed in another tab. Reload before saving.");
    database.prepare("INSERT INTO workspaces(address,chain,revision,body) VALUES(?,?,?,?) ON CONFLICT(address,chain) DO UPDATE SET revision=excluded.revision,body=excluded.body").run(address.toLowerCase(), chain, revision + 1, JSON.stringify(workspace));
    database.exec("COMMIT");
    return { revision: revision + 1, workspace };
  } catch (error) { database.exec("ROLLBACK"); throw error; }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Siro API failure:", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "The service could not complete this request." }, { status: 500 });
}
