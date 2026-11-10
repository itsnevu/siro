"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PyrisMark } from "@/components/Header";
import { ConnectButton } from "@/components/ConnectButton";
import { NetworkSwitcher } from "@/lib/network";
import { CHAIN_LIST_TEXT } from "@/lib/chains";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const nav = [
    { label: "Dashboard", href: "/app", active: path === "/app" },
    { label: "Leaderboard", href: "/#leaderboard", active: false },
    { label: "Documentation", href: "/docs", active: path === "/docs" },
  ];
  return (
    <div className="flex-1 bg-bg text-ink">
      <div className="bg-soft text-center text-[12.5px] py-[7px] px-4 text-muted">
        <span className="font-semibold text-ink">Siro Copy Trading is in open beta.</span> AI-powered
        portfolio mirroring on {CHAIN_LIST_TEXT}.
      </div>
      <header className="mx-auto w-full max-w-[1040px] px-5 sm:px-6">
        <div className="flex items-center justify-between h-[88px]">
          <Link href="/" className="flex items-center gap-2.5">
            <PyrisMark />
            <span className="font-serif text-[24px] leading-none tracking-tight text-ink">siro.</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[14px]">
            {nav.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className={`relative py-[33px] ${n.active ? "text-ink font-medium" : "text-muted hover:text-ink"}`}
              >
                {n.label}
                {n.active && <span className="absolute left-0 right-0 bottom-[22px] h-[2px] bg-ink" />}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <NetworkSwitcher className="hidden sm:inline-flex" />
            <ConnectButton />
          </div>
        </div>
        <div className="sm:hidden pb-3">
          <NetworkSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1040px] px-5 sm:px-6 pb-24">{children}</main>
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-5">
      <div className="text-[11px] tracking-[0.12em] uppercase text-muted">{label}</div>
      <div className={`mt-2 font-serif text-[28px] leading-none ${accent ? "text-accent-dark" : "text-ink"}`}>{value}</div>
      {sub && <div className="mt-2 text-[12.5px] text-muted">{sub}</div>}
    </div>
  );
}
