import { readFileSync,writeFileSync,unlinkSync,existsSync,mkdirSync } from "node:fs";
import { resolve,dirname } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const canonical=v=>v===null||typeof v!=="object"?JSON.stringify(v):Array.isArray(v)?`[${v.map(canonical).join(",")}]`:`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
const required=n=>{if(!process.env[n])throw new Error(`${n} is required`);return process.env[n];};
export function executionEvents(){const path=resolve(required("SIRO_EXECUTION_JOURNAL"));if(!existsSync(path))return [];const text=readFileSync(path,"utf8");if(text&&!text.endsWith("\n"))throw new Error("Torn execution journal");let prev="0".repeat(64);return text.trim().split("\n").filter(Boolean).map((line,i)=>{const e=JSON.parse(line);const {event_hash,...unsigned}=e;if(e.seq!==i||e.prev_hash!==prev||createHash("sha256").update(canonical(unsigned)).digest("hex")!==event_hash)throw new Error("Execution journal integrity failed");prev=event_hash;return e;});}
export function recordExecution(kind,value){
 const path=resolve(required("SIRO_EXECUTION_JOURNAL"));mkdirSync(dirname(path),{recursive:true});const temp=`${path}.${process.pid}.pending.json`;
 writeFileSync(temp,JSON.stringify({...value,recorded_at:Date.now()}),{flag:"wx",mode:0o600});
 try{const r=spawnSync(required("SIRO_LEDGER_BINARY"),[kind,path,temp],{stdio:"inherit",timeout:5000});if(r.error)throw r.error;if(r.status!==0)throw new Error("Execution event append failed");}finally{unlinkSync(temp);}
}
