"use client";
import { useState } from "react";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { isAddress, parseAbi, zeroAddress, type Address, type Abi } from "viem";
import { useNetwork } from "@/lib/network";
import { buttonClass, inputClass } from "./StrategyStudio";
/** Current Unix time in seconds; called only from event handlers. */
const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000));
const abi = parseAbi([
  "function owner() view returns(address)", "function killed() view returns(bool)",
  "function grant(address key,address vault,uint128 maxTrade,uint128 maxDaily,uint64 expiry,uint32 maxOracleAge,address[] assets,address[] venues)",
  "function revoke(address key)", "function setKill(bool active)", "function revokeAll()",
]);
export function SessionKeyControls({ vault, isOwner }: { vault?: Address; isOwner: boolean }) {
  const net=useNetwork(); const account=useAccount(); const { switchChainAsync }=useSwitchChain(); const { writeContractAsync }=useWriteContract();
  const [contract,setContract]=useState<string>(net.sessionExecutor ?? ""); const [key,setKey]=useState(""); const [trade,setTrade]=useState(""); const [daily,setDaily]=useState(""); const [expiry,setExpiry]=useState(""); const [assets,setAssets]=useState(""); const [venues,setVenues]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  const target=isAddress(contract)&&contract!==zeroAddress?contract:undefined;
  const owner=useReadContract({address:target,abi,functionName:"owner",chainId:net.id,query:{enabled:!!target}});
  const killed=useReadContract({address:target,abi,functionName:"killed",chainId:net.id,query:{enabled:!!target}});
  const allowed=!!target&&isOwner&&!!account.address&&owner.data?.toLowerCase()===account.address.toLowerCase();
  function addresses(value:string){const list=value.split(/[\s,]+/).filter(Boolean);if(!list.length||list.some(a=>!isAddress(a)||a===zeroAddress)||new Set(list.map(a=>a.toLowerCase())).size!==list.length)throw new Error("Enter unique, nonzero allowlisted addresses.");return list as Address[];}
  async function act(kind:"grant"|"revoke"|"revokeAll"|"kill"|"resume") {
    setBusy(true);setMessage("");
    try {
      if(!target||!allowed||!account.address||!vault)throw new Error("Connect the vault and session executor owner.");
      if(account.chainId!==net.id)await switchChainAsync({chainId:net.id});
      let functionName:string=kind;let args:readonly unknown[];
      if(kind==="grant") {if(!isAddress(key)||key===zeroAddress)throw new Error("Enter the public session signer address.");const maxTrade=BigInt(trade),maxDaily=BigInt(daily),until=BigInt(Math.floor(Date.parse(expiry)/1000));if(maxTrade<=0n||maxDaily<maxTrade||maxDaily>=2n**128n||until<=nowSeconds())throw new Error("Use positive caps in base atomic units and a future expiry.");args=[key,vault,maxTrade,maxDaily,until,3600,addresses(assets),addresses(venues)];}
      else if(kind==="revoke"){if(!isAddress(key)||key===zeroAddress)throw new Error("Enter the public session signer address.");args=[key];}
      else if(kind==="revokeAll"){args=[];}
      else {functionName="setKill";args=[kind==="kill"];}
      const call={address:target,abi:abi as Abi,functionName,args,account:account.address} as const;
      await net.client.simulateContract(call);const hash=await writeContractAsync({...call,chainId:net.id});setMessage(`Submitted ${hash}; waiting for confirmation.`);
      const receipt=await net.client.waitForTransactionReceipt({hash,confirmations:2,timeout:120000});if(receipt.status!=="success")throw new Error(`Transaction reverted: ${hash}`);
      await killed.refetch();setMessage(`Confirmed onchain: ${hash}`);
    }catch(e){setMessage(e instanceof Error?e.message:"Session transaction failed.");}finally{setBusy(false);}
  }
  return <section className="rounded-xl border border-line p-5 space-y-4"><h2 className="font-serif text-xl">Scoped session keys</h2><p className="text-sm">Enter your deployed SessionExecutor. Caps use the vault base asset’s atomic units. The session signer gets no withdrawal permission. Granting a session also requires the vault owner to allow this contract as an executor above.</p><label className="block">SessionExecutor address<input className={inputClass} value={contract} onChange={e=>setContract(e.target.value)} autoComplete="off" /></label>{owner.data&&<p className="break-all text-sm">Onchain owner: {owner.data} · {killed.data===undefined?"Kill status unavailable":killed.data?"Killed":"Enabled"}</p>}{owner.isError&&<p role="alert">SessionExecutor ownership could not be verified.</p>}<div className="grid gap-3 sm:grid-cols-2"><label>Public session signer<input className={inputClass} value={key} onChange={e=>setKey(e.target.value)} autoComplete="off" /></label><label>Expiry<input className={inputClass} type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} /></label><label>Per-trade cap (atomic units)<input className={inputClass} inputMode="numeric" value={trade} onChange={e=>setTrade(e.target.value)} /></label><label>Daily cap (atomic units)<input className={inputClass} inputMode="numeric" value={daily} onChange={e=>setDaily(e.target.value)} /></label><label>Allowlisted token addresses<textarea className={inputClass} value={assets} onChange={e=>setAssets(e.target.value)} /></label><label>Allowlisted router adapters<textarea className={inputClass} value={venues} onChange={e=>setVenues(e.target.value)} /></label></div><div className="flex flex-wrap gap-3">{(["grant","revoke","revokeAll","kill","resume"] as const).map(kind=><button key={kind} className={buttonClass} disabled={!allowed||busy} onClick={()=>act(kind)}>{kind==="grant"?"Grant scoped session":kind==="revoke"?"Revoke signer":kind==="revokeAll"?"Revoke all session keys":kind==="kill"?"Activate kill switch":"Clear kill switch"}</button>)}</div>{message&&<p role="status" className="text-sm break-all">{message}</p>}</section>;
}
