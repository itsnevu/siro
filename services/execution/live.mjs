import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toBytes, formatUnits, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { executionEvents,recordExecution } from "./journal.mjs";
import { assertConfirmedReceipt } from "./receipt.mjs";
import { resolveOutcome, quorum, bumpedFees, NOT_EXECUTED_EXIT } from "./resolve.mjs";
import { parseTransaction } from "viem";
const required=n=>{if(!process.env[n])throw new Error(`${n} is required`);return process.env[n];};
function canonical(v){if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return `[${v.map(canonical).join(",")}]`;return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;}
const hash=v=>createHash("sha256").update(canonical(v)).digest("hex");
function journal(path){let prev="0".repeat(64);return readFileSync(path,"utf8").trimEnd().split("\n").map((line,i)=>{const e=JSON.parse(line);const {event_hash,...unsigned}=e;if(e.seq!==i||e.prev_hash!==prev||hash(unsigned)!==event_hash)throw new Error("Journal integrity failed");prev=event_hash;return e;});}
let raw="";for await(const c of process.stdin){raw+=c;if(raw.length>65536)throw new Error("Execution request too large");}
const {order,permit,request,market,cost_quote}=JSON.parse(raw);
required("SIRO_LEDGER_BINARY");
const executionHistory=executionEvents();
if(order.reducing&&order.side!=="sell")throw new Error("A reducing order cannot increase a long position");
const killed=()=>existsSync(required("SIRO_KILL_FILE"));
const halt=reason=>{writeFileSync(required("SIRO_KILL_FILE"),reason,{flag:"a"});throw new Error(reason);};
if(killed())throw new Error("Manual kill is active");
const {mac,...unsigned}=permit;const key=Buffer.from(required("SIRO_RISK_MAC_KEY"),"hex");const actual=createHmac("sha256",key).update(canonical(unsigned)).digest();const supplied=Buffer.from(mac,"hex");
if(key.length<32||actual.length!==supplied.length||!timingSafeEqual(actual,supplied)||permit.request_hash!==hash(request)||request.order_hash!==hash(order)||permit.veto.length||Date.now()<permit.ts||Date.now()>permit.valid_until||!Number.isFinite(permit.notional_usd)||permit.notional_usd<=0||permit.notional_usd>request.notional_usd||order.decision_id!==request.decision_id)throw new Error("Risk permit denied");
if(required("SIRO_MEV_PROTECTED")!=="true")throw new Error("Live execution requires a configured protected relay");
const c=JSON.parse(readFileSync(required("SIRO_EXECUTION_CONFIG"),"utf8"));
if(!Number.isSafeInteger(c.chain_id)||!Number.isInteger(c.confirmations)||c.confirmations<2||!Number.isFinite(c.reconciliation_tolerance_units)||c.reconciliation_tolerance_units<0||!Number.isInteger(c.max_oracle_age_seconds)||c.max_oracle_age_seconds<1||!Number.isInteger(c.max_slippage_bps)||c.max_slippage_bps<=0||c.max_slippage_bps>2000||![c.vault,c.base,c.router,c.session_executor].every(a=>/^0x[0-9a-fA-F]{40}$/.test(a)))throw new Error("Invalid execution configuration");
// Portfolio configs list per-asset token/oracle in c.assets; single-asset configs keep c.asset/c.token/c.oracle.
const leg=c.assets?(Object.hasOwn(c.assets,order.asset)?c.assets[order.asset]:null):order.asset===c.asset?{token:c.token,oracle:c.oracle}:null;
if(!leg||![leg.token,leg.oracle].every(a=>/^0x[0-9a-fA-F]{40}$/.test(a)))throw new Error("No execution configuration for this order's asset");
if(!Number.isFinite(c.live_cap_usd)||c.live_cap_usd<=0||order.notional_usd>c.live_cap_usd)throw new Error("Live capital ceiling exceeded");
const events=journal(required("SIRO_JOURNAL"));const decision=events.find(e=>e.kind==="decision"&&e.payload.decision_id===order.decision_id)?.payload;
if(!decision||decision.notional_usd<order.notional_usd||Date.parse(decision.commit_ts)>Date.now()||Date.parse(decision.tick_ts)>order.eligible_open_ts)throw new Error("Durably committed decision missing");
const validation=journal(required("SIRO_VALIDATION_JOURNAL")).filter(e=>e.kind==="walk_forward_report").at(-1)?.payload;
if(!validation?.gate?.passed||!validation.windows.some(w=>w.strategy_hash===decision.strategy_hash))throw new Error("Frozen strategy did not pass the complete release gate");
const quote=JSON.parse(readFileSync(required("SIRO_USD_QUOTES"),"utf8"));if(!Number.isFinite(quote.base_usd)||quote.base_usd<=0||!Number.isFinite(quote.native_usd)||quote.native_usd<=0||Date.now()-quote.ts>30000||quote.ts>Date.now())throw new Error("Fresh base/native USD quotes required");
const account=privateKeyToAccount(required("SIRO_SESSION_PRIVATE_KEY"));const rpc=required("SIRO_EXECUTION_RPC"),relay=required("SIRO_PRIVATE_RELAY_RPC");
const chain={id:c.chain_id,name:"Configured execution chain",nativeCurrency:{name:"Native",symbol:"NATIVE",decimals:18},rpcUrls:{default:{http:[rpc]}}};
const client=createPublicClient({chain,transport:http(rpc,{timeout:5000,retryCount:0})});const wallet=createWalletClient({account,chain,transport:http(relay,{timeout:5000,retryCount:0})});
if(await client.getChainId()!==c.chain_id)throw new Error("Execution chain mismatch");
const erc20=parseAbi(["function balanceOf(address) view returns(uint256)","function decimals() view returns(uint8)"]);
const oracleAbi=parseAbi(["function quote(address,address,uint256) view returns(uint256,uint256)"]);
const sessionAbi=parseAbi(["function execute(bytes32,address,address,address,uint256,uint256) returns(uint256)","function executed(bytes32) view returns(bool)"]);
const tradeAbi=parseAbi(["event TradeExecuted(address indexed executor,address indexed router,address indexed tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 lossAssets)"]);
const [baseDecimals,assetDecimals]=await Promise.all([c.base,leg.token].map(address=>client.readContract({address,abi:erc20,functionName:"decimals"})));
const balance=await client.readContract({address:leg.token,abi:erc20,functionName:"balanceOf",args:[c.vault]});
const expected=events.filter(e=>e.kind==="fill"&&e.payload.asset===order.asset).reduce((v,e)=>v+e.payload.quantity,0);
if(Math.abs(Number(formatUnits(balance,assetDecimals))-expected)>c.reconciliation_tolerance_units)halt("Position reconciliation mismatch");
const cap=Math.min(order.notional_usd,permit.notional_usd,order.original_notional_usd>market.depth_usd*0.005?order.original_notional_usd*0.2:order.notional_usd);
const baseUnits=cap/quote.base_usd*10**baseDecimals;if(!Number.isSafeInteger(Math.floor(baseUnits))||baseUnits<=0)throw new Error("Notional cannot be converted safely to atomic base units");
const baseAmount=BigInt(Math.floor(baseUnits));const buy=order.side==="buy";
const [assetAmount,updated]=await client.readContract({address:leg.oracle,abi:oracleAbi,functionName:"quote",args:[c.base,leg.token,baseAmount]});
if(BigInt(Math.floor(Date.now()/1000))-updated>BigInt(c.max_oracle_age_seconds)||updated>BigInt(Math.floor(Date.now()/1000)))throw new Error("Oracle stale");
const tokenIn=buy?c.base:leg.token,tokenOut=buy?leg.token:c.base,amountIn=buy?baseAmount:assetAmount<balance?assetAmount:balance;
const [expectedOut]=await client.readContract({address:leg.oracle,abi:oracleAbi,functionName:"quote",args:[tokenIn,tokenOut,amountIn]});
if(!Number.isInteger(c.max_slippage_bps)||c.max_slippage_bps<=0||c.max_slippage_bps>2000)throw new Error("Invalid slippage ceiling");
const minOut=expectedOut*BigInt(10000-c.max_slippage_bps)/10000n;
// Attempts that were provably not executed also advance the ordinal, so a retired outbox entry is never reused.
const ordinal=events.filter(e=>e.kind==="fill"&&e.payload.decision_id===order.decision_id).length+executionHistory.filter(e=>e.kind==="execution_resolution"&&e.payload.outcome==="not_executed"&&e.payload.decision_id===order.decision_id).length;
const id=keccak256(toBytes(`${order.decision_id}:${ordinal}`));
const dbPath=resolve(required("SIRO_EXECUTION_DB"));mkdirSync(dirname(dbPath),{recursive:true});const db=new DatabaseSync(dbPath);if(db.prepare("PRAGMA user_version").get().user_version>1)throw new Error("Unsupported newer database schema");db.exec(readFileSync(new URL("./migrations/001_outbox.sql",import.meta.url),"utf8"));
let saved=db.prepare("SELECT * FROM execution_outbox WHERE id=?").get(id);
const prepared=executionHistory.find(e=>e.kind==="execution_prepared"&&e.payload.execution_id===id)?.payload;
if(saved&&(!prepared||saved.raw!==prepared.raw||saved.hash!==prepared.hash||saved.order_hash!==prepared.order_hash||saved.notional!==prepared.notional))halt("Outbox cache does not match authoritative execution journal");
if(!saved&&prepared){db.prepare("INSERT OR IGNORE INTO execution_outbox(id,raw,hash,order_hash,notional) VALUES(?,?,?,?,?)").run(id,prepared.raw,prepared.hash,prepared.order_hash,prepared.notional);saved={raw:prepared.raw,hash:prepared.hash,order_hash:prepared.order_hash,notional:prepared.notional};}
if(saved&&(saved.order_hash!==hash(order)||saved.notional>permit.notional_usd))halt("Idempotency conflict or previous transaction exceeds refreshed risk limit");
if(!saved){const tx=await wallet.prepareTransactionRequest({account,to:c.session_executor,data:(await import("viem")).encodeFunctionData({abi:sessionAbi,functionName:"execute",args:[id,c.router,tokenIn,tokenOut,amountIn,minOut]})});
 const gasBps=Number(formatUnits(tx.gas*(tx.maxFeePerGas??tx.gasPrice),18))*quote.native_usd/cap*10000;
 const allIn=cost_quote.total_bps-cost_quote.gas_bps+gasBps;
 if(!Number.isFinite(allIn)||allIn>=10000||(!order.reducing&&order.expected_edge_bps<=allIn))throw new Error("Prepared gas and horizon costs exhaust net edge");
 const signed=await account.signTransaction(tx);const txHash=keccak256(signed);recordExecution("execution-prepared",{execution_id:id,decision_id:order.decision_id,raw:signed,hash:txHash,order_hash:hash(order),notional:cap,order,market,usd_quote:quote,chain_id:c.chain_id});db.prepare("INSERT INTO execution_outbox(id,raw,hash,order_hash,notional) VALUES(?,?,?,?,?)").run(id,signed,txHash,hash(order),cap);saved={raw:signed,hash:txHash,order_hash:hash(order),notional:cap};}
