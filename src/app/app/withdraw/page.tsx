import { AppShell } from "@/components/app/AppShell";
import { WithdrawCard } from "@/components/withdraw/WithdrawCard";
import { resolveVault } from "@/lib/server/vault-info";
import { shortAddress } from "@/lib/swap/format";
import "@/styles/swap.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Withdraw | Siro" };

/** ?vault=0x… must pass factory.isVault(); otherwise the agent vault is used. */
export default async function WithdrawPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const raw = (await searchParams).vault;
  const { vault, note } = await resolveVault(typeof raw === "string" ? raw : undefined);
  return (
    <AppShell>
      <div className="siro-swap">
        <div className="swap-wrap">
          {note && <div className="mode-banner" role="status">{note}</div>}
          {vault ? <WithdrawCard vault={vault} /> : <div className="swap-card" role="alert">Withdrawals are unavailable right now. Your shares stay safe in the vault.</div>}
          {vault && <p className="muted num" style={{ fontSize: 12, margin: 0 }}>Vault {shortAddress(vault.address)} · asset {vault.assetSymbol}</p>}
        </div>
      </div>
    </AppShell>
  );
}
