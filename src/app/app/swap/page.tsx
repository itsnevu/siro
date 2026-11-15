import { AppShell } from "@/components/app/AppShell";
import { SwapCard } from "@/components/swap/SwapCard";
import { PaperBadge } from "@/components/PaperBadge";
import { resolveVault } from "@/lib/server/vault-info";
import { SWAP, STRATEGY_MODE } from "@/lib/config/swap";
import { shortAddress } from "@/lib/swap/format";
import "@/styles/swap.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deposit | Siro" };

export default async function SwapPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const raw = (await searchParams).vault;
  const { vault, note } = await resolveVault(typeof raw === "string" ? raw : undefined);
  return (
    <AppShell>
      <div className="siro-swap" style={{ minHeight: "auto" }}>
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
