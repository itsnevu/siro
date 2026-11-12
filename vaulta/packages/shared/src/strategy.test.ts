import { describe, expect, it } from "vitest";
import { supportedTickers, ROBINHOOD_MAINNET_ID } from "./config/chains";
import { canonicalJson, hashStrategy, parseStrategy } from "./strategy";

const TICKERS = supportedTickers(ROBINHOOD_MAINNET_ID);

const valid = {
  name: "NVDA dip buyer",
  markets: ["NVDA"],
  buy: [{ indicator: "price", window: "48h", op: "<", value: { indicator: "sma", window: "48h" } }],
  sell: [{ indicator: "rsi", window: "24h", op: ">", value: 70 }],
  stopLossPct: 8,
  maxPositionPct: 30,
};

function errorsOf(input: unknown): string[] {
  const result = parseStrategy(input, TICKERS);
  return result.ok ? [] : result.errors.map((error) => `${error.path}: ${error.message}`);
}

describe("strategy schema", () => {
  it("has real markets to validate against", () => {
    expect(TICKERS).toContain("NVDA");
    expect(TICKERS).toContain("WETH");
    expect(TICKERS.length).toBeGreaterThan(20);
  });

  it("accepts a well-formed strategy", () => {
    const result = parseStrategy(valid, TICKERS);
    expect(result.ok).toBe(true);
  });

  it("rejects unknown keys instead of dropping them", () => {
    expect(errorsOf({ ...valid, leverage: 5 })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, buy: [{ ...valid.buy[0], note: "x" }] })).not.toHaveLength(0);
  });

  it("rejects unsupported and duplicate tickers", () => {
    expect(errorsOf({ ...valid, markets: ["DOGE"] }).join(" ")).toMatch(/not a supported market/);
    expect(errorsOf({ ...valid, markets: ["nvda"] }).join(" ")).toMatch(/not a supported market/);
    expect(errorsOf({ ...valid, markets: ["NVDA", "NVDA"] }).join(" ")).toMatch(/listed twice/);
  });

  it("enforces the 1..3 bounds on markets and rules", () => {
    expect(errorsOf({ ...valid, markets: [] })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, markets: ["NVDA", "AAPL", "MSFT", "TSLA"] })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, buy: [] })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, sell: Array(4).fill(valid.sell[0]) })).not.toHaveLength(0);
  });

  it("enforces numeric ranges", () => {
    expect(errorsOf({ ...valid, stopLossPct: 0.5 })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, stopLossPct: 51 })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, takeProfitPct: 501 })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, maxPositionPct: 0 })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, maxPositionPct: 101 })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, maxHoldHours: 1.5 })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, maxPositionPct: Number.NaN })).not.toHaveLength(0);
  });

  it("rejects comparisons between unrelated units", () => {
    const mixed = { ...valid, buy: [{ indicator: "price", window: "24h", op: "<", value: { indicator: "rsi", window: "24h" } }] };
    expect(errorsOf(mixed).join(" ")).toMatch(/cannot be compared/);
  });

  it("rejects a rule that compares an indicator to itself", () => {
    const self = { ...valid, buy: [{ indicator: "sma", window: "24h", op: "crosses_above", value: { indicator: "sma", window: "24h" } }] };
    expect(errorsOf(self).join(" ")).toMatch(/never fire/);
  });

  it("rejects out-of-range literals per indicator", () => {
    expect(errorsOf({ ...valid, sell: [{ indicator: "rsi", window: "24h", op: ">", value: 140 }] })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, sell: [{ indicator: "price", window: "24h", op: ">", value: -5 }] })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, sell: [{ indicator: "zscore", window: "24h", op: ">", value: 50 }] })).not.toHaveLength(0);
  });

  it("rejects unknown indicators, windows and operators", () => {
    expect(errorsOf({ ...valid, sell: [{ indicator: "macd", window: "24h", op: ">", value: 1 }] })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, sell: [{ indicator: "rsi", window: "12h", op: ">", value: 1 }] })).not.toHaveLength(0);
    expect(errorsOf({ ...valid, sell: [{ indicator: "rsi", window: "24h", op: ">=", value: 1 }] })).not.toHaveLength(0);
  });

  it("rejects non-objects without throwing", () => {
    for (const input of [null, undefined, "buy NVDA", 42, []]) expect(parseStrategy(input, TICKERS).ok).toBe(false);
  });
});

describe("strategy hash", () => {
  it("does not depend on key order", () => {
    const a = parseStrategy(valid, TICKERS);
    const reordered = { maxPositionPct: 30, stopLossPct: 8, sell: valid.sell, buy: valid.buy, markets: ["NVDA"], name: "NVDA dip buyer" };
    const b = parseStrategy(reordered, TICKERS);
    if (!a.ok || !b.ok) throw new Error("fixtures must be valid");
    expect(canonicalJson(a.strategy)).toBe(canonicalJson(b.strategy));
    expect(hashStrategy(a.strategy)).toBe(hashStrategy(b.strategy));
  });

  it("changes when any rule changes", () => {
    const a = parseStrategy(valid, TICKERS);
    const b = parseStrategy({ ...valid, stopLossPct: 9 }, TICKERS);
    if (!a.ok || !b.ok) throw new Error("fixtures must be valid");
    expect(hashStrategy(a.strategy)).not.toBe(hashStrategy(b.strategy));
  });
});
