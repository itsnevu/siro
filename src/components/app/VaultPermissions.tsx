"use client";
import { SessionKeyControls } from "./SessionKeyControls";
import { useState } from "react";
import { useBlock, useReadContract } from "wagmi";
import { isAddress, zeroAddress, type Address } from "viem";
import { GuardedVaultAbi } from "@/lib/contracts";
import { useNetwork } from "@/lib/network";
import { useGuardedActions } from "@/lib/guarded";
import { buttonClass, inputClass } from "./StrategyStudio";
const methods = {
  token: { queue: "queueTokenPermission", activate: "activateTokenPermission", pending: "pendingTokenPermission", current: "allowedTokens" },
  router: { queue: "queueRouterPermission", activate: "activateRouterPermission", pending: "pendingRouterPermission", current: "allowedRouters" },
  executor: { queue: "queueExecutorPermission", activate: "activateExecutorPermission", pending: "pendingExecutorPermission", current: "executors" },
} as const;
export type PermissionKind = keyof typeof methods;
export function VaultPermissions({ vault, isOwner }: { vault?: Address; isOwner: boolean }) {
  const net = useNetwork(), actions = useGuardedActions(vault);
  const [kind, setKind] = useState<PermissionKind>("token"), [account, setAccount] = useState(""), [allow, setAllow] = useState(true), [message, setMessage] = useState("");
  const target = isAddress(account) && account !== zeroAddress ? account : undefined;
  const options = { address: vault, abi: GuardedVaultAbi, chainId: net.id, args: [target || zeroAddress], query: { enabled: !!vault && !!target } } as const;
  const pending = useReadContract({ ...options, functionName: methods[kind].pending });
  const current = useReadContract({ ...options, functionName: methods[kind].current });
  const block = useBlock({ chainId: net.id, query: { enabled: !!vault, refetchInterval: 6000 } });
  const canActivate = !!pending.data?.[2] && block.data !== undefined && block.data.timestamp >= pending.data[1];
  async function execute(activate: boolean) {
    if (!target) return;
    try { await actions.permission(kind, target, allow, activate); await pending.refetch(); await current.refetch(); setMessage(activate ? "Permission activated onchain." : "Permission queued onchain. Wait for the timelock."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Permission transaction failed."); }
  }
  return <><section className="rounded-xl border border-line p-6 md:p-8 space-y-5"><h2 className="font-serif text-xl">Trading permissions</h2><p className="text-sm text-fg-70">The vault owner queues token, adapter-router and executor permissions. Each change must wait for the onchain timelock. A router address must implement the GuardedVault adapter interface.</p><div className="grid sm:grid-cols-3 gap-3"><select aria-label="Permission type" className={inputClass} value={kind} onChange={e => { setKind(e.target.value as PermissionKind); setMessage(""); }}><option value="token">Token</option><option value="router">Router adapter</option><option value="executor">Executor</option></select><input aria-label="Permission address" className={inputClass} placeholder="Contract or executor address" value={account} onChange={e => { setAccount(e.target.value); setMessage(""); }} /><select aria-label="Allow or deny" className={inputClass} value={String(allow)} onChange={e => setAllow(e.target.value === "true")}><option value="true">Allow</option><option value="false">Deny</option></select></div>{current.data !== undefined && <p className="text-sm">Currently {current.data ? "allowed" : "not allowed"}.</p>}{pending.data?.[2] && <p className="text-sm">Queued: {pending.data[0] ? "allow" : "deny"}, activates after {new Date(Number(pending.data[1]) * 1000).toLocaleString()}.</p>}{(current.isError || pending.isError) && <p role="alert">Permission data could not be loaded.</p>}<div className="flex gap-3"><button className={buttonClass} disabled={!vault || !target || !isOwner || !!actions.step} onClick={() => execute(false)}>Queue permission</button><button className={buttonClass} disabled={!vault || !target || !canActivate || !!actions.step} onClick={() => execute(true)}>Activate queued permission</button></div>{message && <p role="status" className="text-sm break-words">{message}</p>}</section><SessionKeyControls vault={vault} isOwner={isOwner} /></>;
}
