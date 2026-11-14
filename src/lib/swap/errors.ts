import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

export type SwapErrorKind = "rejected" | "stale_oracle" | "slippage" | "deadline" | "insufficient_funds" | "not_whitelisted" | "vault" | "rpc" | "unknown";
export type SwapError = { kind: SwapErrorKind; message: string; requote: boolean; code?: string };

export const STALE_ORACLE_MESSAGE = "Harga oracle vault sedang tidak segar. Coba lagi sebentar.";

const CUSTOM: Record<string, Omit<SwapError, "code">> = {
  StaleOracle: { kind: "stale_oracle", message: STALE_ORACLE_MESSAGE, requote: true },
  SlippageExceeded: { kind: "slippage", message: "Price moved beyond your slippage. Get a new quote.", requote: true },
  SharesBelowMinimum: { kind: "slippage", message: "The vault would mint fewer shares than allowed. Get a new quote.", requote: true },
  DeadlinePassed: { kind: "deadline", message: "The transaction deadline passed. Get a new quote.", requote: true },
  TokenNotWhitelisted: { kind: "not_whitelisted", message: "This token is not enabled for deposits.", requote: false },
  UnsupportedToken: { kind: "not_whitelisted", message: "This token is not supported.", requote: false },
  VaultNotRecognized: { kind: "vault", message: "This vault is not a SIRO vault.", requote: false },
  TradingPaused: { kind: "vault", message: "This vault is paused.", requote: false },
  ZeroAmount: { kind: "unknown", message: "Enter an amount above zero.", requote: false },
  InvalidValue: { kind: "unknown", message: "ETH sent does not match the amount.", requote: false },
};
/** SwapRouter02 / Uniswap v3 string reverts. */
const REASONS: [RegExp, Omit<SwapError, "code">][] = [
  [/too little received/i, { kind: "slippage", message: "Price moved beyond your slippage. Get a new quote.", requote: true }],
  [/transaction too old/i, { kind: "deadline", message: "The transaction deadline passed. Get a new quote.", requote: true }],
  [/^STF$|transferfrom failed/i, { kind: "insufficient_funds", message: "Token transfer failed. Check balance and approval.", requote: false }],
  [/^SPL$/, { kind: "slippage", message: "Price limit reached. Get a new quote.", requote: true }],
];

/** Decodes router and vault reverts (and wallet errors) into user-facing copy. */
export function decodeSwapError(error: unknown): SwapError {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return { kind: "rejected", message: "You rejected the request in your wallet.", requote: false };
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && CUSTOM[name]) return { ...CUSTOM[name], code: name };
      const reason = revert.reason ?? (name === "Error" ? String(revert.data?.args?.[0] ?? "") : "");
      for (const [re, e] of REASONS) if (reason && re.test(reason)) return { ...e, code: reason };
      if (name) return { kind: "unknown", message: `Transaction would revert (${name}).`, requote: false, code: name };
    }
    if (/insufficient funds/i.test(error.message)) return { kind: "insufficient_funds", message: "Not enough ETH for this amount plus gas.", requote: false };
    if (/timed? ?out|fetch failed|HTTP request failed/i.test(error.message)) return { kind: "rpc", message: "The network did not respond. Try again.", requote: true };
  }
  return { kind: "unknown", message: "Something went wrong. Try again.", requote: false };
}
