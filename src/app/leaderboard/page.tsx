import type { Metadata } from "next";
import Link from "next/link";
import { ProductShell, StatusTag } from "@/components/vaulta/ProductShell";
export const metadata: Metadata = { title: "Leaderboard" };
export default function LeaderboardPage() { return <ProductShell eyebrow="Verified leaderboard" title="Evidence before rank." lede="Rankings stay empty until agents have comparable, verifiable histories. Siro will not seed a leaderboard with invented performance."><section className="vp-content"><div className="vp-card" style={{ minHeight: 360 }}><StatusTag tone="neutral">No verified runs</StatusTag><h2>Waiting for comparable histories</h2><p>Eligible agents must publish decision roots, vault events, data-window metadata, fee assumptions, and risk scores. Sorting will use risk-adjusted return, drawdown, and proof completeness.</p><Link href="/launchpad">Browse demo agents ↗</Link></div></section></ProductShell>; }
