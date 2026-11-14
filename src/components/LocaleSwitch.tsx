"use client";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

/** Switches between Indonesian and English; server-rendered text follows after a refresh. */
export function LocaleSwitch() {
  const [locale, setLocale] = useLocale();
  const router = useRouter();
  return (
    <button type="button" className="underline text-sm" lang={locale === "id" ? "en" : "id"}
      onClick={() => { setLocale(locale === "id" ? "en" : "id"); router.refresh(); }}>
      {t(locale, "locale.switch")}
    </button>
  );
}
