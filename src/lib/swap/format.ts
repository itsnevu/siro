/** Display precision per symbol; amounts are always truncated, never rounded up. */
export const DISPLAY_DECIMALS: Record<string, number> = { USDG: 2, WETH: 6, ETH: 6 };

/** Formats a raw token amount, truncating to `maxDecimals` and grouping thousands. */
export function formatAmount(raw: bigint, decimals: number, maxDecimals = 6): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new RangeError("invalid decimals");
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  let fraction = decimals === 0 ? "" : (abs % base).toString().padStart(decimals, "0").slice(0, Math.max(0, maxDecimals)).replace(/0+$/, "");
  if (fraction === "" && whole === 0n && abs !== 0n) fraction = ""; // dust: shown as "<min" by callers
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function formatToken(raw: bigint, decimals: number, symbol: string): string {
  const shown = formatAmount(raw, decimals, DISPLAY_DECIMALS[symbol] ?? 6);
  return raw > 0n && /^0(\.0*)?$/.test(shown) ? `<${smallest(DISPLAY_DECIMALS[symbol] ?? 6)} ${symbol}` : `${shown} ${symbol}`;
}
const smallest = (d: number) => (d === 0 ? "1" : `0.${"0".repeat(d - 1)}1`);

/** Parses user input into raw units. Returns null for empty/invalid input or too many decimals. */
export function parseAmount(input: string, decimals: number): bigint | null {
  const s = input.trim();
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return null;
  const [whole = "", fraction = ""] = s.split(".");
  if (fraction.length > decimals) return null;
  const raw = BigInt((whole || "0") + fraction.padEnd(decimals, "0"));
  return raw;
}

export function shortAddress(address: string, chars = 4): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function formatPct(pct: number, digits = 2): string {
  return `${pct < 0.01 && pct > 0 ? "<0.01" : pct.toFixed(digits)}%`;
}
