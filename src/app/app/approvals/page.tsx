"use client";
import { useState } from "react";
import { useNetwork } from "@/lib/network";
import { useAccount, useBlock } from "wagmi";
import { type Address } from "viem";
import { AppShell } from "@/components/app/AppShell";
import { AddressLink } from "@/components/app/Explorer";
import { buttonClass } from "@/components/app/StrategyStudio";
import { useAgents, useGuardedVault, useGuardedActions } from "@/lib/guarded";
export default function ApprovalsPage() {
  const { address } = useAccount(); const data = useAgents(); const owned = data.agents.filter(a => a.creator.toLowerCase() === address?.toLowerCase());
  return <AppShell><div className="py-10 space-y-5"><h1 className="font-serif text-3xl">Pending policy activations</h1><p className="text-sm text-fg-70">Reads actual policy queues from your vaults among the latest 100 agents. There is no offchain trade proposal service connected.</p>{!address && <p>Connect your wallet to see its vaults.</p>}{data.isError && <p role="alert">Could not read the registry.</p>}{address && !owned.length && !data.isLoading && <p>No creator vaults found in this range.</p>}{owned.map(a => <PendingPolicy key={a.vault} vault={a.vault} />)}</div></AppShell>;
}
function PendingPolicy({ vault }: { vault: Address }) {
  const net = useNetwork(); const block = useBlock({ chainId: net.id, query: { refetchInterval: 6000 } });
  const data = useGuardedVault(vault), actions = useGuardedActions(vault); const [message, setMessage] = useState(""); const at = data.pending.data?.[1];
  return <article className="rounded-xl border border-line p-5 space-y-3"><AddressLink address={vault} />{data.pending.isError ? <p role="alert">Could not load pending policy.</p> : !at ? <p className="text-sm">No queued policy.</p> : <><p className="text-sm">Activates after {new Date(Number(at) * 1000).toLocaleString()}.</p><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data.pending.data?.[0], null, 2)}</pre><button className={buttonClass} disabled={!!actions.step || !block.data || block.data.timestamp < at} onClick={async () => { try { await actions.activatePolicy(); await data.refetch(); setMessage("Policy activation confirmed onchain."); } catch (e) { setMessage(e instanceof Error ? e.message : "Activation failed."); } }}>Activate queued policy</button><p className="text-xs text-fg-70">A queued policy cannot be cancelled with the current contract. The owner can replace it by queuing another policy.</p></>}{message && <p role="status">{message}</p>}</article>;
}
