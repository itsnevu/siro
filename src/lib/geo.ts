// Phase 18 geo-gating decision. Pure; the proxy supplies the country from CDN headers.
import rules from "../../config/jurisdictions.json" with { type: "json" };

export type GeoDecision = { action: "block" | "no_stocks" | "allow"; country: string | null; reason: string };

export function decideGeo(country: string | null | undefined, region?: string | null): GeoDecision {
  const c = country?.trim().toUpperCase() || null;
  if (!c || c === "XX" || c === "T1") return { action: "allow", country: null, reason: "country unknown (no CDN header); allowed and flagged" };
  if (rules.blocked.countries.includes(c)) return { action: "block", country: c, reason: rules.blocked.reason };
  const r = region?.trim().toUpperCase();
  if (r && rules.blocked.regions.some(x => x.country === c && x.regions.includes(r))) return { action: "block", country: c, reason: rules.blocked.reason };
  if ((rules.no_tokenized_stocks.countries as string[]).includes(c)) return { action: "no_stocks", country: c, reason: rules.no_tokenized_stocks.reason };
  return { action: "allow", country: c, reason: "not restricted by the baseline list" };
}

/** Paths that trade or show tokenized-stock prices; hidden for no_stocks jurisdictions. */
export const STOCK_PATHS = [/^\/markets(\/|$)/, /^\/app(\/|$)/, /^\/api\/robinhood(\/|$)/, /^\/api\/trading(\/|$)/];
