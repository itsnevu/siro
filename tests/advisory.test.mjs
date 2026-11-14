import test from "node:test";
import assert from "node:assert/strict";
import { advisory } from "../services/advisory/client.mjs";
const input={agent_id:"test",tick_ts:0,features:{z_48h:-3,rsi_14:20,atr_pct:2}};
test("LLM outage never prevents deterministic fallback",async()=>{const r=await advisory(input,{url:"https://unavailable.invalid",fetcher:async()=>{throw new DOMException("Timeout","TimeoutError");}});assert.equal(r.source,"rules");assert.equal(r.regime,"risk_off");});
test("malformed LLM output falls back to rules",async()=>{const r=await advisory(input,{url:"https://test.invalid",fetcher:async()=>({ok:true,json:async()=>({regime:"make_money"})})});assert.equal(r.source,"rules");assert.match(r.rationale_text,/z_48h=-3/);});
