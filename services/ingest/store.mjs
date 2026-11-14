// Write-once raw store. A key is fetched at most once; the stored payload is never overwritten.
// Parsing always reads the stored payload, so a later bug fix can re-derive data without refetching.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

export function createStore(root) {
  const path = key => {
    const safe = key.replace(/[^A-Za-z0-9._/-]/g, "_");
    const name = safe.length > 120 ? `${safe.slice(0, 80)}-${createHash("sha256").update(key).digest("hex").slice(0, 16)}` : safe;
    return join(root, `${name}.json`);
  };
  async function once(key, fetcher) {
    const p = path(key);
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8")).payload;
    const payload = await fetcher();
    mkdirSync(dirname(p), { recursive: true });
    const body = JSON.stringify({ key, fetched_at: new Date().toISOString(), payload }, (_, v) => (typeof v === "bigint" ? v.toString() : v));
    try { writeFileSync(p, body, { flag: "wx" }); }
    catch (e) { if (e.code !== "EEXIST") throw e; } // a concurrent writer stored it first; keep theirs
    return JSON.parse(readFileSync(p, "utf8")).payload;
  }
  return { once, path };
}
