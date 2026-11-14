// English only. The Locale type is kept so formatting helpers have one call shape.
export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "siro_locale";

export function pickLocale(_cookie?: string, _acceptLanguage?: string | null): Locale { return "en"; }

const TAG: Record<Locale, string> = { en: "en-US" };
export const formatNumber = (n: number, locale: Locale, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(TAG[locale], opts).format(n);
export const formatPercent = (fraction: number, locale: Locale, digits = 2) => new Intl.NumberFormat(TAG[locale], { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(fraction);
export const formatUsd = (n: number, locale: Locale) => new Intl.NumberFormat(TAG[locale], { style: "currency", currency: "USD" }).format(n);
export const formatDate = (d: Date | number | string, locale: Locale) => new Intl.DateTimeFormat(TAG[locale], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(d)) + " UTC";

const DICT = {
  en: {
    "disclaimer.title": "Risk disclaimer",
    "disclaimer.body": "Numbers on this page are labelled backtest, paper or live, gross or net, for the dates shown. Past and simulated results do not predict future results. You can lose all of your funds. Siro is not investment advice.",
    "geo.blocked": "Siro is not available in your jurisdiction.",
    "geo.no_stocks": "Tokenized stocks are not available in your jurisdiction.",
    "onboarding.title": "Start with safe defaults",
    "onboarding.lede": "Every new agent starts with these limits. You can tighten them; loosening them is your decision.",
    "default.stop_loss": "Stop loss 8% per position: the engine exits a position when its price falls 8% below the average entry price.",
    "default.max_per_asset": "Maximum 25% per asset: no single asset may exceed a quarter of the vault.",
    "default.universe": "Automatic universe: assets are chosen by the published liquidity rule, not by hand, so results can be compared fairly.",
    "default.capital": "$10,000 virtual capital: the agent runs in paper mode first. No real funds move.",
    "onboarding.next": "Next",
    "onboarding.back": "Back",
    "onboarding.start": "Open the dashboard",
  },
} as const;
export type MessageKey = keyof (typeof DICT)["en"];
export const t = (locale: Locale, key: MessageKey): string => DICT[locale][key] ?? DICT.en[key];

/** Safe onboarding defaults (phase 18). Engine fields: stop_loss_pct, max_weight; capital in USD. */
export const SAFE_DEFAULTS = { stop_loss_pct: 0.08, max_weight: 0.25, universe: "auto", initial_usd: 10_000, mode: "paper" } as const;

export const nav = (_locale: Locale, english: string): string => english;
