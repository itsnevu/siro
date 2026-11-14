"use client";

import { useState } from "react";
import { VaultPermissions } from "@/components/app/VaultPermissions";
import { useAccount, useBlock } from "wagmi";
import { parseUnits, type Address } from "viem";
import { AppShell, Stat } from "@/components/app/AppShell";
import { AddressLink } from "@/components/app/Explorer";
import { useNetwork } from "@/lib/network";
import { DEFAULT_POLICY, useAgents, useGuardedVault, useGuardedActions, type Policy } from "@/lib/guarded";

const field = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink";
const button = "rounded-pill border border-line px-4 py-2 text-sm disabled:opacity-40";

export default function DashboardPage() {
  return <AppShell><VaultDashboard /></AppShell>;
}

function VaultDashboard() {
  const net = useNetwork();
  const { address } = useAccount();
  const list = useAgents();
  const [selection, setSelection] = useState("");
  const agent = list.agents.find(a => `${net.id}:${a.vault}` === selection) ?? list.agents.find(a => a.creator.toLowerCase() === address?.toLowerCase()) ?? list.agents[0];
  const vault = agent?.vault as Address | undefined;
  const data = useGuardedVault(vault);
  const actions = useGuardedActions(vault);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const isOwner = !!address && data.owner.data?.toLowerCase() === address.toLowerCase();
  const busy = !!actions.step;
  const ready = !!net.guardedVaultFactory && !!address && !busy;
  async function execute(action: () => Promise<unknown>, message: string) {
    setFeedback(""); setFailed(false);
    try { await action(); setFeedback(message); await list.refetch(); await data.refetch(); }
    catch (e) { setFailed(true); setFeedback(e instanceof Error ? e.message : "Transaction failed."); }
  }
  const pendingAt = data.pending.data?.[1];
  const block = useBlock({ chainId: net.id, query: { enabled: !!vault, refetchInterval: 6000 } });
  return <div className="space-y-7 pt-10">
    <div><h1 className="font-serif text-[36px] text-ink">Guarded Vault</h1><p className="mt-2 text-sm text-fg-70">One ERC-4626 vault per agent on {net.name}. Trading requires a configured router and executor.</p></div>
    {!net.guardedVaultFactory && <p role="status" className="rounded-lg border border-line p-4 text-sm">GuardedVaultFactory is not deployed or its configuration is incomplete on {net.name}. Transactions are unavailable.</p>}
    {list.isError && <p role="alert">Could not load agents from this network. Check the RPC and deployment configuration.</p>}
    <section className="rounded-xl border border-line p-5 space-y-3">
      <h2 className="font-serif text-xl">Create an agent</h2>
      <p className="text-sm text-fg-70">Creates an empty vault with a one-day policy timelock and no trading permissions. Deposit after creation. No creator fee is charged by this flow.</p>
      <div className="flex flex-wrap gap-3"><input aria-label="Agent name" className={field} placeholder="Agent name" maxLength={64} value={name} onChange={e => setName(e.target.value)} /><button className={button} disabled={!ready || !name.trim()} onClick={() => execute(() => actions.create(name), "Agent created. Select its vault below to deposit.")}>Create agent</button></div>
      <p className="text-xs text-fg-70">Initial policy: 10% per trade, 25% allocation, 5% daily loss, 1% slippage, 1-hour cooldown, 24-hour oracle freshness.</p>
    </section>
    <label className="block text-sm">Vault (latest 100 agents)<select aria-label="Select vault" className={`${field} mt-2 block w-full`} value={agent ? `${net.id}:${agent.vault}` : ""} onChange={e => { setSelection(e.target.value); setFeedback(""); }}><option value="" disabled>{list.isLoading ? "Loading agents..." : "No agents available"}</option>{list.agents.map(a => <option key={a.vault} value={`${net.id}:${a.vault}`}>Agent #{a.id} — {a.vault}{!a.active ? " (unlisted)" : ""}</option>)}</select></label>
    {vault && <p className="text-sm">Vault: <AddressLink address={vault} /> · Owner: {data.owner.data && <AddressLink address={data.owner.data} />}</p>}
    <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Vault NAV" value={net.fmt(data.total.data)} sub={net.symbol} />
      <Stat label="Your share value" value={net.fmt(data.value.data)} sub={net.symbol} />
      <Stat label="Available USDG" value={net.fmt(data.liquidity.data)} sub="Liquid balance, shared by all depositors" />
      <Stat label="Trading switch" value={!vault || data.killed.data === undefined ? "Unavailable" : data.killed.data ? "Paused" : "Unpaused"} sub="Does not indicate keeper availability" />
    </section>
    {data.total.isError && <p role="alert" className="text-sm">NAV could not be read. In-kind redemption remains available without an oracle.</p>}
    <section className="rounded-xl border border-line p-5 space-y-3">
      <h2 className="font-serif text-xl">Deposit / withdraw {net.symbol}</h2>
      <p className="text-sm text-fg-70">Wallet: {net.fmt(data.wallet.data)} {net.symbol}. USDG withdrawals require enough liquid USDG. Redeem all shares in kind to receive your proportional holdings of every vault asset.</p>
      <div className="flex flex-wrap gap-3"><input aria-label="Amount in USDG" className={field} inputMode="decimal" placeholder="Amount in USDG" value={amount} onChange={e => setAmount(e.target.value)} />
      <button className={button} disabled={!ready || !vault || !amount} onClick={() => execute(() => actions.deposit(parseUnits(amount, net.decimals)), "Deposit confirmed.")}>Approve / deposit</button>
      <button className={button} disabled={!ready || !vault || !amount} onClick={() => execute(() => actions.withdraw(parseUnits(amount, net.decimals)), "Withdrawal confirmed.")}>Withdraw USDG</button>
      <button className={button} disabled={!ready || !vault || !data.shares.data} onClick={() => execute(() => actions.redeemInKind(data.shares.data!), "All shares redeemed into underlying assets.")}>Redeem all in kind</button></div>
    </section>
    <section className="rounded-xl border border-line p-5 space-y-4" id="policy">
      <h2 className="font-serif text-xl">Onchain policy</h2>
      <p className="text-sm text-fg-70">Only the vault owner may queue changes or pause trading. Changes activate after the onchain timelock. Bps: 100 = 1%.</p>
      {data.policy.data && <p className="text-sm">Current: trade {data.policy.data[0]} bps · allocation {data.policy.data[1]} bps · daily loss {data.policy.data[2]} bps · slippage {data.policy.data[3]} bps · cooldown {data.policy.data[4]}s · oracle delay {data.policy.data[5]}s.</p>}
      <div className="grid sm:grid-cols-3 gap-3">{(Object.keys(DEFAULT_POLICY) as (keyof Policy)[]).map(key => <label className="text-xs" key={key}>{key}<input aria-label={key} className={`${field} block w-full mt-1`} type="number" min="0" step="1" value={policy[key]} onChange={e => setPolicy(p => ({ ...p, [key]: Number(e.target.value) }))} /></label>)}</div>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={!ready || !isOwner} onClick={() => execute(() => actions.queuePolicy(policy), "Policy queued. Wait for the timelock before activation.")}>Queue policy</button>
      <button className={button} disabled={!ready || !pendingAt || !block.data || block.data.timestamp < pendingAt} onClick={() => execute(actions.activatePolicy, "Policy activated.")}>Activate queued policy</button>
      <button className={button} disabled={!ready || !isOwner || data.killed.data === undefined} onClick={() => execute(() => actions.kill(!data.killed.data), "Trading switch updated.")}>{data.killed.data ? "Unpause trading" : "Pause trading"}</button></div>
      {!!pendingAt && <p className="text-sm">Queued policy can activate at {new Date(Number(pendingAt) * 1000).toLocaleString()}. Values: {JSON.stringify(data.pending.data?.[0])}</p>}
    </section>
    <VaultPermissions key={`${net.id}:${vault}`} vault={vault} isOwner={isOwner} />
    {actions.step && <p role="status">{actions.step} — confirm in your wallet, then wait for the receipt.</p>}
    {actions.hash && <p className="text-xs break-all">Transaction: {actions.hash}</p>}
    {feedback && <p role={failed ? "alert" : "status"} className="rounded-lg border border-line p-4 text-sm break-words">{feedback}</p>}
    <p className="text-xs text-fg-70">Trade history and keeper monitoring are not connected. No simulated PnL or sample trades are shown here.</p>
  </div>;
}
