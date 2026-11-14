"use client";
import { useState } from "react";
import { PerformanceTable } from "./PerformanceTable";
import type { TradingAgent } from "@/lib/trading-report";
export function Leaderboard({ agents }: { agents: TradingAgent[] }) {
  const [asset, setAsset] = useState(""); const [risk, setRisk] = useState(""); const [regime, setRegime] = useState(""); const [capital, setCapital] = useState("");
  const fields = [{ label: "Asset class", key: "asset_class", value: asset, set: setAsset }, { label: "Risk profile", key: "risk_profile", value: risk, set: setRisk }, { label: "Regime", key: "regime", value: regime, set: setRegime }] as const;
  const filtered = agents.filter(a => (!asset || a.asset_class === asset) && (!risk || a.risk_profile === risk) && (!regime || a.regime === regime) && (!capital || (capital === "small" ? a.capital_usd < 10000 : capital === "medium" ? a.capital_usd >= 10000 && a.capital_usd < 100000 : a.capital_usd >= 100000))).sort((a,b) => b.metrics.net_return-a.metrics.net_return);
  return <><div className="flex flex-wrap gap-4 my-6">{fields.map(f => <label key={f.key}>{f.label}<select className="block border rounded p-2" value={f.value} onChange={e => f.set(e.target.value)}><option value="">All</option>{[...new Set(agents.map(a => a[f.key]))].map(v => <option key={v}>{v}</option>)}</select></label>)}<label>Capital<select className="block border rounded p-2" value={capital} onChange={e => setCapital(e.target.value)}><option value="">All</option><option value="small">Below $10,000</option><option value="medium">$10,000–$100,000</option><option value="large">$100,000 and above</option></select></label></div><PerformanceTable agents={filtered} /></>;
}
