import { t, type Locale } from "@/lib/i18n";

/** Phase 18: shown on every page that displays performance or price numbers, not only in the footer. */
export function RiskDisclaimer() {
  const locale = "en" as Locale;
  return (
    <aside role="note" aria-label={t(locale, "disclaimer.title")} className="my-8 rounded-xl border border-line bg-surface px-5 py-4 text-sm leading-relaxed text-fg-70">
      <strong>{t(locale, "disclaimer.title")}.</strong> {t(locale, "disclaimer.body")}
    </aside>
  );
}
