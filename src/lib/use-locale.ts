"use client";
import { useCallback, useSyncExternalStore } from "react";
import { LOCALE_COOKIE, type Locale } from "./i18n";

// The locale cookie is an external store. Server snapshot is "en"; the client reads the cookie
// without an effect, so there is no cascading render and no hydration mismatch warning.
const listeners = new Set<() => void>();
const read = (): Locale => "en";
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function useLocale(): [Locale, (next: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, read, () => "en" as Locale);
  const set = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    listeners.forEach(fn => fn());
  }, []);
  return [locale, set];
}
