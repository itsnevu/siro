import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson,checkDecisionProof } from "../src/lib/decision-proof.ts";
test("browser commitment and Merkle verification detect tampering",async()=>{
 const record={agent_id:"test-only",notional_usd:12.5,prev_hash:"0".repeat(64)};
 const hash=createHash("sha256").update(canonicalJson(record)).digest("hex");
 const payload={data:{decision:{status:"revealed",record:{...record,commit_hash:hash}},hour_root:hash,daily_root:hash,decision_proof:[],hour_proof:[]}};
 assert.deepEqual(await checkDecisionProof(payload),{commitment:true,hourly:true,daily:true,publication:{included:null,timely:null,lagMs:null,root:null}});
 payload.data.decision.record.notional_usd=13;
 assert.equal((await checkDecisionProof(payload)).commitment,false);
 payload.data.daily_root="1".repeat(64);assert.equal((await checkDecisionProof(payload)).daily,false);
});
test("unrevealed commitment is never presented as verified content",async()=>{
 const leaf="0".repeat(64);const p={data:{decision:{status:"committed",commit_hash:leaf},hour_root:leaf,daily_root:leaf,decision_proof:[],hour_proof:[]}};
 assert.equal((await checkDecisionProof(p)).commitment,null);
});
