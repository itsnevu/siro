/**
 * Strategy rule schema. This is the only shape an agent can run.
 *
 * The natural-language parser must produce JSON that passes `parseStrategy`. Anything else —
 * an unknown key, an unsupported ticker, a comparison between unrelated units — is rejected
 * with a message for the user. Nothing is repaired or guessed.
 */
import { keccak256, stringToBytes } from "viem";
import { z } from "zod";

export const INDICATORS = ["price", "sma", "ema", "zscore", "rsi", "change"] as const;
export const WINDOWS = ["24h", "48h", "72h", "96h", "7d"] as const;
export const OPERATORS = ["<", ">", "crosses_above", "crosses_below"] as const;

export type Indicator = (typeof INDICATORS)[number];
export type Window = (typeof WINDOWS)[number];
export type Operator = (typeof OPERATORS)[number];

export const WINDOW_HOURS: Readonly<Record<Window, number>> = {
  "24h": 24,
  "48h": 48,
  "72h": 72,
  "96h": 96,
  "7d": 168,
};

export const STRATEGY_LIMITS = {
  maxMarkets: 3,
  maxRulesPerSide: 3,
  stopLossPct: { min: 1, max: 50 },
  takeProfitPct: { min: 1, max: 500 },
  maxHoldHours: { min: 1, max: 24 * 30 },
  maxPositionPct: { min: 1, max: 100 },
  nameLength: 64,
} as const;

/**
 * What an indicator measures. Two sides of a comparison must share a unit:
 * a price can be compared to an average, never to an RSI reading.
 */
const UNIT: Readonly<Record<Indicator, "usd" | "zscore" | "rsi" | "percent">> = {
  price: "usd",
  sma: "usd",
  ema: "usd",
  zscore: "zscore",
  rsi: "rsi",
  change: "percent",
};

/** Accepted range for a literal number on the right-hand side, per indicator. */
const LITERAL_RANGE: Readonly<Record<Indicator, { min: number; max: number; label: string }>> = {
  price: { min: 0.000001, max: 10_000_000, label: "a USD price above 0" },
  sma: { min: 0.000001, max: 10_000_000, label: "a USD price above 0" },
  ema: { min: 0.000001, max: 10_000_000, label: "a USD price above 0" },
  zscore: { min: -10, max: 10, label: "a z-score between -10 and 10" },
  rsi: { min: 0, max: 100, label: "an RSI between 0 and 100" },
  change: { min: -100, max: 1_000, label: "a percent change between -100 and 1000" },
};

const indicatorRefSchema = z.strictObject({
  indicator: z.enum(INDICATORS),
  window: z.enum(WINDOWS),
});

const ruleSchema = z.strictObject({
  indicator: z.enum(INDICATORS),
  window: z.enum(WINDOWS),
  op: z.enum(OPERATORS),
  value: z.union([z.number(), indicatorRefSchema]),
});

export type IndicatorRef = z.infer<typeof indicatorRefSchema>;
export type Rule = z.infer<typeof ruleSchema>;

function checkRule(rule: Rule, path: (string | number)[], ctx: z.RefinementCtx): void {
  if (typeof rule.value === "number") {
    const range = LITERAL_RANGE[rule.indicator];
    if (rule.value < range.min || rule.value > range.max) {
      ctx.addIssue({
        code: "custom",
        path: [...path, "value"],
        message: `${rule.indicator} must be compared to ${range.label}.`,
      });
    }
    return;
  }
  if (UNIT[rule.value.indicator] !== UNIT[rule.indicator]) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "value"],
      message: `${rule.indicator} (${UNIT[rule.indicator]}) cannot be compared to ${rule.value.indicator} (${UNIT[rule.value.indicator]}).`,
    });
  }
  if (rule.value.indicator === rule.indicator && rule.value.window === rule.window) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "value"],
      message: "A rule cannot compare an indicator to itself over the same window. It would never fire.",
    });
  }
}

/**
 * Builds the schema for a given list of tradable tickers (see `supportedTickers(chainId)`).
 * Tickers are matched exactly and must be upper case.
 */
export function createStrategySchema(supported: readonly string[]) {
  const allowed = new Set(supported);
  return z
    .strictObject({
      name: z.string().trim().min(1).max(STRATEGY_LIMITS.nameLength),
      markets: z.array(z.string()).min(1).max(STRATEGY_LIMITS.maxMarkets),
      buy: z.array(ruleSchema).min(1).max(STRATEGY_LIMITS.maxRulesPerSide),
      sell: z.array(ruleSchema).min(1).max(STRATEGY_LIMITS.maxRulesPerSide),
      stopLossPct: z.number().min(STRATEGY_LIMITS.stopLossPct.min).max(STRATEGY_LIMITS.stopLossPct.max).optional(),
      takeProfitPct: z
        .number()
        .min(STRATEGY_LIMITS.takeProfitPct.min)
        .max(STRATEGY_LIMITS.takeProfitPct.max)
        .optional(),
      maxHoldHours: z
        .number()
        .int()
        .min(STRATEGY_LIMITS.maxHoldHours.min)
        .max(STRATEGY_LIMITS.maxHoldHours.max)
        .optional(),
      maxPositionPct: z.number().min(STRATEGY_LIMITS.maxPositionPct.min).max(STRATEGY_LIMITS.maxPositionPct.max),
    })
    .superRefine((strategy, ctx) => {
      const seen = new Set<string>();
      strategy.markets.forEach((ticker, index) => {
        if (!allowed.has(ticker)) {
          ctx.addIssue({
            code: "custom",
            path: ["markets", index],
            message: `"${ticker}" is not a supported market.`,
          });
        }
        if (seen.has(ticker)) {
          ctx.addIssue({ code: "custom", path: ["markets", index], message: `"${ticker}" is listed twice.` });
        }
        seen.add(ticker);
      });
      strategy.buy.forEach((rule, index) => checkRule(rule, ["buy", index], ctx));
      strategy.sell.forEach((rule, index) => checkRule(rule, ["sell", index], ctx));
    });
}

export type Strategy = z.infer<ReturnType<typeof createStrategySchema>>;

export type ParseStrategyResult =
  | { ok: true; strategy: Strategy }
  | { ok: false; errors: { path: string; message: string }[] };

/** Validates unknown input. Never throws and never returns a partially valid strategy. */
export function parseStrategy(input: unknown, supported: readonly string[]): ParseStrategyResult {
  const result = createStrategySchema(supported).safeParse(input);
  if (result.success) return { ok: true, strategy: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    })),
  };
}

/** JSON with object keys sorted, so the same strategy always serialises to the same bytes. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] !== undefined) sorted[key] = sortKeys(record[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * The `strategyHash` stored in AgentRegistry: keccak256 of the canonical JSON.
 * Anyone holding the strategy JSON can recompute it and confirm what an agent is running.
 */
export function hashStrategy(strategy: Strategy): `0x${string}` {
  return keccak256(stringToBytes(canonicalJson(strategy)));
}
