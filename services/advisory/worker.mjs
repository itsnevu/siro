import { readFileSync,writeFileSync,unlinkSync,mkdirSync,existsSync } from "node:fs";
import { resolve,dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { advisory } from "./client.mjs";
const required=n=>{if(!process.env[n])throw new Error(`${n} is required`);return process.env[n];};
const journal=resolve(required("SIRO_ADVISORY_JOURNAL"));mkdirSync(dirname(journal),{recursive:true});
async function tick(){
 const done=new Set(existsSync(journal)?readFileSync(journal,"utf8").trim().split("\n").filter(Boolean).map(JSON.parse).map(e=>e.payload.decision_id):[]);
 const source=readFileSync(required("SIRO_JOURNAL"),"utf8");if(source&&!source.endsWith("\n"))return;
 for(const e of source.trim().split("\n").filter(Boolean).map(JSON.parse)){if(e.kind!=="decision"||done.has(e.payload.decision_id))continue;const d=e.payload;
  // Advisory consumes private committed features; it never sends or changes orders.
  const input={agent_id:d.agent_id,tick_ts:Date.parse(d.tick_ts),features:d.features};const started=Date.now();
  const result=await advisory(input,{url:required("SIRO_ADVISORY_URL")});let cost=null;
  if(process.env.SIRO_ADVISORY_DB&&existsSync(process.env.SIRO_ADVISORY_DB)){const db=new DatabaseSync(process.env.SIRO_ADVISORY_DB,{readOnly:true});try{const rows=db.prepare("SELECT cost_usd FROM llm_calls WHERE agent=? AND tick=?").all(d.agent_id,input.tick_ts);if(rows.length&&rows.every(r=>Number.isFinite(r.cost_usd)))cost=rows.reduce((s,r)=>s+r.cost_usd,0);}finally{db.close();}}
  const value={decision_id:d.decision_id,agent_id:d.agent_id,tick_ts:input.tick_ts,observed_at:Date.now(),contemporaneous:started>=input.tick_ts&&Date.now()<input.tick_ts+3600000,token_cost_usd:cost,result};
  const file=`${journal}.${process.pid}.pending.json`;writeFileSync(file,JSON.stringify(value),{flag:"wx"});try{const r=spawnSync(required("SIRO_LEDGER_BINARY"),["advisory-record",journal,file],{stdio:"inherit"});if(r.error)throw r.error;if(r.status!==0)throw new Error("Advisory journal append failed");}finally{unlinkSync(file);}
 }
}
await tick();if(!process.argv.includes("--once")){let running=false;setInterval(async()=>{if(running)return;running=true;try{await tick();}catch(e){console.error(e.message);process.exitCode=1;}finally{running=false;}},250);}
