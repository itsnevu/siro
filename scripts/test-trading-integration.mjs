// Isolated tests only. These fixtures are never served or shipped as runtime data.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import net from "node:net";
import { checkDecisionProof } from "../src/lib/decision-proof.ts";
const root=mkdtempSync(join(tmpdir(),"siro-core-test-"));
const binary=name=>resolve("target/debug",name+(process.platform==="win32"?".exe":""));
for(const name of ["replay","riskengine","api"])assert.ok(existsSync(binary(name)),`Build ${name} before integration tests`);
const H=3600000;
function canonical(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return `[${v.map(canonical).join(",")}]`;return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;}
const hash=v=>createHash("sha256").update(canonical(v)).digest("hex");
const env={...process.env,SIRO_RISK_MAC_KEY:"42".repeat(32),SIRO_RISK_POLICY:join(root,"risk.json"),SIRO_KILL_FILE:join(root,"KILL")};
writeFileSync(env.SIRO_RISK_POLICY,JSON.stringify({max_weight:0.2,target_vol_pct:1,risk_units_per_weight:100,permit_ttl_ms:4000}));
const bars=Array.from({length:170},(_,i)=>{const p=100+Math.sin(i/8)*10;return {asset:"TEST",open_ts:i*H,close_ts:(i+1)*H,open:p,high:p+2,low:p-2,close:p+0.5,volume:1000};});
const points=bars.map((b,i)=>({market:{ts:(i+1)*H,asset:"TEST",open:100+Math.sin((i+1)/8)*10,depth_usd:1000000,funding_bps_hour:0,borrow_bps_day:0,gas_usd:0.01,priority_usd:0},available_ts:(i+1)*H,spy_return:i%3===0?0.001:-0.0005,qqq_return:i%5===0?0.002:-0.0004,stale_ticks:0,gap_sigma:0.1,spread_ratio:1,regime:["bull","bear","long_chop","vol_shock","gap_news"][Math.floor(i/34)]}));
function command(args){const r=spawnSync(binary("replay"),args,{env,encoding:"utf8",timeout:120000,maxBuffer:2000000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr);return r.stdout;}
function run(label,corruptAfter){
 const bs=structuredClone(bars),ps=structuredClone(points);
 if(corruptAfter!==undefined){for(const b of bs)if(b.close_ts>corruptAfter){const p=90+(b.close_ts/H%13);b.open=p;b.close=p;b.high=p+2;b.low=p-2;b.volume=5000;}
  for(const p of ps)if(p.market.ts>corruptAfter){p.market.open=90+(p.market.ts/H%13);p.market.depth_usd=700000;p.spy_return=0.001;p.qqq_return=-0.002;}}
 const input=join(root,`${label}.jsonl`),parquet=join(root,`${label}.parquet`),market=join(root,`${label}-market.jsonl`),journal=join(root,`${label}-journal.jsonl`),config=join(root,`${label}.json`);
 writeFileSync(input,bs.map(JSON.stringify).join("\n")+"\n");command(["ingest",input,parquet]);writeFileSync(market,ps.map(JSON.stringify).join("\n")+"\n");
 writeFileSync(config,JSON.stringify({strategy:{agent_id:"test",version:1,parent_version:null,asset:"TEST",entry_z:-0.5,exit_z:0.5,max_weight:0.1,horizon_h:24,logistic_intercept:2,logistic_z:0,logistic_rsi:0,up_move_bps:200,down_move_bps:200,trained_model_hash:hash("test-training-only")},venue:{protocol_bps:1,lp_bps:3,slippage_k:100,calibration_id:"test-only"},initial_usd:10000,from:48*H,through:160*H,mode:"sim-queue",asset_class:"test",risk_profile:"test",internal:true,bars:parquet,market_data:market,journal,risk_program:binary("riskengine"),seed:42,bootstrap_block:5}));
 const report=JSON.parse(command(["run",config]));const recovered=JSON.parse(command(["run",config]));assert.deepEqual(recovered.metrics,report.metrics,"reconstructed accounting differs");const events=readFileSync(journal,"utf8").trim().split("\n").map(JSON.parse);
 return {events,report,journal};
}
let api;
try {
 const base=run("base");assert.equal(base.report.gate.passed,false);assert.ok(base.report.metrics.gross_return>=base.report.metrics.net_return);assert.ok(base.events.some(e=>e.kind==="fill"));
 const orders=new Map(base.events.filter(e=>e.kind==="order").map(e=>[e.payload.decision_id,e.payload]));for(const e of base.events.filter(e=>e.kind==="fill"))assert.ok(e.ts>=orders.get(e.payload.decision_id).eligible_open_ts);
 const cutoffs=new Set();let seed=42n;while(cutoffs.size<50){seed=(seed*6364136223846793005n+1n)&((1n<<64n)-1n);cutoffs.add((48+Number((seed>>32n)%110n))*H);}
 for(const t of cutoffs){const other=run(`cut-${t}`,t);const prefix=events=>events.filter(e=>e.ts<=t&&e.kind!=="report").map(canonical).join("\n");assert.equal(prefix(base.events),prefix(other.events),`Full trading replay leaked future data at ${t}`);}
 const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 api=spawn(binary("api"),[],{env:{...env,SIRO_JOURNAL:base.journal,SIRO_API_BIND:`127.0.0.1:${port}`},stdio:["ignore","pipe","pipe"]});
 const url=`http://127.0.0.1:${port}`;let response;for(let i=0;i<100;i++){try{response=await fetch(`${url}/agents`);break;}catch{await new Promise(r=>setTimeout(r,100));}}assert.ok(response?.ok,"API failed to start");assert.equal((await response.json()).data.length,1);
 const decision=base.events.find(e=>e.kind==="decision").payload;const verification=await fetch(`${url}/verify/${decision.decision_id}`);assert.equal(verification.status,200);const proof=await verification.json();assert.equal(proof.data.chain_integrity,true);assert.equal(proof.data.anchor,null);assert.deepEqual(await checkDecisionProof(proof),{commitment:true,hourly:true,daily:true,publication:{included:null,timely:null,lagMs:null,root:null}});assert.equal(proof.data.publication_proven,false,"no chain witness exists, so timely publication must not be claimed");
 console.log("Full replay anti-look-ahead: 50 cutoffs passed; real Parquet ingestion, risk subprocess, costs, fills, event recovery and public verification API passed.");
}finally{api?.kill();const actual=resolve(root),prefix=resolve(tmpdir())+sep;if(!actual.startsWith(prefix)||!actual.includes("siro-core-test-"))throw new Error("Refusing unsafe test cleanup");await new Promise(r=>setTimeout(r,200));rmSync(actual,{recursive:true,force:true});}
