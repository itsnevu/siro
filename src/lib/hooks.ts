"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { zeroAddress, type Address, type Abi } from "viem";
import {
  SiroCopyVaultAbi,
  SiroRiskGuardAbi,
  SiroLeaderboardAbi,
  Erc20Abi,
  type Vault,
  type Leader,
  type RiskParams,
} from "./contracts";
import { useNetwork } from "./network";

const noop = () => () => {};
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

// ------------------------------------------------------------ vault

export function useVault(owner?: Address) {
  const net = useNetwork();
  const vaultAddr = net.copyVault;
  const { data, refetch, isLoading, isError } = useReadContract({
    address: vaultAddr,
    abi: SiroCopyVaultAbi,
    functionName: "getVault",
    args: [owner ?? zeroAddress],
    chainId: net.id,
    query: { enabled: !!vaultAddr && !!owner },
  });

  const vault: Vault | undefined = useMemo(() => {
    if (!data) return undefined;
    const d = data as Record<string, unknown>;
    return {
      owner: d.owner as Address,
      balance: d.balance as bigint,
      highWaterMark: d.highWaterMark as bigint,
      isPaused: d.isPaused as boolean,
      leaders: Array.from(d.leaders as Address[]).filter((a) => a !== zeroAddress),
      leaderCount: Number(d.leaderCount),
      depositedAt: d.depositedAt as bigint,
      lastTradeAt: d.lastTradeAt as bigint,
    };
  }, [data]);

  return { vault, refetch, isLoading, isError };
}

export function useVaultBalance(owner?: Address) {
  const net = useNetwork();
  const vaultAddr = net.copyVault;
  const { data, refetch } = useReadContract({
    address: vaultAddr,
    abi: SiroCopyVaultAbi,
    functionName: "getVaultBalance",
    args: [owner ?? zeroAddress],
    chainId: net.id,
    query: { enabled: !!vaultAddr && !!owner },
  });
  return { balance: (data as bigint | undefined) ?? 0n, refetch };
}

// ------------------------------------------------------------ leaderboard

export function useLeaderboard(offset = 0, limit = 20) {
  const net = useNetwork();
  const lbAddr = net.leaderboard;
  const { data, refetch, isLoading } = useReadContract({
    address: lbAddr,
    abi: SiroLeaderboardAbi,
    functionName: "getTopLeaders",
    args: [BigInt(offset), BigInt(limit)],
    chainId: net.id,
    query: { enabled: !!lbAddr },
  });

  const leaders: Leader[] = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map((d) => ({
      addr: d.addr as Address,
      name: d.name as string,
      totalPnlBps: Number(d.totalPnlBps),
      sharpeBps: Number(d.sharpeBps),
      maxDrawdownBps: Number(d.maxDrawdownBps),
      followerCount: d.followerCount as bigint,
      registeredAt: d.registeredAt as bigint,
    }));
  }, [data]);

  return { leaders, refetch, isLoading };
}

export function useLeaderStats(leader?: Address) {
  const net = useNetwork();
  const lbAddr = net.leaderboard;
  const { data, refetch } = useReadContract({
    address: lbAddr,
    abi: SiroLeaderboardAbi,
    functionName: "getLeaderStats",
    args: [leader ?? zeroAddress],
    chainId: net.id,
    query: { enabled: !!lbAddr && !!leader },
  });
  const stats: Leader | undefined = useMemo(() => {
    if (!data) return undefined;
    const d = data as Record<string, unknown>;
    return {
      addr: d.addr as Address,
      name: d.name as string,
      totalPnlBps: Number(d.totalPnlBps),
      sharpeBps: Number(d.sharpeBps),
      maxDrawdownBps: Number(d.maxDrawdownBps),
      followerCount: d.followerCount as bigint,
      registeredAt: d.registeredAt as bigint,
    };
  }, [data]);
  return { stats, refetch };
}

// ------------------------------------------------------------ risk

export function useRiskParams(owner?: Address) {
  const net = useNetwork();
  const rgAddr = net.riskGuard;
  const { data, refetch } = useReadContract({
    address: rgAddr,
    abi: SiroRiskGuardAbi,
    functionName: "getRiskParams",
    args: [owner ?? zeroAddress],
    chainId: net.id,
    query: { enabled: !!rgAddr && !!owner },
  });

  const params: RiskParams = useMemo(() => {
    if (!data) return { maxTradeSizeBps: 1000, dailyLossLimitBps: 500, maxPositionBps: 2000, slippageBps: 100 };
    const d = data as Record<string, unknown>;
    return {
      maxTradeSizeBps: Number(d.maxTradeSizeBps),
      dailyLossLimitBps: Number(d.dailyLossLimitBps),
      maxPositionBps: Number(d.maxPositionBps),
      slippageBps: Number(d.slippageBps),
    };
  }, [data]);

  return { params, refetch };
}

export function useIsKilled(owner?: Address) {
  const net = useNetwork();
  const rgAddr = net.riskGuard;
  const { data, refetch } = useReadContract({
    address: rgAddr,
    abi: SiroRiskGuardAbi,
    functionName: "isKilled",
    args: [owner ?? zeroAddress],
    chainId: net.id,
    query: { enabled: !!rgAddr && !!owner },
  });
  return { killed: !!data, refetch };
}

