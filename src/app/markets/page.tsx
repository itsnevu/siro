import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";
import { formatUnits } from "viem";
import { getLiveMarkets, type LiveMarket } from "@/lib/robinhood";
import { getLatestBlock, getTokenSupplies, type TokenSupply } from "@/lib/robinhood-chain";
import { getChainlinkStockPrices, type FeedPrice } from "@/lib/chainlink-feeds";

export const metadata: Metadata = {
  title: "Markets  Siro",
  description: "Live Robinhood Stock Token prices on Robinhood Chain.",
};

export const revalidate = 15;

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (n: number) => n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
const supplyText = (s: TokenSupply | undefined) => (s ? compact(Number(formatUnits(s.totalSupply, s.decimals))) : "-");
const cell = { padding: "12px 8px" } as const;
const right = { ...cell, textAlign: "right" } as const;

export default async function MarketsPage() {
  const [marketsResult, block] = await Promise.all([
    getLiveMarkets().then((m) => ({ ok: true as const, m }), () => ({ ok: false as const, m: [] as LiveMarket[] })),
    getLatestBlock(),
  ]);
  const markets = marketsResult.m;
  const failed = !marketsResult.ok;
  const [supplies, oracle] = await Promise.all([
    getTokenSupplies(markets.map((m) => m.address)),
    failed ? getChainlinkStockPrices().catch(() => [] as FeedPrice[]) : Promise.resolve([] as FeedPrice[]),
  ]);
  const updatedAt = markets[0]?.updatedAt;

  return (
    <ProsePage wide
      eyebrow="Markets"
      title="Tokenized Stocks"
      lede="Robinhood Stock Tokens live on Robinhood Chain, priced from Robinhood's Stock Token API and Chainlink's onchain feeds."
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "var(--surface)", borderRadius: 999, fontSize: 13, marginBottom: 24 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: failed && !oracle.length ? "var(--brand-pink)" : "var(--accent-mint)", display: "inline-block" }} />
        {failed
          ? oracle.length
            ? `Live onchain · ${oracle.length} Chainlink feeds`
            : "Live prices unavailable right now"
          : `Live ·${markets.length} tokens · updated ${updatedAt ? new Date(updatedAt).toUTCString().slice(17, 25) + " UTC" : "now"}`}
      </div>{" "}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "var(--surface)", borderRadius: 999, fontSize: 13, marginBottom: 24 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: block === null ? "var(--brand-pink)" : "var(--accent-mint)", display: "inline-block" }} />
        {block === null ? "Robinhood Chain RPC unreachable" : `Robinhood Chain · block ${block.toLocaleString("en-US")}`}
      </div>

      {failed && oracle.length ? (
        <>
          <div className="markets-table" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  <th style={cell}>Ticker</th>
                  <th style={cell}>Name</th>
                  <th style={right}>Price</th>
                  <th style={right}>Last update</th>
                  <th style={cell}>Feed</th>
                </tr>
              </thead>
              <tbody>
                {oracle.map((p) => (
                  <tr key={p.feed} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ ...cell, fontWeight: 700, fontFamily: "monospace" }}>{p.symbol}</td>
                    <td style={{ ...cell, color: "var(--fg-70)" }}>{p.name}</td>
                    <td style={{ ...right, fontWeight: 600 }}>{usd(p.price)}</td>
                    <td style={{ ...right, whiteSpace: "nowrap", color: p.stale ? "var(--brand-pink)" : "var(--fg-70)" }}>
                      {new Date(p.updatedAt).toUTCString().slice(17, 22)} UTC{p.stale ? " · closed" : ""}
                    </td>
                    <td style={cell}>
                      <a href={`https://robinhoodchain.blockscout.com/address/${p.feed}`} target="_blank" rel="noreferrer" style={{ color: "var(--fg-70)", fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                        {p.feed.slice(0, 6)}…{p.feed.slice(-4)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--fg-70)" }}>
            The Robinhood Stock Token API is unreachable from this server, so prices are read directly from the official Chainlink feeds on Robinhood Chain.
            Each price is the per-token value including corporate-action adjustments.
          </p>
        </>
      ) : failed ? (
        <p style={{ color: "var(--fg-70)" }}>
          The Robinhood Stock Token API did not respond. No prices are shown rather than stale or invented ones. Refresh in a moment.
        </p>
      ) : (
        <div className="markets-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                <th style={cell}>Ticker</th>
                <th style={cell}>Name</th>
                <th style={right}>Price</th>
                <th style={right}>Day range</th>
                <th style={right}>Equity volume</th>
                <th style={right}>Onchain mint/burn</th>
                <th style={right}>Token supply</th>
                <th style={cell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.address} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={cell}>
                    <Link href={`/markets/${m.symbol}`} style={{ color: "var(--fg)", fontWeight: 700, textDecoration: "none", fontFamily: "monospace" }}>
                      {m.symbol}
                    </Link>
                  </td>
                  <td style={{ ...cell, color: "var(--fg-70)" }}>{m.name}</td>
                  <td style={{ ...right, fontWeight: 600 }}>{usd(m.price)}</td>
                  <td style={right}>{m.dailyLow !== null && m.dailyHigh !== null ? `${usd(m.dailyLow)} - ${usd(m.dailyHigh)}` : "-"}</td>
                  <td style={right}>{m.volume ? compact(m.volume) : "-"}</td>
                  <td style={right}>{m.onchainVolumeUsd ? `$${compact(m.onchainVolumeUsd)}` : "-"}</td>
                  <td style={right}>{supplyText(supplies.get(m.address))}</td>
                  <td style={cell}>
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, background: "var(--surface)", color: m.halted ? "var(--brand-pink)" : "var(--accent-mint)" }}>
                      {m.halted ? "Halted" : "Trading"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 13, color: "var(--fg-70)" }}>
        Source: api.robinhood.com/rhj, refreshed every 15 seconds. Price is the token bid/ask midpoint, adjusted for corporate actions.
        Equity volume is the underlying stock&apos;s daily share volume; onchain mint/burn is today&apos;s token issuance and redemption in USD.
        Siro is software, not investment advice.
      </p>
    </ProsePage>
  );
}
