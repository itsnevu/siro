"use client";

import { useState } from "react";
import { useAccount, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { zeroAddress, type Address, type Abi } from "viem";
import { GuardedVaultAbi, GuardedVaultFactoryAbi, AgentRegistryAbi, Erc20Abi } from "./contracts";
import { useNetwork } from "./network";

import { DEFAULT_POLICY, type Policy } from "./workspace-model";
export { DEFAULT_POLICY, type Policy } from "./workspace-model";

export function useAgents() {
  const net = useNetwork();
  const count = useReadContract({ address: net.guardedVaultFactory, abi: GuardedVaultFactoryAbi, functionName: "vaultCount", chainId: net.id, query: { enabled: !!net.guardedVaultFactory } });
  // Show the latest 100 agents; no indexer is used yet.
  const total = Number(count.data ?? 0n);
  const agents = useReadContracts({ contracts: Array.from({ length: Math.min(total, 100) }, (_, i) => ({ address: net.agentRegistry!, abi: AgentRegistryAbi, functionName: "getAgent" as const, args: [BigInt(total - i)] as const, chainId: net.id })), query: { enabled: !!net.agentRegistry && total > 0 } });
  return { agents: (agents.data ?? []).flatMap((r, i) => r.status === "success" ? [{ id: total - i, ...r.result }] : []), isLoading: count.isLoading || (total > 0 && agents.isLoading), isError: count.isError || agents.isError || !!agents.data?.some(r => r.status === "failure"), refetch: async () => { await count.refetch(); await agents.refetch(); } };
}

export function useGuardedVault(vault?: Address) {
  const net = useNetwork();
  const { address } = useAccount();
  const common = { address: vault, abi: GuardedVaultAbi, chainId: net.id, query: { enabled: !!vault } } as const;
  const total = useReadContract({ ...common, functionName: "totalAssets" });
  const shares = useReadContract({ ...common, functionName: "balanceOf", args: [address ?? zeroAddress], query: { enabled: !!vault && !!address } });
  const value = useReadContract({ ...common, functionName: "convertToAssets", args: [shares.data ?? 0n], query: { enabled: !!vault && shares.data !== undefined } });
  const owner = useReadContract({ ...common, functionName: "owner" });
  const killed = useReadContract({ ...common, functionName: "killSwitch" });
  const policy = useReadContract({ ...common, functionName: "policy" });
  const pending = useReadContract({ ...common, functionName: "pendingPolicy" });
  const liquidity = useReadContract({ address: net.token.address, abi: Erc20Abi, functionName: "balanceOf", args: [vault ?? zeroAddress], chainId: net.id, query: { enabled: !!vault && !!net.token.address } });
  const wallet = useReadContract({ address: net.token.address, abi: Erc20Abi, functionName: "balanceOf", args: [address ?? zeroAddress], chainId: net.id, query: { enabled: !!address && !!net.token.address } });
  return { total, shares, value, owner, killed, policy, pending, liquidity, wallet, refetch: () => Promise.all([total.refetch(), shares.refetch(), value.refetch(), owner.refetch(), killed.refetch(), policy.refetch(), pending.refetch(), liquidity.refetch(), wallet.refetch()]) };
}

export function useGuardedActions(vault?: Address) {
  const net = useNetwork();
  const { address: account, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}`>();
  async function write(address: Address, abi: Abi, functionName: string, args: readonly unknown[]) {
    if (!account) throw new Error("Connect a wallet first.");
    if (!net.guardedVaultFactory || !net.token.address) throw new Error("GuardedVault deployment is unavailable.");
    if (chainId !== net.id) await switchChainAsync({ chainId: net.id });
    const tx = await writeContractAsync({ address, abi, functionName, args, chainId: net.id });
    setHash(tx);
    const receipt = await net.client.waitForTransactionReceipt({ hash: tx, timeout: 120_000 });
    if (receipt.status !== "success") throw new Error(`Transaction reverted: ${tx}`);
    return receipt;
  }
  async function run(label: string, action: () => Promise<unknown>) {
    setStep(label);
    setHash(undefined);
    try { return await action(); } finally { setStep(null); }
  }
  function target() { if (!vault) throw new Error("Select a vault first."); return vault; }
  return {
    step, hash,
    permission: (kind: "token" | "router" | "executor", targetAddress: Address, allowed: boolean, activate: boolean) => run(activate ? "Activating permission" : "Queuing permission", () => {
      const names = { token: ["queueTokenPermission", "activateTokenPermission"], router: ["queueRouterPermission", "activateRouterPermission"], executor: ["queueExecutorPermission", "activateExecutorPermission"] } as const;
      return write(target(), GuardedVaultAbi, names[kind][activate ? 1 : 0], activate ? [targetAddress] : [targetAddress, allowed]);
    }),
    create: (name: string, policy: Policy = DEFAULT_POLICY, metadataURI = "") => run("Creating agent", () => {
      if (!net.guardedVaultFactory) throw new Error("Factory is not deployed.");
      if (!name.trim() || name.length > 64) throw new Error("Use a name between 1 and 64 characters.");
      return write(net.guardedVaultFactory, GuardedVaultFactoryAbi, "createAgent", [name.trim(), "sUSDG", policy, metadataURI, 0]);
    }),
    deposit: (amount: bigint) => run("Depositing", async () => {
      const destination = target();
      if (!account || !net.token.address || amount <= 0n) throw new Error("Enter a positive deposit and connect a wallet.");
      // Verify factory membership and settlement token before granting an allowance.
      const valid = await net.client.readContract({ address: net.guardedVaultFactory!, abi: GuardedVaultFactoryAbi, functionName: "isVault", args: [destination] });
      const asset = await net.client.readContract({ address: destination, abi: GuardedVaultAbi, functionName: "asset" });
      if (!valid || asset.toLowerCase() !== net.token.address.toLowerCase()) throw new Error("Vault does not match this deployment.");
      const allowance = await net.client.readContract({ address: net.token.address, abi: Erc20Abi, functionName: "allowance", args: [account, destination] });
      if (allowance < amount) { setStep("Approving USDG"); await write(net.token.address, Erc20Abi, "approve", [destination, amount]); }
      setStep("Depositing");
      return write(destination, GuardedVaultAbi, "deposit", [amount, account]);
    }),
    withdraw: (amount: bigint) => run("Withdrawing", () => {
      if (amount <= 0n) throw new Error("Enter a positive withdrawal.");
      return write(target(), GuardedVaultAbi, "withdraw", [amount, account, account]);
    }),
    redeemInKind: (shares: bigint) => run("Redeeming assets", () => write(target(), GuardedVaultAbi, "redeemInKind", [shares, account, account])),
    kill: (active: boolean) => run("Updating kill switch", () => write(target(), GuardedVaultAbi, "setKillSwitch", [active])),
    queuePolicy: (policy: Policy) => run("Queuing policy", () => write(target(), GuardedVaultAbi, "queuePolicy", [policy])),
    activatePolicy: () => run("Activating policy", () => write(target(), GuardedVaultAbi, "activatePolicy", [])),
  };
}
