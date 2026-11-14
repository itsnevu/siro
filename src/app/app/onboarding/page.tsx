"use client";

import { useRouter } from "next/navigation";
import { t, SAFE_DEFAULTS, type MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

// Phase 18 onboarding: safe defaults, one line of explanation each, in Indonesian or English.
const DEFAULTS: { key: MessageKey; value: string }[] = [
  { key: "default.stop_loss", value: `stop_loss_pct = ${SAFE_DEFAULTS.stop_loss_pct}` },
  { key: "default.max_per_asset", value: `max_weight = ${SAFE_DEFAULTS.max_weight}` },
  { key: "default.universe", value: `universe = ${SAFE_DEFAULTS.universe}` },
  { key: "default.capital", value: `initial_usd = ${SAFE_DEFAULTS.initial_usd}, mode = ${SAFE_DEFAULTS.mode}` },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [locale, setLocale] = useLocale();
  const switchLocale = () => setLocale(locale === "id" ? "en" : "id");
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-16" lang={locale}>
      <div className="max-w-2xl w-full space-y-8">
        <div className="flex justify-end">
          <button type="button" onClick={switchLocale} className="btn-secondary">{t(locale, "locale.switch")}</button>
        </div>
        <header>
          <h1 className="font-serif text-[36px] md:text-[48px] leading-tight mb-4">{t(locale, "onboarding.title")}</h1>
          <p className="text-muted text-lg">{t(locale, "onboarding.lede")}</p>
        </header>
        <ol className="space-y-4">
          {DEFAULTS.map(d => (
            <li key={d.key} className="rounded-xl border border-line p-4">
              <p>{t(locale, d.key)}</p>
              <code className="text-xs text-muted">{d.value}</code>
            </li>
          ))}
        </ol>
        <div className="flex justify-end">
          <button type="button" onClick={() => router.push("/app")} className="btn-primary">{t(locale, "onboarding.start")}</button>
        </div>
      </div>
    </main>
  );
}
