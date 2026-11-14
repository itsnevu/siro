"use client";
import { useState } from "react";
import Link from "next/link";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/chain";
import { NetworkProvider, useNetwork } from "@/lib/network";
import { useVaultPage } from "@/lib/vaults";
import { AddressLink } from "@/components/app/Explorer";
export function RegistrySurface({ stats = false }: { stats?: boolean }) {
  const [query] = useState(() => new QueryClient());
  return <WagmiProvider config={wagmiConfig}><QueryClientProvider client={query}><NetworkProvider><Registry stats={stats} /></NetworkProvider></QueryClientProvider></WagmiProvider>;
}
function Registry({ stats }: { stats: boolean }) {
  const net = useNetwork(); const [offset, setOffset] = useState(0); const data = useVaultPage(offset);
  const nav = data.data?.vaults.every(v => v.totalAssets !== null && !v.error) ? data.data.vaults.reduce((sum, v) => sum + BigInt(v.totalAssets!), 0n) : undefined;
  return <div className="space-y-5 my-6">{data.isLoading && <p>Reading the factory registry...</p>}{data.error && <p role="alert">{data.error.message}</p>}{data.data && !data.data.configured && <p>No factory deployment is configured on {net.name}. Registry activity is unavailable.</p>}{data.data?.configured && <><p>Registered agents: {data.data.total} | Snapshot block: {data.data.block}</p>{stats && <p>NAV of the {data.data.vaults.length} vaults on this page: {net.fmt(nav)} USDG. No user counts, trading volume or performance figures are estimated.</p>}{!data.data.vaults.length && <p>No agents have been created.</p>}{data.data.vaults.map(v => <article key={v.vault} className="rounded-xl border border-line p-5 space-y-2"><h2 className="font-serif text-xl">Agent #{v.id}</h2><p>Vault: <AddressLink address={v.vault} /> | Creator: <AddressLink address={v.creator} /></p><p>NAV: {net.fmt(v.totalAssets === null ? undefined : BigInt(v.totalAssets))} USDG | {v.active ? "Listed" : "Unlisted"} | Trading switch: {v.error ? "Unknown" : v.paused ? "Paused" : "Unpaused"}</p>{v.error && <p role="alert">{v.error}</p>}<Link href={`/strategies/${v.id}?chain=${net.id}`} className="underline">Inspect registered agent</Link></article>)}<div className="flex gap-4"><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 10))}>Newer</button><button disabled={data.data.next === null} onClick={() => setOffset(data.data!.next!)}>Older</button></div></>}</div>;
}
