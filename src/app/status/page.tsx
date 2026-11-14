import type { Metadata } from "next";
export const metadata: Metadata = { title: "Status | Siro", description: "Service readiness. Automated uptime monitoring is not connected." };
const services = [
  ["Web app", "Development preview"],
  ["GuardedVault contracts", "Deployment pending"],
  ["DEX adapter", "Router and pool selection pending"],
  ["Keeper / agent engine", "Not connected"],
  ["Strategy indexer", "Not connected"],
  ["RPC / market prices", "Availability not monitored"],
];
export default function StatusPage() {
  return <main className="site-container py-24"><p className="eyebrow">Development readiness</p><h1 className="serif-headline text-5xl mb-8">System status</h1><p className="mb-6 text-fg-70">No automated health checks or uptime history are connected. This page does not report live operational status.</p><dl>{services.map(([name, status]) => <div key={name} className="flex flex-wrap justify-between gap-3 border-b border-line py-4"><dt>{name}</dt><dd className="text-fg-70">{status}</dd></div>)}</dl></main>;
}
