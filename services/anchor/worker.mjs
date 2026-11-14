import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const required = name => { if(!process.env[name]) throw new Error(`${name} is required`); return process.env[name]; };
const chainId=Number(required("SIRO_ANCHOR_CHAIN_ID")),address=required("SIRO_ANCHOR_ADDRESS"),rpc=required("SIRO_ANCHOR_RPC");
const account=privateKeyToAccount(required("SIRO_ANCHOR_PRIVATE_KEY"));
const chain={id:chainId,name:"Configured anchor chain",nativeCurrency:{name:"Native",symbol:"NATIVE",decimals:18},rpcUrls:{default:{http:[rpc]}}};
const client=createPublicClient({chain,transport:http(rpc,{timeout:10000,retryCount:1})});
const wallet=createWalletClient({account,chain,transport:http(rpc,{timeout:10000,retryCount:0})});
const abi=parseAbi(["function dailyRoots(uint64) view returns(bytes32 value,uint64 timestamp)","function anchor(uint64 day,bytes32 root)","event Anchored(uint64 indexed day,bytes32 indexed root,uint64 timestamp)"]);
const confirmations=Number(required("SIRO_ANCHOR_CONFIRMATIONS"));if(!Number.isInteger(confirmations)||confirmations<2)throw new Error("At least two anchor confirmations required");
const journal=resolve(required("SIRO_ANCHOR_JOURNAL"));mkdirSync(dirname(journal),{recursive:true});
async function tick(){
 const response=await fetch(new URL("roots",`${required("SIRO_ENGINE_API").replace(/\/$/,"")}/`),{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`Root API HTTP ${response.status}`);const {data}=await response.json();
 for(const day of data){if(day.day>=Math.floor(Date.now()/86400000))continue;const root=`0x${day.root}`;
  const [existing]=await client.readContract({address,abi,functionName:"dailyRoots",args:[BigInt(day.day)]});let receipt;
  if(existing!==`0x${"0".repeat(64)}`){if(existing!==root)throw new Error(`Immutable anchor conflict for day ${day.day}`);const logs=await client.getLogs({address,event:abi.find(e=>e.type==="event"),args:{day:BigInt(day.day)},fromBlock:BigInt(required("SIRO_ANCHOR_DEPLOYMENT_BLOCK")),toBlock:"latest"});if(logs.length!==1)throw new Error("Cannot resolve anchor transaction");receipt=await client.getTransactionReceipt({hash:logs[0].transactionHash});}
  else{const hash=await wallet.writeContract({address,abi,functionName:"anchor",args:[BigInt(day.day),root]});receipt=await client.waitForTransactionReceipt({hash,confirmations,timeout:120000});}
  if(receipt.status!=="success")throw new Error("Anchor reverted");const tip=await client.getBlockNumber();if(tip-receipt.blockNumber+1n<BigInt(confirmations))continue;
  const block=await client.getBlock({blockNumber:receipt.blockNumber});if(block.hash!==receipt.blockHash)throw new Error("Anchor reorg detected");
  const event=receipt.logs.filter(l=>l.address.toLowerCase()===address.toLowerCase()).map(l=>{try{return decodeEventLog({abi,data:l.data,topics:l.topics});}catch{return null;}}).find(e=>e?.eventName==="Anchored"&&e.args.day===BigInt(day.day)&&e.args.root===root);if(!event)throw new Error("Anchor receipt lacks matching event");
  const temp=resolve(`${journal}.${process.pid}.receipt.json`);writeFileSync(temp,JSON.stringify({day:day.day,root:day.root,chain_id:chainId,contract:address,tx_hash:receipt.transactionHash,block_hash:receipt.blockHash,block_number:receipt.blockNumber.toString(),confirmations,confirmed_at:Date.now()}),{flag:"wx"});
  try{const r=spawnSync(required("SIRO_LEDGER_BINARY"),["anchor-receipt",journal,temp],{stdio:"inherit"});if(r.error)throw r.error;if(r.status!==0)throw new Error("Anchor append failed");}finally{unlinkSync(temp);}
 }
}
await tick();if(!process.argv.includes("--once"))setInterval(()=>tick().catch(e=>{console.error(e.message);process.exitCode=1;}),60000);
