import { describe, expect, test, vi } from "vitest";
import { encodeErrorResult, ContractFunctionRevertedError, BaseError, UserRejectedRequestError } from "viem";
import { minOut } from "@/lib/swap/minOut";
import { priceImpactPct, spotOutPerIn, impactLevel } from "@/lib/swap/priceImpact";
import { formatAmount, formatToken, parseAmount, shortAddress, formatPct } from "@/lib/swap/format";
import { selectBestQuote } from "@/lib/swap/quotes";
import { decodeSwapError, STALE_ORACLE_MESSAGE } from "@/lib/swap/errors";
import { guardedVaultAbi } from "@/lib/swap/abis";

describe("minOut", () => {
  test("floors, never rounds up", () => {
    expect(minOut(999n, 30)).toBe(996n); // 996.003 -> 996
    expect(minOut(1n, 1)).toBe(0n); // 0.9999 -> 0
    expect(minOut(3_536_163n, 50)).toBe(3_518_482n); // matches the live smoke test
  });
  test("slippage 0 returns the quote exactly", () => expect(minOut(123_456n, 0)).toBe(123_456n));
  test("rejects invalid slippage", () => {
    expect(() => minOut(1n, -1)).toThrow();
    expect(() => minOut(1n, 10_001)).toThrow();
    expect(() => minOut(1n, 0.5)).toThrow();
  });
});

describe("priceImpact", () => {
  const Q96 = 2n ** 96n;
  test("spot from sqrtPriceX96 both directions", () => {
    expect(spotOutPerIn(Q96, true)).toBe(10n ** 18n);
    expect(spotOutPerIn(2n * Q96, true)).toBe(4n * 10n ** 18n);
    expect(spotOutPerIn(2n * Q96, false)).toBe(10n ** 18n / 4n);
  });
  test("execution at spot is zero impact; better than spot clamps to zero", () => {
    expect(priceImpactPct(1000n, 1000n, Q96, true)).toBe(0);
    expect(priceImpactPct(1000n, 1100n, Q96, true)).toBe(0);
  });
  test("1% worse than spot is 1%", () => expect(priceImpactPct(1000n, 990n, Q96, true)).toBeCloseTo(1, 6));
  test("thresholds", () => {
    expect(impactLevel(0.49)).toBe("neutral");
    expect(impactLevel(0.5)).toBe("muted");
    expect(impactLevel(2)).toBe("orange");
    expect(impactLevel(5.01)).toBe("red");
    expect(impactLevel(15.01)).toBe("blocked");
  });
});

describe("format", () => {
  test("truncates, groups, trims zeros", () => {
    expect(formatAmount(35_244_444n, 6, 2)).toBe("35.24");
    expect(formatAmount(1_234_567_890_000n, 6, 2)).toBe("1,234,567.89");
    expect(formatAmount(1_999_999n, 6, 2)).toBe("1.99"); // never rounds up
    expect(formatAmount(10n ** 18n, 18)).toBe("1");
    expect(formatAmount(7n, 0)).toBe("7");
  });
  test("dust shows a floor, not zero", () => expect(formatToken(1n, 6, "USDG")).toBe("<0.01 USDG"));
  test("parse respects decimals, rejects junk", () => {
    expect(parseAmount("0.002", 18)).toBe(2_000_000_000_000_000n);
    expect(parseAmount("1.1234567", 6)).toBeNull();
    expect(parseAmount("abc", 6)).toBeNull();
    expect(parseAmount("", 6)).toBeNull();
    expect(parseAmount("5", 0)).toBe(5n);
    expect(parseAmount("1.5", 0)).toBeNull();
  });
  test("short address and pct", () => {
    expect(shortAddress("0x6F635334962beadc61c42011B8A892bc23ab7437")).toBe("0x6F63…7437");
    expect(formatPct(0.004)).toBe("<0.01%");
  });
});

describe("selectBestQuote", () => {
  test("1% tier never wins, even with a better number, and logs one structured event", () => {
    const log = vi.fn();
    const best = selectBestQuote([{ fee: 100, amountOut: 100n }, { fee: 500, amountOut: 99n }, { fee: 10000, amountOut: 1_000n }], log);
    expect(best?.fee).toBe(100);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({ event: "excluded_tier_would_win", excludedFee: 10000, excludedOut: "1000", chosenFee: 100, chosenOut: "100" });
  });
  test("only the excluded tier has a route: no quote", () => {
    const log = vi.fn();
    expect(selectBestQuote([{ fee: 10000, amountOut: 5n }], log)).toBeNull();
    expect(log).toHaveBeenCalledOnce();
  });
  test("zero outputs are ignored; no log when excluded tier loses", () => {
    const log = vi.fn();
    expect(selectBestQuote([{ fee: 100, amountOut: 0n }, { fee: 3000, amountOut: 7n }, { fee: 10000, amountOut: 1n }], log)?.fee).toBe(3000);
    expect(log).not.toHaveBeenCalled();
  });
});

describe("decodeSwapError", () => {
  const revert = (errorName: "StaleOracle" | "SlippageExceeded") =>
    new BaseError("reverted", { cause: new ContractFunctionRevertedError({ abi: guardedVaultAbi, functionName: "previewDeposit", data: encodeErrorResult({ abi: guardedVaultAbi, errorName }) }) });
  test("StaleOracle has its own copy and triggers a re-quote", () => {
    expect(decodeSwapError(revert("StaleOracle"))).toEqual({ kind: "stale_oracle", message: STALE_ORACLE_MESSAGE, requote: true, code: "StaleOracle" });
  });
  test("slippage re-quotes", () => expect(decodeSwapError(revert("SlippageExceeded")).requote).toBe(true));
  test("wallet rejection", () => expect(decodeSwapError(new BaseError("x", { cause: new UserRejectedRequestError(new Error("no")) })).kind).toBe("rejected"));
  test("unknown input", () => expect(decodeSwapError("boom").kind).toBe("unknown"));
});

import { buttonState, type ButtonInput } from "@/lib/swap/buttonState";
describe("buttonState strict order", () => {
  const ok: ButtonInput = { connected: true, correctChain: true, amount: 10n, balance: 100n, symbol: "WETH", quoteStatus: "ready", needsApproval: false, approving: false, preparing: false, impact: "neutral" };
  test("each state is reachable, in order", () => {
    expect(buttonState({ ...ok, connected: false, correctChain: false, amount: null }).kind).toBe("connect");
    expect(buttonState({ ...ok, correctChain: false, amount: null }).kind).toBe("wrong_network");
    expect(buttonState({ ...ok, amount: 0n }).kind).toBe("enter_amount");
    expect(buttonState({ ...ok, amount: 101n, needsApproval: true }).label).toBe("Insufficient WETH balance");
    expect(buttonState({ ...ok, quoteStatus: "no_route" }).kind).toBe("no_route");
    expect(buttonState({ ...ok, needsApproval: true }).label).toBe("Approve WETH");
    expect(buttonState({ ...ok, needsApproval: true, approving: true }).kind).toBe("approving");
    expect(buttonState({ ...ok, preparing: true }).kind).toBe("preparing");
    expect(buttonState({ ...ok, quoteStatus: "loading" }).kind).toBe("quoting");
    expect(buttonState({ ...ok, impact: "blocked" }).kind).toBe("blocked");
    expect(buttonState({ ...ok, impact: "red" }).label).toBe("Swap anyway");
    expect(buttonState(ok).label).toBe("Swap and deposit");
  });
});
