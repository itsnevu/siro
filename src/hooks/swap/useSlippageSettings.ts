"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_DEADLINE_SECONDS, DEFAULT_SLIPPAGE_BPS, MAX_SLIPPAGE_BPS } from "@/lib/config/swap";

const KEY = "siro_swap_settings_v1";
const EVENT = "siro-swap-settings";
export type SwapSettings = { slippageBps: number; deadlineSeconds: number };
const DEFAULTS: SwapSettings = { slippageBps: DEFAULT_SLIPPAGE_BPS, deadlineSeconds: DEFAULT_DEADLINE_SECONDS };

function valid(v: unknown): v is SwapSettings {
  if (!v || typeof v !== "object") return false;
  const s = v as SwapSettings;
  return Number.isInteger(s.slippageBps) && s.slippageBps >= 0 && s.slippageBps <= MAX_SLIPPAGE_BPS
    && Number.isInteger(s.deadlineSeconds) && s.deadlineSeconds >= 10 && s.deadlineSeconds <= 86_400;
}
function read(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); };
}

/** Per-viewer convenience in localStorage; storage may be blocked, so defaults always apply. */
export function useSlippageSettings() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const settings = useMemo<SwapSettings>(() => {
    try { const parsed: unknown = raw ? JSON.parse(raw) : null; return valid(parsed) ? parsed : DEFAULTS; } catch { return DEFAULTS; }
  }, [raw]);
  const update = useCallback((next: Partial<SwapSettings>) => {
    const merged = { ...settings, ...next };
    if (!valid(merged)) return;
    try { localStorage.setItem(KEY, JSON.stringify(merged)); window.dispatchEvent(new Event(EVENT)); } catch { /* storage blocked */ }
  }, [settings]);
  return { settings, update, reset: () => update(DEFAULTS) };
}
