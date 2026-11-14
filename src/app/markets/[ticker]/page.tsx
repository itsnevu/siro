import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProsePage, Note } from "@/components/ProsePage";
import { getLiveMarkets, ROBINHOOD_CHAIN, type LiveMarket } from "@/lib/robinhood";

type Props = { params: Promise<{ ticker: string }> };

export const revalidate = 15;

async function findMarket(ticker: string): Promise<LiveMarket | null | "unavailable"> {
  try {
    return (await getLiveMarkets()).find((m) => m.symbol === ticker.toUpperCase()) ?? null;
  } catch {
    return "unavailable";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()}  Siro`, description: `Live ${ticker.toUpperCase()} Stock Token price on Robinhood Chain.` };
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (n: number) => n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });

export default async function AssetDetailPage({ params }: Props) {
  const { ticker } = await params;
  const m = await findMarket(ticker);

  if (m === "unavailable") {
    return (
      <ProsePage wide eyebrow={ticker.toUpperCase()} title={ticker.toUpperCase()} lede="Live prices are unavailable right now.">
        <p style={{ color: "var(--fg-70)" }}>The Robinhood Stock Token API did not respond. Nothing is shown rather than stale or invented data.</p>
      </ProsePage>
    );
  }
  if (!m) notFound();

  const stats = [
    { label: "Day range", value: m.dailyLow !== null && m.dailyHigh !== null ? `${usd(m.dailyLow)} - ${usd(m.dailyHigh)}` : "-" },
    { label: "Equity volume", value: m.volume ? compact(m.volume) : "-" },
    { label: "Onchain mint/burn", value: m.onchainVolumeUsd ? `$${compact(m.onchainVolumeUsd)}` : "-" },
    { label: "Status", value: m.halted ? "Trading halted" : "Trading" },
  ];

  return (
    <ProsePage eyebrow={m.symbol} title={m.name} lede={`${m.name} Stock Token on Robinhood Chain.`} meta={[`Updated ${new Date(m.updatedAt).toUTCString()}`]}>
      <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 32 }}>{usd(m.price)}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: 16, background: "var(--surface)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-70)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 14 }}>
        Contract:{" "}
        <a href={`${ROBINHOOD_CHAIN.explorer}/token/${m.address}`} target="_blank" rel="noreferrer" style={{ color: "var(--fg)", fontFamily: "monospace" }}>
          {m.address}
        </a>
      </p>

      <Note>
        Source: Robinhood Stock Token API, refreshed every 15 seconds. Price is the token bid/ask midpoint. Siro is software, not investment advice.
      </Note>
    </ProsePage>
  );
}
