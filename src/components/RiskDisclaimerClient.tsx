"use client";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

/** Client variant for client-rendered segments; the locale comes from the cookie set by the proxy. */
export function RiskDisclaimerClient() {
  const [locale] = useLocale();
  return (
    <aside role="note" aria-label={t(locale, "disclaimer.title")} className="site-container my-6 rounded-xl border border-line p-4 text-sm">
      <strong>{t(locale, "disclaimer.title")}.</strong> {t(locale, "disclaimer.body")}
    </aside>
  );
}
