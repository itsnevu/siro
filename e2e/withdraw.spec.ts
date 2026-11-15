import { expect, test, type Route } from "@playwright/test";
import { encodeFunctionResult, toFunctionSelector, type Hex } from "viem";
import { guardedVaultAbi } from "../src/lib/swap/abis";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const HASH = `0x${"cd".repeat(32)}`;
const sel = (sig: string) => toFunctionSelector(sig).slice(2, 10);
const SEL = {
  balanceOf: sel("balanceOf(address)"), maxRedeem: sel("maxRedeem(address)"), maxWithdraw: sel("maxWithdraw(address)"),
  previewRedeem: sel("previewRedeem(uint256)"), redeem: sel("redeem(uint256,address,address)"), withdraw: sel("withdraw(uint256,address,address)"),
};

test("withdraw all: position, max, redeem, success, position refreshes to zero", async ({ page }) => {
  const state = { redeemed: false };
  const shares = 38_780_310_000_000n, assets = 38_780_310n;
  const handle = (req: { id: number; method: string; params?: unknown[] }) => {
    const ok = (result: unknown) => ({ jsonrpc: "2.0", id: req.id, result });
    if (req.method === "eth_chainId") return ok("0x1237");
    if (req.method === "eth_blockNumber") return ok("0x6d2a000");
    if (req.method === "eth_getTransactionReceipt") return ok({ transactionHash: req.params?.[0], status: "0x1", blockNumber: "0x6d2a001", blockHash: HASH, logs: [], gasUsed: "0x1", cumulativeGasUsed: "0x1", effectiveGasPrice: "0x1", from: ACCOUNT, to: null, contractAddress: null, transactionIndex: "0x0", type: "0x2", logsBloom: `0x${"0".repeat(512)}` });
    if (req.method === "eth_call") {
      const data = ((req.params?.[0] as { data?: Hex; input?: Hex }).data ?? (req.params?.[0] as { input?: Hex }).input ?? "0x") as Hex;
      const s = data.slice(2, 10);
      const held = state.redeemed ? 0n : shares, worth = state.redeemed ? 0n : assets;
      if (s === SEL.balanceOf) return ok(encodeFunctionResult({ abi: guardedVaultAbi, functionName: "balanceOf", result: held }));
      if (s === SEL.maxRedeem) return ok(encodeFunctionResult({ abi: guardedVaultAbi, functionName: "maxRedeem", result: held }));
      if (s === SEL.maxWithdraw) return ok(encodeFunctionResult({ abi: guardedVaultAbi, functionName: "maxWithdraw", result: worth }));
      if (s === SEL.previewRedeem) return ok(encodeFunctionResult({ abi: guardedVaultAbi, functionName: "previewRedeem", result: worth }));
      if (s === SEL.redeem) return ok(encodeFunctionResult({ abi: guardedVaultAbi, functionName: "redeem", result: assets }));
    }
    return ok(null);
  };
  await page.route("**/api/rpc/4663**", async (route: Route) => {
    const body = route.request().postDataJSON() as Parameters<typeof handle>[0] | Parameters<typeof handle>[0][];
    await route.fulfill({ json: Array.isArray(body) ? body.map(handle) : handle(body) });
  });
  await page.exposeFunction("__walletSent", () => { state.redeemed = true; });
  await page.addInitScript(({ account, hash }) => {
    const w = window as unknown as { ethereum: unknown; __walletSent: () => Promise<void> };
    w.ethereum = {
      isMetaMask: true, on: () => {}, removeListener: () => {},
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [account];
        if (method === "eth_chainId") return "0x1237";
        if (method === "eth_sendTransaction") { await w.__walletSent(); return hash; }
        const r = await fetch("/api/rpc/4663", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
        const j = await r.json(); if (j.error) throw Object.assign(new Error(j.error.message), j.error); return j.result;
      },
    };
  }, { account: ACCOUNT, hash: HASH });

  await page.goto("/app/withdraw");
  const button = page.locator(".swap-btn[data-state]");
  await button.click();
  await expect(page.locator(".amount-out")).toHaveText("38.78");
  await expect(button).toHaveText("Enter an amount");
  await page.getByLabel("Amount to withdraw").fill("100");
  await expect(button).toHaveText("Amount exceeds your withdrawable balance");
  await page.getByRole("button", { name: "Max" }).click();
  await expect(page.getByText(/You receive ≈ 38.78 USDG/)).toBeVisible();
  await expect(button).toHaveText("Withdraw all");
  await button.click();
  await expect(page.getByRole("dialog")).toContainText("Withdrawn");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();
  await expect(button).toHaveText("No vault shares to withdraw");
});
