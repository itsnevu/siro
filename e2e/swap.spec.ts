import { expect, test, type Page, type Route } from "@playwright/test";
import { decodeFunctionData, encodeFunctionResult, maxUint256, toFunctionSelector, type Hex } from "viem";
import { erc20Abi, quoterV2Abi, v3FactoryAbi, v3PoolAbi, siroZapAbi, guardedVaultAbi } from "../src/lib/swap/abis";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const POOL = "0x52e65B17fB6E5BA00Ed806f37Afcd2DaA50271Ca";
const HASH = `0x${"ab".repeat(32)}`;
type Scenario = { route: boolean; ethBalance: bigint; wethBalance: bigint };

const sel = (sig: string) => toFunctionSelector(sig).slice(2, 10);
const SEL = {
  quote: sel("quoteExactInputSingle((address,address,uint256,uint24,uint160))"),
  getPool: sel("getPool(address,address,uint24)"),
  slot0: sel("slot0()"),
  balanceOf: sel("balanceOf(address)"),
  allowance: sel("allowance(address,address)"),
  approve: sel("approve(address,uint256)"),
  previewDeposit: sel("previewDeposit(uint256)"),
  zap: sel("swapAndDeposit(address,address,uint256,uint24,uint256,uint256,uint256,address)"),
};
const revert = { code: 3, message: "execution reverted", data: "0x" };

/** Answers JSON-RPC by method and calldata selector, as the chain would for this scenario. */
function rpcHandler(s: Scenario, state: { approved: boolean }) {
  return (req: { id: number; method: string; params?: unknown[] }) => {
    const ok = (result: unknown) => ({ jsonrpc: "2.0", id: req.id, result });
    switch (req.method) {
      case "eth_chainId": return ok("0x1237");
      case "eth_blockNumber": return ok("0x6d2a000");
      case "eth_getBalance": return ok(`0x${s.ethBalance.toString(16)}`);
      case "eth_estimateGas": return ok("0x4c4b4");
      case "eth_gasPrice": case "eth_maxPriorityFeePerGas": return ok("0x1312d00");
      case "eth_getBlockByNumber": return ok({ number: "0x6d2a000", baseFeePerGas: "0x1312d00", timestamp: "0x6a000000", transactions: [] });
      case "eth_getTransactionReceipt": return ok({ transactionHash: req.params?.[0], status: "0x1", blockNumber: "0x6d2a001", blockHash: HASH, logs: [], gasUsed: "0x3d0a2", cumulativeGasUsed: "0x3d0a2", effectiveGasPrice: "0x1312d00", from: ACCOUNT, to: null, contractAddress: null, transactionIndex: "0x0", type: "0x2", logsBloom: `0x${"0".repeat(512)}` });
      case "eth_getTransactionByHash": return ok(null);
      case "eth_call": {
        const data = ((req.params?.[0] as { data?: Hex; input?: Hex })?.data ?? (req.params?.[0] as { input?: Hex })?.input ?? "0x") as Hex;
        const s4 = data.slice(2, 10);
        if (s4 === SEL.quote) {
          if (!s.route) return { jsonrpc: "2.0", id: req.id, error: revert };
          const { args } = decodeFunctionData({ abi: quoterV2Abi, data });
          const fee = args[0].fee;
          const out = fee === 10000 ? 9_999_000_000n : fee === 100 ? 3_536_163n : fee === 500 ? 3_534_336n : 3_525_962n;
          return ok(encodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", result: [out, 0n, 1, 90_000n] }));
        }
        if (s4 === SEL.getPool) return ok(encodeFunctionResult({ abi: v3FactoryAbi, functionName: "getPool", result: POOL }));
        if (s4 === SEL.slot0) return ok(encodeFunctionResult({ abi: v3PoolAbi, functionName: "slot0", result: [3_340_000_000_000_000_000_000n, 0, 0, 0, 0, 0, true] }));
        if (s4 === SEL.balanceOf) return ok(encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: s.wethBalance }));
        if (s4 === SEL.allowance) return ok(encodeFunctionResult({ abi: erc20Abi, functionName: "allowance", result: state.approved ? maxUint256 : 0n }));
        if (s4 === SEL.approve) return ok(encodeFunctionResult({ abi: erc20Abi, functionName: "approve", result: true }));
        if (s4 === SEL.previewDeposit) return ok(encodeFunctionResult({ abi: guardedVaultAbi, functionName: "previewDeposit", result: 3_518_482_000_000n }));
        if (s4 === SEL.zap) return ok(encodeFunctionResult({ abi: siroZapAbi, functionName: "swapAndDeposit", result: 3_535_866_000_000n }));
        return { jsonrpc: "2.0", id: req.id, error: revert };
      }
      default: return ok(null);
    }
  };
}

