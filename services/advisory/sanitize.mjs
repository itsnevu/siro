// Phase 15: everything external is untrusted. Strings are stripped, length-limited and escaped
// before they reach a prompt or a page; numbers from the LLM are clamped and every clamp is logged.
export const MAX_TEXT = 2_000;

// C0/C1 controls (except tab/newline), bidi overrides and zero-width characters can hide
// instructions from a human reviewer while still reaching the model.
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function sanitizeText(value, max = MAX_TEXT) {
  if (typeof value !== "string") return "";
  const cleaned = value.normalize("NFKC").replace(HIDDEN, "").replace(/\r\n?/g, "\n");
  const cut = cleaned.length > max ? `${cleaned.slice(0, max)}…[truncated]` : cleaned;
  // Escape markup and prompt delimiters so the text cannot close a quoted section or inject tags.
  return cut.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/```/g, "ˋˋˋ");
}

/** Deep-sanitise every string in a JSON value; numbers must be finite; depth and size are bounded. */
export function sanitizeInput(value, depth = 0) {
  if (depth > 6) throw new Error("input nested too deeply");
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("non-finite number in input"); return value; }
  if (value === null || typeof value === "boolean") return value;
  if (Array.isArray(value)) { if (value.length > 200) throw new Error("input array too long"); return value.map(v => sanitizeInput(v, depth + 1)); }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > 100) throw new Error("input object too large");
    return Object.fromEntries(keys.map(k => [sanitizeText(k, 64), sanitizeInput(value[k], depth + 1)]));
  }
  throw new Error("unsupported input value");
}

/**
 * Clamp a number the LLM returned into [min, max]. Out-of-range or non-numeric output is a
 * violation: it is clamped (or replaced with `fallback`) and recorded, never silently trusted.
 */
export function clampNumber(name, value, min, max, fallback = min) {
  if (typeof value !== "number" || !Number.isFinite(value)) return { value: fallback, violation: { field: name, received: String(value).slice(0, 40), applied: fallback, reason: "not a finite number" } };
  if (value < min || value > max) {
    const applied = Math.min(max, Math.max(min, value));
    return { value: applied, violation: { field: name, received: value, applied, reason: `outside [${min}, ${max}]` } };
  }
  return { value, violation: null };
}

/** target_weight from any model output: clamped to [0, max_w]. */
export const clampTargetWeight = (value, maxWeight) => clampNumber("target_weight", value, 0, maxWeight, 0);
