import { Inter, JetBrains_Mono } from "next/font/google";
import { getAddress, isAddress, type Address } from "viem";
import { AppShell } from "@/components/app/AppShell";
import { SwapCard, type VaultInfo } from "@/components/swap/SwapCard";
import { PaperBadge } from "@/components/PaperBadge";
import { serverClient } from "@/lib/server/rpc";
import { SWAP, SWAP_CHAIN_ID, STRATEGY_MODE } from "@/lib/config/swap";
import { VAULT_ASSETS } from "@/lib/config/tokens";
import { guardedVaultAbi } from "@/lib/swap/abis";
import { shortAddress } from "@/lib/swap/format";
import "@/styles/swap.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deposit | Siro" };

const ui = Inter({ subsets: ["latin"], variable: "--font-swap-ui", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-swap-mono", display: "swap" });
const factoryAbi = [{ type: "function", name: "isVault", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] }] as const;

/** ?vault=0x… must pass factory.isVault(); otherwise the single agent vault is used (no picker by design). */
async function resolveVault(param: string | undefined): Promise<{ vault: VaultInfo | null; note: string | null }> {
  const client = serverClient(SWAP_CHAIN_ID);
  let address: Address = SWAP.defaultVault;
  let note: string | null = null;
  if (param) {
    if (isAddress(param, { strict: false })) {
      const candidate = getAddress(param);
      const ok = await client.readContract({ address: SWAP.guardedVaultFactory, abi: factoryAbi, functionName: "isVault", args: [candidate] }).catch(() => false);
      if (ok) address = candidate; else note = `${shortAddress(candidate)} is not a SIRO vault. Showing the agent vault instead.`;
    } else note = "That vault address is not valid. Showing the agent vault instead.";
  }
  try {
    const [asset, name, decimals] = await Promise.all([
      client.readContract({ address, abi: guardedVaultAbi, functionName: "asset" }),
      client.readContract({ address, abi: guardedVaultAbi, functionName: "name" }),
      client.readContract({ address, abi: guardedVaultAbi, functionName: "decimals" }),
    ]);
    const meta = VAULT_ASSETS[asset.toLowerCase()];
    if (!meta) return { vault: null, note: "This vault's deposit asset is not supported by the swap page yet." };
    return { vault: { address, asset, assetSymbol: meta.symbol, assetDecimals: meta.decimals, shareDecimals: decimals, name }, note };
  } catch {
    return { vault: null, note: "Robinhood Chain did not answer. Refresh in a moment." };
  }
}

export default async function SwapPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const raw = (await searchParams).vault;
  const { vault, note } = await resolveVault(typeof raw === "string" ? raw : undefined);
  return (
    <AppShell>
      <div className={`siro-swap ${ui.variable} ${mono.variable}`} style={{ minHeight: "auto" }}>
        <div className="swap-wrap">
          <div className="mode-banner" role="note" aria-label="Execution modes">
            <PaperBadge /> <b>Strategy: {STRATEGY_MODE} mode.</b> The agent decides on real prices and real fees but sends no real orders until its strategy passes walk-forward validation.
            <br /><b>This swap is real:</b> it spends your tokens on Robinhood Chain and deposits the result into the vault.
          </div>
          {note && <div className="mode-banner" role="status" style={{ borderColor: "var(--border)" }}>{note}</div>}
          {vault ? <SwapCard vault={vault} /> : <div className="swap-card" role="alert">The swap is unavailable right now.</div>}
          {vault && <p className="muted num" style={{ fontSize: 12, margin: 0 }}>Vault {shortAddress(vault.address)} · asset {vault.assetSymbol} · via SiroZap {shortAddress(SWAP.siroZap)}</p>}
        </div>
      </div>
    </AppShell>
  );
}
