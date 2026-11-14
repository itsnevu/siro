import { defineConfig, devices } from "@playwright/test";

/** Two flows only (docs/swap-brief.md). The wallet is an in-page EIP-1193 stub and the RPC relay is mocked: nothing is sent on chain. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3311", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next dev -p 3311 -H 127.0.0.1",
    url: "http://127.0.0.1:3311/app/swap",
    timeout: 240_000,
    reuseExistingServer: true,
    env: { NEXT_PUBLIC_SIRO_ZAP: "0x6F635334962beadc61c42011B8A892bc23ab7437" },
  },
});