async function setup(page: Page, s: Scenario) {
  const state = { approved: false };
  const handle = rpcHandler(s, state);
  await page.route("**/api/rpc/4663**", async (route: Route) => {
    const body = route.request().postDataJSON() as Parameters<typeof handle>[0] | Parameters<typeof handle>[0][];
    await route.fulfill({ json: Array.isArray(body) ? body.map(handle) : handle(body) });
  });
  // In-page EIP-1193 wallet: approves everything, never signs a real transaction.
  await page.exposeFunction("__walletSent", (method: string) => { if (method === "approve") state.approved = true; });
  await page.addInitScript(({ account, hash, approveSel }) => {
    const listeners: Record<string, ((...a: unknown[]) => void)[]> = {};
    const w = window as unknown as { ethereum: unknown; __walletSent: (m: string) => Promise<void> };
    w.ethereum = {
      isMetaMask: true,
      on: (e: string, f: (...a: unknown[]) => void) => { (listeners[e] ??= []).push(f); },
      removeListener: () => {},
      request: async ({ method, params }: { method: string; params?: { data?: string }[] }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [account];
        if (method === "eth_chainId") return "0x1237";
        if (method === "wallet_switchEthereumChain") return null;
        if (method === "eth_sendTransaction") { await w.__walletSent(params?.[0]?.data?.slice(2, 10) === approveSel ? "approve" : "swap"); return hash; }
        const r = await fetch("/api/rpc/4663", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
        const j = await r.json(); if (j.error) throw Object.assign(new Error(j.error.message), j.error); return j.result;
      },
    };
  }, { account: ACCOUNT, hash: HASH, approveSel: SEL.approve });
}

test("happy path: connect, quote, approve, swap", async ({ page }) => {
  await setup(page, { route: true, ethBalance: 10n ** 18n, wethBalance: 10n ** 18n });
  await page.goto("/app/swap");
  await expect(page.getByRole("note", { name: "Execution modes" })).toContainText("PAPER");
  const button = page.locator(".swap-btn[data-state]");
  await expect(button).toHaveText("Connect wallet");
  await button.click();
  await expect(button).toHaveText("Enter an amount");

  await page.getByRole("button", { name: /Change token/ }).click();
  await page.getByRole("option", { name: /Wrapped Ether/ }).click();
  await page.getByLabel("You pay").fill("0.002");

  await expect(page.locator("output.amount-out")).toHaveText("3.536163");
  await expect(button).toHaveText("Approve WETH");
  await button.click();
  await expect(button).toHaveText("Swap and deposit");
  await page.getByRole("button", { name: /1 WETH =/ }).click();
  await expect(page.getByText(/v3 0.01%/)).toBeVisible(); // 1% tier quoted far higher but is excluded
  await button.click();
  await expect(page.getByRole("dialog")).toContainText("Deposited");
  await expect(page.getByRole("dialog")).toContainText("paper mode");
});

test("no route, then insufficient balance", async ({ page }) => {
  await setup(page, { route: false, ethBalance: 10n ** 15n, wethBalance: 0n });
  await page.goto("/app/swap");
  const button = page.locator(".swap-btn[data-state]");
  await button.click();
  await page.getByLabel("You pay").fill("0.0001");
  await expect(button).toHaveText("No route for this pair");
  await expect(page.getByText(/No pool can route ETH/)).toBeVisible();
  await page.getByLabel("You pay").fill("5");
  await expect(button).toHaveText("Insufficient ETH balance");
  await expect(button).toBeDisabled();
});
