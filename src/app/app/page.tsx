"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { AppShell, Stat } from "@/components/app/AppShell";
import { AddressLink } from "@/components/app/Explorer";
import {
  useVault,
  useVaultMutations,
  useRiskParams,
  useIsKilled,
  useEscrowBalance,
  useMounted,
} from "@/lib/hooks";
import { useNetwork } from "@/lib/network";
import { truncateAddress, fmtBps, fmtPnl } from "@/lib/contracts";

const SAMPLE_TRADES = [
  { time: "2 min ago", leader: "AlphaVault", pair: "USDC → ETH", amount: "$250", status: "Executed" },
  { time: "18 min ago", leader: "DeFiWhale", pair: "ETH → USDC", amount: "$1,200", status: "Executed" },
  { time: "1 hr ago", leader: "SteadyEdge", pair: "USDC → WBTC", amount: "$500", status: "Skipped (slippage)" },
  { time: "3 hrs ago", leader: "AlphaVault", pair: "USDC → SOL", amount: "$180", status: "Executed" },
];

function errorText(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied/i.test(msg)) return "Transaction cancelled in wallet.";
  return fallback;
}

export default function DashboardPage() {
  return (
    <AppShell>
      <VaultDashboard />
    </AppShell>
  );
}

function VaultDashboard() {
  const { address: connected } = useAccount();
  const net = useNetwork();
  const sym = net.symbol;
  useMounted();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const ok = (msg: string) => { setIsError(false); setFeedback(msg); };
  const fail = (e: unknown, msg: string) => { console.error(e); setIsError(true); setFeedback(errorText(e, msg)); };

  const { vault, refetch: refetchVault } = useVault(connected);
  const { params } = useRiskParams(connected);
  const { killed } = useIsKilled(connected);
  const { balance: walletBalance } = useEscrowBalance(connected);
  const { deposit, withdraw, pause, unpause, isPending, step } = useVaultMutations();

  const vaultBalance = vault?.balance ?? 0n;
  const hwm = vault?.highWaterMark ?? 0n;
  const pnl = vaultBalance > 0n && hwm > 0n ? Number((vaultBalance - hwm) * 10000n / hwm) : 0;
  const leaderCount = vault?.leaderCount ?? 0;

  const handleDeposit = async () => {
    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    try {
      await deposit(parseUnits(depositAmount, net.decimals));
      ok(`Deposited ${depositAmount} ${sym} into your vault.`);
      setShowDeposit(false);
      setDepositAmount("");
      refetchVault();
    } catch (e) { fail(e, "Deposit failed"); }
  };

  const handleWithdraw = async () => {
    const parsed = parseFloat(withdrawAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    try {
      await withdraw(parseUnits(withdrawAmount, net.decimals));
      ok(`Withdrew ${withdrawAmount} ${sym} from your vault.`);
      setShowWithdraw(false);
      setWithdrawAmount("");
      refetchVault();
    } catch (e) { fail(e, "Withdraw failed"); }
  };

  const handlePause = async () => {
    try {
      if (vault?.isPaused) { await unpause(); ok("Vault resumed."); }
      else { await pause(); ok("Vault paused. No trades will be copied."); }
      refetchVault();
    } catch (e) { fail(e, "Failed to toggle pause"); }
  };

  return (
    <>
      <section className="pt-[44px]">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-serif text-[40px] leading-[1.05] text-ink">Copy Vault</h1>
            <p className="mt-3 max-w-[640px] text-[14px] leading-[1.65] text-fg-70">
              AI-powered portfolio mirroring on {net.name}. Deposit {sym}, follow top traders,
              and let the agent copy trades within your risk limits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {connected && (
              <span className="text-[12.5px] text-fg-70">
                <span className="font-mono text-ink">{truncateAddress(connected)}</span>
              </span>
            )}
            <button
              onClick={() => setShowDeposit(true)}
              disabled={!net.copyVault}
              className="inline-flex items-center justify-center rounded-pill bg-ink text-surface text-[13px] font-semibold px-5 h-10 hover:bg-fg transition-all shadow-sm disabled:opacity-50"
            >
              + Deposit
            </button>
          </div>
        </div>
      </section>

      {!net.copyVault && (
        <div role="status" className="mt-6 p-4 rounded-[8px] border bg-surface-2 border-line text-fg-70 text-[13.5px]">
          Siro Copy Vault is not deployed on {net.name} yet. Switch network or check back soon.
        </div>
      )}

      {feedback && (
        <div role="status" className={`mt-6 p-4 rounded-[8px] border text-[13.5px] flex justify-between items-center ${isError ? "bg-danger border-danger text-danger" : "bg-surface-2 border-line text-fg-70"}`}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="font-bold hover:underline">✕</button>
        </div>
      )}

      {/* Stats */}
      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Vault Balance" value={`$${net.fmt(vaultBalance)}`} sub={`Deposited in ${sym}`} accent />
        <Stat label="PnL" value={fmtPnl(pnl)} sub={`High-water mark: $${net.fmt(hwm)}`} />
        <Stat label="Leaders Followed" value={String(leaderCount)} sub="Up to 5 leaders" />
        <Stat
          label="Status"
          value={killed ? "Killed" : vault?.isPaused ? "Paused" : "Active"}
          sub={killed ? "Emergency kill switch active" : vault?.isPaused ? "No trades being copied" : "Copying trades automatically"}
        />
      </section>

      {/* Action buttons */}
      <section className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setShowDeposit(true)} disabled={!net.copyVault || isPending} className="px-4 h-10 rounded-pill bg-ink text-surface text-[13px] font-semibold hover:bg-fg transition-colors disabled:opacity-50">
          Deposit {sym}
        </button>
        <button onClick={() => setShowWithdraw(true)} disabled={!net.copyVault || isPending} className="px-4 h-10 rounded-pill border border-line text-[13px] font-medium text-ink hover:bg-soft transition-colors disabled:opacity-50">
          Withdraw
        </button>
        <button onClick={handlePause} disabled={!net.copyVault || isPending} className={`px-4 h-10 rounded-pill border text-[13px] font-medium transition-colors disabled:opacity-50 ${vault?.isPaused ? "border-line text-fg-70 hover:bg-surface-2" : "border-line text-fg-70 hover:bg-surface-2"}`}>
          {vault?.isPaused ? "Resume Vault" : "Pause Vault"}
        </button>
      </section>

      {/* Risk Parameters */}
      <section className="mt-12">
        <h2 className="font-serif text-[24px] text-ink mb-4">Risk Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-[12px] border border-line bg-surface p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase text-fg-70">Max Trade Size</div>
            <div className="mt-2 text-[20px] font-semibold text-ink">{fmtBps(params.maxTradeSizeBps)}</div>
            <div className="mt-1 text-[12px] text-fg-70">of vault per trade</div>
          </div>
          <div className="rounded-[12px] border border-line bg-surface p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase text-fg-70">Daily Loss Limit</div>
            <div className="mt-2 text-[20px] font-semibold text-ink">{fmtBps(params.dailyLossLimitBps)}</div>
            <div className="mt-1 text-[12px] text-fg-70">max daily drawdown</div>
          </div>
          <div className="rounded-[12px] border border-line bg-surface p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase text-fg-70">Max Position</div>
            <div className="mt-2 text-[20px] font-semibold text-ink">{fmtBps(params.maxPositionBps)}</div>
            <div className="mt-1 text-[12px] text-fg-70">per token</div>
          </div>
          <div className="rounded-[12px] border border-line bg-surface p-5">
            <div className="text-[11px] tracking-[0.12em] uppercase text-fg-70">Slippage Tolerance</div>
            <div className="mt-2 text-[20px] font-semibold text-ink">{fmtBps(params.slippageBps)}</div>
            <div className="mt-1 text-[12px] text-fg-70">max slippage per swap</div>
          </div>
        </div>
      </section>

      {/* Leaders Followed */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-[24px] text-ink">Leaders You Follow</h2>
          <span className="text-[12px] text-fg-70">{leaderCount}/5 slots used</span>
        </div>
        {leaderCount === 0 ? (
          <div className="py-12 text-center text-fg-70 text-[14px] border border-dashed border-line rounded-[12px]">
            You are not following any leaders yet. Browse the{" "}
            <Link href="/#leaderboard" className="text-ink font-semibold underline">leaderboard</Link>{" "}
            to find top performers.
          </div>
        ) : (
          <div className="divide-y divide-line border border-line rounded-[12px] overflow-hidden">
            {(vault?.leaders ?? []).map((addr, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 bg-surface">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-soft text-[12px] font-bold text-ink">
                    {i + 1}
                  </span>
                  <AddressLink address={addr} className="text-[14px] font-semibold" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Trades */}
      <section className="mt-12">
        <h2 className="font-serif text-[24px] text-ink mb-4">Recent Copied Trades</h2>
        <div className="border border-line rounded-[12px] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] text-fg-70 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Time</th>
                <th className="text-left px-3 py-3 font-medium">Leader</th>
                <th className="text-left px-3 py-3 font-medium">Pair</th>
                <th className="text-right px-3 py-3 font-medium">Amount</th>
                <th className="text-right px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SAMPLE_TRADES.map((t, i) => (
                <tr key={i} className="bg-surface">
                  <td className="px-5 py-3 text-fg-70">{t.time}</td>
                  <td className="px-3 py-3 font-semibold text-ink">{t.leader}</td>
                  <td className="px-3 py-3 font-mono text-ink">{t.pair}</td>
                  <td className="px-3 py-3 text-right font-mono text-ink">{t.amount}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-pill text-[11px] font-semibold ${
                      t.status === "Executed"
                        ? "bg-surface-2 text-fg-70 border border-line"
                        : "bg-surface-2 text-fg-70 border border-line"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-fg-70 text-center">
          Showing sample trades. Live trade history will appear once the vault is active on {net.name}.
        </p>
      </section>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[440px] rounded-[16px] bg-surface p-6 sm:p-8 shadow-2xl border border-line">
            <div className="flex justify-between items-center pb-4 border-b border-line">
              <h2 className="font-serif text-[22px] text-ink">Deposit {sym}</h2>
              <button onClick={() => setShowDeposit(false)} className="text-fg-70 hover:text-ink text-[18px] font-bold">✕</button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-fg-70 mb-1">Amount ({sym})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="1000"
                  value={depositAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] border border-line bg-bg font-mono text-[14px] text-ink focus:outline-none focus:border-ink"
                />
                {walletBalance !== undefined && (
                  <p className="text-[12px] text-fg-70 mt-1">Wallet balance: ${net.fmt(walletBalance)} {sym}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <button onClick={() => setShowDeposit(false)} className="px-5 h-11 rounded-pill border border-line text-[13px] font-medium text-fg-70 hover:text-ink">Cancel</button>
                <button onClick={handleDeposit} disabled={isPending} className="px-6 h-11 rounded-pill bg-ink text-surface text-[13.5px] font-semibold hover:bg-fg transition-colors disabled:opacity-50">
                  {step === "approving" ? `Approving ${sym}…` : isPending ? "Depositing…" : `Deposit ${sym}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[440px] rounded-[16px] bg-surface p-6 sm:p-8 shadow-2xl border border-line">
            <div className="flex justify-between items-center pb-4 border-b border-line">
              <h2 className="font-serif text-[22px] text-ink">Withdraw {sym}</h2>
              <button onClick={() => setShowWithdraw(false)} className="text-fg-70 hover:text-ink text-[18px] font-bold">✕</button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-fg-70 mb-1">Amount ({sym})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="500"
                  value={withdrawAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] border border-line bg-bg font-mono text-[14px] text-ink focus:outline-none focus:border-ink"
                />
                <p className="text-[12px] text-fg-70 mt-1">Vault balance: ${net.fmt(vaultBalance)} {sym}</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <button onClick={() => setShowWithdraw(false)} className="px-5 h-11 rounded-pill border border-line text-[13px] font-medium text-fg-70 hover:text-ink">Cancel</button>
                <button onClick={handleWithdraw} disabled={isPending} className="px-6 h-11 rounded-pill bg-ink text-surface text-[13.5px] font-semibold hover:bg-fg transition-colors disabled:opacity-50">
                  {isPending ? "Withdrawing…" : `Withdraw ${sym}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
