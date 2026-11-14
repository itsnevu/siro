import { headers } from "next/headers";
import { t, type Locale } from "@/lib/i18n";

/** Phase 18: shown on every page that displays performance or price numbers, not only in the footer. */
export async function RiskDisclaimer() {
  const locale = ((await headers()).get("x-siro-locale") === "id" ? "id" : "en") as Locale;
  return (
    <aside role="note" aria-label={t(locale, "disclaimer.title")} className="my-6 rounded-xl border border-line p-4 text-sm">
      <strong>{t(locale, "disclaimer.title")}.</strong> {t(locale, "disclaimer.body")}
    </aside>
  );
}