// ------------------------------------------------------------ wallet balance

export function useEscrowBalance(account: Address | undefined) {
  const net = useNetwork();
  const client = net.client;
  const [balance, setBalance] = useState<bigint | undefined>(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!client || !account) { requestAnimationFrame(() => setBalance(undefined)); return; }
    let cancelled = false;
    (async () => {
      try {
        const v =
          net.mode === "native" || !net.token.address
            ? await client.getBalance({ address: account })
            : ((await client.readContract({ address: net.token.address, abi: Erc20Abi, functionName: "balanceOf", args: [account] })) as bigint);
        if (!cancelled) setBalance(v);
      } catch {
        if (!cancelled) setBalance(undefined);
      }
    })();
    return () => { cancelled = true; };
  }, [client, account, net.id, net.mode, net.token.address, tick]);
  return { balance, refetch: () => setTick((t) => t + 1) };
}

// ------------------------------------------------------------ mutations

export function useVaultMutations() {
  const net = useNetwork();
  const vaultAddr = net.copyVault as Address;
  const { writeContractAsync: rawWrite, data: hash, isPending } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash, chainId: net.id });
  const { chainId, address: account } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = net.client;
  const [step, setStep] = useState<"idle" | "approving" | "sending">("idle");

  const writeContractAsync = async (opts: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint }) => {
    if (chainId !== net.id) await switchChainAsync({ chainId: net.id });
    const txHash = await rawWrite({ ...opts, chainId: net.id });
    let receipt;
    try {
      receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
    } catch {
      throw new Error(`Transaction ${txHash} was not confirmed on ${net.name} within 90s.`);
    }
    if (receipt.status !== "success") throw new Error(`Transaction reverted: ${txHash}`);
    return txHash;
  };

  const deposit = async (amount: bigint) => {
    try {
      if (net.mode === "erc20") {
        if (!net.token.address) throw new Error(`${net.name} deployment has no token address`);
        if (!account) throw new Error("Connect a wallet first");
        const allowance = (await publicClient.readContract({
          address: net.token.address,
          abi: Erc20Abi,
          functionName: "allowance",
          args: [account, vaultAddr],
        })) as bigint;
        if (allowance < amount) {
          setStep("approving");
          await writeContractAsync({
            address: net.token.address,
            abi: Erc20Abi,
            functionName: "approve",
            args: [vaultAddr, amount],
          });
        }
        setStep("sending");
        return await writeContractAsync({
          address: vaultAddr,
          abi: SiroCopyVaultAbi,
          functionName: "deposit",
          args: [amount],
        });
      }
      setStep("sending");
      return await writeContractAsync({
        address: vaultAddr,
        abi: SiroCopyVaultAbi,
        functionName: "deposit",
        args: [amount],
        value: amount,
      });
    } finally {
      setStep("idle");
    }
  };

  const withdraw = async (amount: bigint) => {
    return await writeContractAsync({
      address: vaultAddr,
      abi: SiroCopyVaultAbi,
      functionName: "withdraw",
      args: [amount],
    });
  };

  const pause = async () => {
    return await writeContractAsync({
      address: vaultAddr,
      abi: SiroCopyVaultAbi,
      functionName: "pause",
    });
  };

  const unpause = async () => {
    return await writeContractAsync({
      address: vaultAddr,
      abi: SiroCopyVaultAbi,
      functionName: "unpause",
    });
  };

  const setLeaders = async (leaders: Address[]) => {
    return await writeContractAsync({
      address: vaultAddr,
      abi: SiroCopyVaultAbi,
      functionName: "setLeaders",
      args: [leaders],
    });
  };

  return { deposit, withdraw, pause, unpause, setLeaders, isPending: isPending || isWaiting || step !== "idle", step, hash };
}

export function useRiskMutations() {
  const net = useNetwork();
  const rgAddr = net.riskGuard as Address;
  const { writeContractAsync: rawWrite, data: hash, isPending } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash, chainId: net.id });
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = net.client;

  const writeContractAsync = async (opts: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint }) => {
    if (chainId !== net.id) await switchChainAsync({ chainId: net.id });
    const txHash = await rawWrite({ ...opts, chainId: net.id });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
    if (receipt.status !== "success") throw new Error(`Transaction reverted: ${txHash}`);
    return txHash;
  };

  const setRiskParams = async (maxTradeSizeBps: number, dailyLossLimitBps: number, maxPositionBps: number, slippageBps: number) => {
    return await writeContractAsync({
      address: rgAddr,
      abi: SiroRiskGuardAbi,
      functionName: "setRiskParams",
      args: [maxTradeSizeBps, dailyLossLimitBps, maxPositionBps, slippageBps],
    });
  };

  const setTokenWhitelist = async (tokens: Address[], allowed: boolean) => {
    return await writeContractAsync({
      address: rgAddr,
      abi: SiroRiskGuardAbi,
      functionName: "setTokenWhitelist",
      args: [tokens, allowed],
    });
  };

  const killSwitch = async () => {
    return await writeContractAsync({
      address: rgAddr,
      abi: SiroRiskGuardAbi,
      functionName: "killSwitch",
    });
  };

  return { setRiskParams, setTokenWhitelist, killSwitch, isPending: isPending || isWaiting, hash };
}



