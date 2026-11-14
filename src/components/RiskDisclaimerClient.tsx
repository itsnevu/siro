"use client";
import { t } from "@/lib/i18n";

/** Client variant for client-rendered segments. The outer container sets the width; the card sets its own padding. */
export function RiskDisclaimerClient() {
  return (
    <div className="site-container">
      <aside role="note" data-tour="disclaimer" aria-label={t("en", "disclaimer.title")} className="my-8 rounded-xl border border-line bg-surface px-5 py-4 text-sm leading-relaxed text-fg-70">
        <strong className="text-ink">{t("en", "disclaimer.title")}.</strong> {t("en", "disclaimer.body")}
      </aside>
    </div>
  );
}
