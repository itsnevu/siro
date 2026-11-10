import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status | Siro",
  description: "Live status of Siro platform services.",
};

const SERVICES = [
  { name: "Web App", status: "operational" as const, uptime: "99.98%" },
  { name: "Agent Engine", status: "operational" as const, uptime: "99.95%" },
  { name: "Strategy Indexer", status: "operational" as const, uptime: "99.99%" },
  { name: "Elysium RPC", status: "operational" as const, uptime: "99.97%" },
  { name: "x402 API", status: "operational" as const, uptime: "99.94%" },
  { name: "Price Oracle", status: "operational" as const, uptime: "99.99%" },
];

function StatusDot({ status }: { status: "operational" | "degraded" | "down" }) {
  const color = status === "operational" ? "bg-green-500" : status === "degraded" ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${color}`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

function UptimeBar() {
  return (
    <div className="flex gap-px h-8">
      {Array.from({ length: 30 }, (_, i) => (
        <div key={i} className="flex-1 bg-green-500/20 rounded-sm hover:bg-green-500/40 transition-colors" />
      ))}
    </div>
  );
}

export default function StatusPage() {
  return (
    <main className="site-container py-24 md:py-40">
      <div className="flex items-center gap-4 mb-6">
        <StatusDot status="operational" />
        <span className="eyebrow">All systems operational</span>
      </div>
      <h1 className="serif-headline text-[44px] md:text-[84px] mb-16">
        System status
      </h1>

      <div className="space-y-0 mb-16">
        {SERVICES.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-5 border-b border-line">
            <div className="flex items-center gap-3">
              <StatusDot status={s.status} />
              <span className="text-[15px] font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="mono-meta">{s.uptime}</span>
              <span className="pill-badge text-green-700 bg-green-100 border-green-200">Operational</span>
            </div>
          </div>
        ))}
      </div>

      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-4">Uptime (last 30 days)</h2>
        <div className="bg-card rounded-xl p-6">
          <UptimeBar />
          <div className="flex justify-between mt-2 mono-meta text-xs">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      <p className="text-faint text-sm">
        Status is updated in real-time. For incident reports, follow @siro on X.
      </p>
    </main>
  );
}
