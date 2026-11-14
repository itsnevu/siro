type ProofStep = { sibling: string; left: boolean };
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "number") { if (!Number.isFinite(v)) throw new Error("Non-finite number in proof."); return JSON.stringify(v); }
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (typeof v !== "object") throw new Error("Invalid canonical JSON value.");
  const object = v as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(object[k])}`).join(",")}}`;
}
const bytes = (hex: string) => { if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("Invalid SHA-256 hash."); return Uint8Array.from(hex.match(/../g)!, x => parseInt(x, 16)); };
async function sha(value: Uint8Array) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", value as Uint8Array<ArrayBuffer>)), b => b.toString(16).padStart(2, "0")).join(""); }
async function root(leaf: string, path: ProofStep[]) { let current = leaf; for (const step of path) { const pair = new Uint8Array(64); pair.set(bytes(step.left ? step.sibling : current)); pair.set(bytes(step.left ? current : step.sibling),32); current = await sha(pair); } return current; }
type Publication = { proven: boolean; root?: string; proof?: ProofStep[]; witnessed_at?: string; max_lag_ms?: number; tx_hash?: string; contract?: string; chain_id?: number };
/**
 * Recomputes the publication verdict instead of trusting the server's `proven` flag.
 * `included`: the commit hash is a leaf of the witnessed batch root.
 * `timely`: tick <= witnessed_at <= min(reveal, tick + max_lag). Needs the revealed record for tick_ts.
 * The witness timestamp itself must still be checked on chain: Anchor.witnessedAt(root).
 */
async function checkPublication(committed: string, record: Record<string, unknown> | undefined, p: Publication | undefined) {
  if (!p?.root || !p.proof || !p.witnessed_at) return { included: null, timely: null, lagMs: null, root: null };
  const included = await root(committed, p.proof) === p.root;
  if (!record) return { included, timely: null, lagMs: null, root: p.root };
  const tick = Date.parse(String(record.tick_ts)), reveal = Date.parse(String(record.reveal_ts)), at = Date.parse(p.witnessed_at);
  const lagMs = at - tick;
  const timely = included && Number.isFinite(lagMs) && at >= tick && at <= reveal && lagMs <= (p.max_lag_ms ?? 0);
  return { included, timely, lagMs, root: p.root };
}
export async function checkDecisionProof(value: unknown) {
  const proof = value as { data: { decision: { status: string; commit_hash?: string; record?: Record<string,unknown> }; hour_root: string; daily_root: string; decision_proof: ProofStep[]; hour_proof: ProofStep[]; publication?: Publication } };
  const data = proof.data; const record = data.decision.record;
  let committed = data.decision.commit_hash; let commitment: boolean | null = null;
  if (record) { const { commit_hash, ...unsigned } = record; committed = String(commit_hash); commitment = await sha(new TextEncoder().encode(canonicalJson(unsigned))) === committed; }
  if (!committed) throw new Error("Commitment is absent.");
  const hourly = await root(committed,data.decision_proof) === data.hour_root;
  const daily = await root(data.hour_root,data.hour_proof) === data.daily_root;
  const publication = await checkPublication(committed, record, data.publication);
  return { commitment, hourly, daily, publication };
}
