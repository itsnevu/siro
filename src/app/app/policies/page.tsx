"use client";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { useNetwork } from "@/lib/network";

export default function PoliciesPage() {
  const net = useNetwork();
  return <AppShell><section className="py-10 space-y-4"><h1 className="font-serif text-3xl">Vault policies</h1><p className="text-sm text-fg-70">Select a GuardedVault in the dashboard to view its current policy, queue changes, activate a queued policy after its timelock, or pause trading. Only its onchain owner can queue policy changes.</p><Link className="underline" href={`${net.link("/app")}#policy`}>Open vault dashboard</Link></section></AppShell>;
}
