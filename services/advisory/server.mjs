import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fallback, validate } from "./client.mjs";
import { sanitizeInput } from "./sanitize.mjs";
const dbPath = resolve(process.env.SIRO_ADVISORY_DB || ".data/advisory.sqlite"); mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
if(db.prepare("PRAGMA user_version").get().user_version>1)throw new Error("Unsupported newer database schema");db.exec(readFileSync(new URL("./migrations/001_llm_calls.sql",import.meta.url),"utf8"));
const cache = new Map();
const provider = process.env.SIRO_LLM_PROVIDER_URL;
if (!provider) throw new Error("SIRO_LLM_PROVIDER_URL is required; no fake provider is installed.");
const inputRate = Number(process.env.SIRO_LLM_INPUT_USD_PER_MILLION); const outputRate = Number(process.env.SIRO_LLM_OUTPUT_USD_PER_MILLION);
if (![inputRate,outputRate].every(v => Number.isFinite(v) && v >= 0)) throw new Error("Configure actual provider token prices.");
async function evaluate(input) {
  const deadline = Date.now() + 4000;
  for (let attempt=1;attempt<=2;attempt++) {
    const started=Date.now();let status="failed",error=null,usage=null,result;
    try {
      const response=await fetch(provider,{method:"POST",headers:{"Content-Type":"application/json",...(process.env.SIRO_LLM_API_KEY ? {Authorization:`Bearer ${process.env.SIRO_LLM_API_KEY}`} : {})},body:JSON.stringify({task:"advisory_only",input:sanitizeInput(input),output_schema:{regime:["trending_up","chop","risk_off","vol_shock"],rationale_text:"string with observed feature key and value",events:"array of event_time, source_url, type, summary",strategy_proposals:"array of description and hypothesis; never executable"}}),signal:AbortSignal.timeout(Math.max(1,Math.min(1800,deadline-Date.now())))});
      if(!response.ok)throw new Error(`Provider HTTP ${response.status}`);const body=await response.json();usage=body.usage;
      if(!usage||![usage.input_tokens,usage.output_tokens].every(n=>Number.isInteger(n)&&n>=0))throw new Error("Provider token usage required.");
      result=validate(input,body.output);status="ok";
    } catch(e) {error=e instanceof Error?e.message:"provider error";}
    db.prepare("INSERT INTO llm_calls(agent,tick,started,latency_ms,attempt,status,input_tokens,output_tokens,cost_usd,error) VALUES(?,?,?,?,?,?,?,?,?,?)").run(input.agent_id,input.tick_ts,started,Date.now()-started,attempt,status,usage?.input_tokens??null,usage?.output_tokens??null,usage?(usage.input_tokens*inputRate+usage.output_tokens*outputRate)/1e6:null,error);
    if(result)return result;if(Date.now()>=deadline)break;
  }
  return fallback(input);
}
const server=createServer(async(req,res)=>{
  res.setHeader("Content-Type","application/json");
  if(req.method!=="POST"||req.url!=="/advisory"){res.writeHead(404);res.end(JSON.stringify({error:"Not found"}));return;}
  try {
    const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>65536)throw new Error("Request too large");chunks.push(chunk);}
    const input=JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if(!input||typeof input.agent_id!=="string"||input.agent_id.length>128||!Number.isSafeInteger(input.tick_ts)||!input.features||![input.features.z_48h,input.features.rsi_14,input.features.atr_pct].every(Number.isFinite))throw new Error("Invalid advisory input");
    const key=`${input.agent_id}:${input.tick_ts}`;const hash=createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const entry=cache.get(key);if(entry&&entry.hash!==hash)throw new Error("Advisory cache key conflicts with different input");
    if(!entry){if(cache.size>=10000)cache.delete(cache.keys().next().value);cache.set(key,{hash,promise:evaluate(input)});}
    res.end(JSON.stringify(await cache.get(key).promise));
  }catch(e){res.writeHead(400);res.end(JSON.stringify({error:e instanceof Error?e.message:"Invalid request"}));}
});
server.requestTimeout=4500;server.headersTimeout=5000;
server.listen(Number(process.env.SIRO_ADVISORY_PORT||4011),process.env.SIRO_ADVISORY_BIND||"127.0.0.1");
