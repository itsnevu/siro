import { createPublicClient, http, parseAbi, decodeEventLog } from "viem";
let body="";for await(const chunk of process.stdin){body+=chunk;if(body.length>65536)throw new Error("Lock proof too large");}
const {proof,hash,start,end}=JSON.parse(body);
if(!proof||!/^https:\/\//.test(proof.rpc)||!Number.isSafeInteger(proof.chain_id)||proof.confirmations<2)throw new Error("Invalid external OOS lock proof");
const chain={id:proof.chain_id,name:"OOS lock chain",nativeCurrency:{name:"Native",symbol:"NATIVE",decimals:18},rpcUrls:{default:{http:[proof.rpc]}}};
const client=createPublicClient({chain,transport:http(proof.rpc,{timeout:8000,retryCount:0})});
if(await client.getChainId()!==proof.chain_id)throw new Error("Lock chain mismatch");
const receipt=await client.getTransactionReceipt({hash:proof.tx_hash});if(receipt.status!=="success")throw new Error("OOS lock reverted");
const block=await client.getBlock({blockNumber:receipt.blockNumber});if(block.hash!==receipt.blockHash||block.timestamp*1000n>=BigInt(start))throw new Error("Lock was reorged or published after OOS started");
if(await client.getBlockNumber()-receipt.blockNumber+1n<BigInt(proof.confirmations))throw new Error("Insufficient lock confirmations");
const abi=parseAbi(["event StrategyLocked(bytes32 indexed hash,uint64 indexed windowStart,uint64 windowEnd,uint64 timestamp)"]);
const found=receipt.logs.filter(l=>l.address.toLowerCase()===proof.contract.toLowerCase()).some(l=>{try{const e=decodeEventLog({abi,topics:l.topics,data:l.data});return e.args.hash===`0x${hash}`&&e.args.windowStart*1000n===BigInt(start)&&e.args.windowEnd*1000n===BigInt(end)&&e.args.timestamp===block.timestamp;}catch{return false;}});
if(!found)throw new Error("Expected OOS lock event missing");process.stdout.write(JSON.stringify({verified:true,hash,tx_hash:proof.tx_hash}));
