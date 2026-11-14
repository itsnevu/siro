// One-off proof required by docs/swap-brief.md: viem's fetch-based http() transport is
// intercepted by MSW. If this ever fails, RPC mocks in other specs are silently bypassed.
import { afterAll, beforeAll, expect, test } from "vitest";
import { setupServer } from "msw/node";
import { http as mswHttp, HttpResponse } from "msw";
import { createPublicClient, http } from "viem";

const RPC = "https://rpc.invalid/4663";
let calls = 0;
const server = setupServer(
  mswHttp.post(RPC, async ({ request }) => {
    calls++;
    const body = (await request.json()) as { id: number; method: string };
    return HttpResponse.json({ jsonrpc: "2.0", id: body.id, result: body.method === "eth_chainId" ? "0x1237" : "0x2a" });
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

test("MSW intercepts viem http() transport", async () => {
  const client = createPublicClient({ transport: http(RPC, { retryCount: 0 }) });
  expect(await client.getChainId()).toBe(4663);
  expect(await client.getBlockNumber({ cacheTime: 0 })).toBe(42n);
  expect(calls).toBe(2);
});

test("an unmocked RPC URL errors instead of reaching the network", async () => {
  const client = createPublicClient({ transport: http("https://unmocked.invalid/rpc", { retryCount: 0 }) });
  await expect(client.getChainId()).rejects.toThrow();
});
