// Phase 18 i18n: Indonesian and English. Locale from the siro_locale cookie, else Accept-Language.
// Numbers and dates are formatted per locale with Intl.
export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "siro_locale";

export function pickLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie as Locale;
  const tags = (acceptLanguage ?? "").split(",").map(t => t.split(";")[0].trim().toLowerCase());
  for (const t of tags) if (t === "id" || t.startsWith("id-") || t === "in") return "id";
  return "en";
}

const TAG: Record<Locale, string> = { en: "en-US", id: "id-ID" };
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
    "locale.switch": "Bahasa Indonesia",
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
  id: {
    "disclaimer.title": "Peringatan risiko",
    "disclaimer.body": "Angka di halaman ini berlabel backtest, paper, atau live, bruto atau net, untuk tanggal yang tertera. Hasil masa lalu dan simulasi tidak memprediksi hasil masa depan. Kamu bisa kehilangan seluruh dana. Siro bukan nasihat investasi.",
    "geo.blocked": "Siro tidak tersedia di yurisdiksimu.",
    "geo.no_stocks": "Saham tokenized tidak tersedia di yurisdiksimu.",
    "locale.switch": "English",
    "onboarding.title": "Mulai dengan default aman",
    "onboarding.lede": "Setiap agent baru dimulai dengan batas ini. Kamu boleh memperketat; melonggarkannya adalah keputusanmu.",
    "default.stop_loss": "Stop loss 8% per posisi: engine keluar dari posisi saat harga turun 8% di bawah rata-rata harga masuk.",
    "default.max_per_asset": "Maksimal 25% per aset: tidak ada satu aset pun yang boleh melebihi seperempat vault.",
    "default.universe": "Universe otomatis: aset dipilih oleh aturan likuiditas yang dipublikasikan, bukan dipilih tangan, sehingga hasil bisa dibandingkan secara adil.",
    "default.capital": "Modal virtual $10.000: agent berjalan di mode paper dulu. Tidak ada dana nyata yang berpindah.",
    "onboarding.next": "Lanjut",
    "onboarding.back": "Kembali",
    "onboarding.start": "Buka dashboard",
  },
} as const;
export type MessageKey = keyof (typeof DICT)["en"];
export const t = (locale: Locale, key: MessageKey): string => DICT[locale][key] ?? DICT.en[key];

/** Safe onboarding defaults (phase 18). Engine fields: stop_loss_pct, max_weight; capital in USD. */
export const SAFE_DEFAULTS = { stop_loss_pct: 0.08, max_weight: 0.25, universe: "auto", initial_usd: 10_000, mode: "paper" } as const;

/** Navigation, footer and menu text. English is the key; unknown text falls back to English. */
const NAV_ID: Record<string, string> = {
  Product: "Produk", Resources: "Sumber", Explore: "Jelajahi", Learn: "Pelajari", Leaderboard: "Papan peringkat",
  Strategies: "Strategi", Studio: "Studio", Agent: "Agent", Markets: "Pasar", Evidence: "Bukti", "Verify decisions": "Verifikasi keputusan",
  "How It Works": "Cara kerja", Token: "Token", Tokenomics: "Tokenomics", Buyback: "Buyback", Docs: "Dokumen", Documentation: "Dokumentasi",
  Whitepaper: "Whitepaper", Blog: "Blog", API: "API", FAQ: "FAQ", Risk: "Risiko", Security: "Keamanan", Pricing: "Harga",
  About: "Tentang", Roadmap: "Peta jalan", "Get in touch": "Hubungi kami", "Follow on X": "Ikuti di X",
  Legal: "Legal", Terms: "Ketentuan", Privacy: "Privasi", "Risk disclosures": "Pengungkapan risiko",
  "Reconciled agents only": "Hanya agent yang lolos rekonsiliasi", "Find your starting point": "Temukan titik awalmu",
  "Shape your own approach": "Susun pendekatanmu sendiri", "Intelligence within your boundaries": "Kecerdasan di dalam batas yang kamu tetapkan",
  "Step-by-step copy flow": "Alur langkah demi langkah", "Status: planned, not deployed": "Status: direncanakan, belum di-deploy",
  "No allocation decided": "Belum ada alokasi", "Status: not deployed": "Status: belum di-deploy", "Technical documentation": "Dokumentasi teknis",
  "Protocol deep-dive": "Pembahasan mendalam protokol", "Updates & insights": "Kabar & catatan", "Resources for builders": "Sumber untuk developer",
  "Good questions, clear answers": "Pertanyaan bagus, jawaban jelas",
  "Onchain intelligence.": "Kecerdasan onchain.",
  "Siro is in open beta. Digital assets involve risk, including the loss of capital. Published results identify their data source, trading mode and costs. Past performance does not guarantee future results.":
    "Siro dalam beta terbuka. Aset digital berisiko, termasuk kehilangan modal. Hasil yang dipublikasikan menyebut sumber data, mode trading, dan biayanya. Kinerja masa lalu tidak menjamin hasil masa depan.",
};
export const nav = (locale: Locale, english: string): string => (locale === "id" ? NAV_ID[english] ?? english : english);