const done=await client.readContract({address:c.session_executor,abi:sessionAbi,functionName:"executed",args:[id]});
if(!done){
 const refreshed={...request,ts:Date.now(),notional_usd:saved.notional,requested_weight:saved.notional/request.equity_usd};
 const risk=spawnSync(required("SIRO_RISK_PROGRAM"),[],{input:canonical(refreshed),encoding:"utf8",timeout:2000,maxBuffer:65536});if(risk.error||risk.status!==0)throw new Error("Risk process unavailable before broadcast");
 const fresh=JSON.parse(risk.stdout);const {mac:freshMac,...message}=fresh;const signature=createHmac("sha256",key).update(canonical(message)).digest();const expected=Buffer.from(freshMac,"hex");
 if(signature.length!==expected.length||!timingSafeEqual(signature,expected)||fresh.request_hash!==hash(refreshed)||fresh.veto.length||fresh.notional_usd<saved.notional||Date.now()>fresh.valid_until||killed())throw new Error("Final risk veto before broadcast");
 // A broadcast error does not mean "not sent": the node may have accepted it. Resolution decides.
 await wallet.sendRawTransaction({serializedTransaction:saved.raw}).catch(e=>console.error(`Broadcast outcome uncertain: ${e.message}`));
}
const original=parseTransaction(saved.raw);
const secondaryRpc=process.env.SIRO_EXECUTION_RPC_SECONDARY;
const readers=[client,...(secondaryRpc?[createPublicClient({chain,transport:http(secondaryRpc,{timeout:5000,retryCount:0})})]:[])];
const resolveMs=Number(process.env.SIRO_EXECUTION_RESOLVE_MS??180000);
const resolution=await resolveOutcome({
 tx:{hash:saved.hash,nonce:original.nonce},
 getReceipt:h=>client.getTransactionReceipt({hash:h}).catch(()=>null),
 confirmedNonce:()=>quorum(readers.map(r=>()=>r.getTransactionCount({address:account.address,blockTag:"latest"}))),
 executed:()=>quorum(readers.map(r=>()=>r.readContract({address:c.session_executor,abi:sessionAbi,functionName:"executed",args:[id]}))),
 rebroadcast:()=>wallet.sendRawTransaction({serializedTransaction:saved.raw}),
 sendCancel:async()=>{
  const signed=await account.signTransaction({chainId:c.chain_id,type:"eip1559",nonce:original.nonce,to:account.address,value:0n,gas:21000n,...bumpedFees(original)});
  const cancelHash=keccak256(signed);
  recordExecution("execution-resolution",{execution_id:id,decision_id:order.decision_id,outcome:"cancel_sent",cancel_hash:cancelHash,raw:signed});
  await wallet.sendRawTransaction({serializedTransaction:signed}).catch(e=>console.error(`Cancellation broadcast uncertain: ${e.message}`));
  return {hash:cancelHash};
 },
 now:Date.now,sleep:ms=>new Promise(r=>setTimeout(r,ms)),deadlineMs:resolveMs,cancelDeadlineMs:resolveMs,pollMs:5000,
});
if(resolution.outcome==="not_executed"){
 recordExecution("execution-resolution",{execution_id:id,decision_id:order.decision_id,outcome:"not_executed",reason:resolution.reason,cancel_hash:resolution.cancelHash});
 // Exit only after stdout is flushed; a pipe write can be truncated by an immediate exit.
 process.stdout.write(JSON.stringify({outcome:"not_executed",reason:resolution.reason,execution_id:id}),()=>process.exit(NOT_EXECUTED_EXIT));
 await new Promise(()=>{});
}
if(!Number.isInteger(c.confirmations)||c.confirmations<2)throw new Error("At least two execution confirmations required");
const receipt=await client.waitForTransactionReceipt({hash:saved.hash,confirmations:c.confirmations,timeout:120000});if(receipt.status!=="success")halt("Execution reverted");
const block=await client.getBlock({blockNumber:receipt.blockNumber});try{assertConfirmedReceipt(receipt,block,await client.getBlockNumber(),c.confirmations);}catch(e){halt(e.message);}
const trade=receipt.logs.filter(l=>l.address.toLowerCase()===c.vault.toLowerCase()).map(l=>{try{return decodeEventLog({abi:tradeAbi,data:l.data,topics:l.topics});}catch{return null;}}).find(e=>e?.args.executor.toLowerCase()===c.session_executor.toLowerCase()&&e.args.tokenIn.toLowerCase()===tokenIn.toLowerCase());if(!trade)halt("Confirmed receipt has no matching vault trade");
const units=Number(formatUnits(buy?trade.args.amountOut:trade.args.amountIn,assetDecimals));const value=Number(formatUnits(buy?trade.args.amountIn:trade.args.amountOut,baseDecimals))*quote.base_usd;const price=value/units;
const fill={fill_id:id.slice(2),decision_id:order.decision_id,asset:order.asset,ts:market.ts,quantity:buy?units:-units,price,fees_usd:0,external_fees_usd:Number(formatUnits(receipt.gasUsed*receipt.effectiveGasPrice,18))*quote.native_usd,slippage_usd:Math.max(0,buy?price-market.open:market.open-price)*units};
recordExecution("execution-receipt",{execution_id:id,decision_id:order.decision_id,tx_hash:receipt.transactionHash,block_hash:receipt.blockHash,block_number:receipt.blockNumber.toString(),chain_id:c.chain_id,fill});
process.stdout.write(JSON.stringify(fill));
