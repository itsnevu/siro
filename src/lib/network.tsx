"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http } from "viem";
import { CHAINS, DEFAULT_CHAIN_ID, getChain, type ChainConfig } from "./chains";
import { fmtUnits } from "./contracts";

type NetworkValue = ChainConfig & {
  client: ReturnType<typeof createPublicClient>;
  decimals: number;
  symbol: string;
  fmt: (v: bigint | undefined, digits?: number) => string;
  select: (chainId: number) => void;
  link: (path: string) => string;
};

const KEY = "siro:chain";
const clients = new Map<number, ReturnType<typeof createPublicClient>>();
function clientFor(cfg: ChainConfig) {
  let c = clients.get(cfg.id);
  if (!c) {
    c = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpcUrl) });
    clients.set(cfg.id, c);
  }
  return c;
}
const Ctx = createContext<NetworkValue | null>(null);

function readInitial(): number {
  if (typeof window === "undefined") return DEFAULT_CHAIN_ID;
  const fromUrl = Number(new URLSearchParams(window.location.search).get("chain"));
  if (getChain(fromUrl)) return fromUrl;
  try {
    const saved = Number(window.localStorage.getItem(KEY));
    if (getChain(saved)) return saved;
  } catch {}
  return DEFAULT_CHAIN_ID;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<number>(DEFAULT_CHAIN_ID);
  const [touched, setTouched] = useState(false);
  const { chainId: walletChainId } = useAccount();

  useEffect(() => {
    const initial = readInitial();
    const explicit =
      getChain(Number(new URLSearchParams(window.location.search).get("chain"))) !== undefined ||
      (() => { try { return getChain(Number(window.localStorage.getItem(KEY))) !== undefined; } catch { return false; } })();
    requestAnimationFrame(() => { setChainId(initial); setTouched(explicit); });
  }, []);

  useEffect(() => {
    if (touched || !walletChainId || !getChain(walletChainId)) return;
    requestAnimationFrame(() => setChainId(walletChainId));
  }, [walletChainId, touched]);

  const select = useCallback((id: number) => {
    if (!getChain(id)) return;
    setChainId(id);
    setTouched(true);
    try { window.localStorage.setItem(KEY, String(id)); } catch {}
    const url = new URL(window.location.href);
    if (id === DEFAULT_CHAIN_ID) url.searchParams.delete("chain"); else url.searchParams.set("chain", String(id));
    window.history.replaceState(null, "", url.toString());
  }, []);

  const value = useMemo<NetworkValue>(() => {
    const cfg = getChain(chainId) ?? CHAINS[0];
    const decimals = cfg.token.decimals;
    return {
      ...cfg,
      client: clientFor(cfg),
      decimals,
      symbol: cfg.token.symbol,
      fmt: (v, d = 2) => fmtUnits(v, decimals, d),
      select,
      link: (path) => (cfg.id === DEFAULT_CHAIN_ID ? path : `${path}${path.includes("?") ? "&" : "?"}chain=${cfg.id}`),
    };
  }, [chainId, select]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNetwork(): NetworkValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNetwork must be used inside <NetworkProvider>");
  return v;
}

export function NetworkSwitcher({ className = "" }: { className?: string }) {
  const net = useNetwork();
  if (CHAINS.length < 2) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 h-9 text-[13px] text-ink ${className}`}>
        <span className="inline-block size-2 rounded-full bg-accent" />
        {net.name}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-pill border border-line bg-surface p-[3px] text-[12.5px] ${className}`} role="group" aria-label="Network">
      {CHAINS.map((c) => {
        const active = c.id === net.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => net.select(c.id)}
            aria-pressed={active}
            title={`${c.name} · vault in ${c.token.symbol}, gas in ${c.gasSymbol}`}
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 h-7 transition-colors ${
              active ? "bg-ink text-surface" : "text-fg-70 hover:text-ink"
            }`}
          >
            <span className={`inline-block size-1.5 rounded-full ${active ? "bg-accent" : "bg-line"}`} />
            {c.short}
          </button>
        );
      })}
    </span>
  );
}
