// Pure parts of the publication witness, kept free of env and network so they can be tested.
export { merkleRoot, rootFromProof } from "./merkle.mjs";

/** Commit hashes from the decision API that are not yet in any confirmed witness batch. */
export async function pendingCommitHashes(fetchJson, api, done, max = 4096) {
  const out = new Set();
  for (let after = 0; after !== null && after !== undefined;) {
    const { data } = await fetchJson(`${api}/decisions?after=${after}`);
    for (const r of data.records) {
      const h = r.commit_hash ?? r.record?.commit_hash;
      if (/^[0-9a-f]{64}$/.test(h) && !done.has(h)) out.add(h);
      if (out.size >= max) return [...out];
    }
    if (data.next !== null && data.next !== undefined && data.next <= after) throw new Error("Decision API pagination did not advance");
    after = data.next;
  }
  return [...out];
}

/** Leaves already covered by confirmed witness receipts in an anchor journal (JSONL text). */
export function witnessedLeaves(journalText) {
  const set = new Set();
  for (const line of journalText.split("\n").filter(Boolean)) {
    const e = JSON.parse(line);
    if (e.kind === "witness_confirmed") for (const leaf of e.payload.leaves) set.add(leaf);
  }
  return set;
}
