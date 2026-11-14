# Siro: guarded trading agents on Robinhood Chain

Rust trading core, biaya gross/net, ledger commit–reveal, risk subprocess, walk-forward,
session execution, advisory dan evidence UI: [runbook dan status verifikasi](docs/TRADING_ENGINE.md).
Runtime tidak menyediakan data contoh atau hasil trading buatan.

Describe a strategy in one sentence. An agent trades tokenized stocks inside a vault with limits it cannot break, and commits every decision onchain.

Siro runs on **Robinhood Chain** (Arbitrum Orbit L2). Deposits are in **USDG**, gas is ETH.

Mainnet only: Robinhood Chain (4663), explorer [robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com). There is no testnet or local deployment.

| Contract | Address | Status |
|---|---|---|
| `Anchor` | `0xbf9f13791c1c5bcd6e342fb500c711e574fb04e0` | deployed 2026-11-14 |
| `SessionExecutor` | `0x3933768da40ead71fcf1104e45483d13112287e8` | deployed 2026-11-14 |
| `ChainlinkOracle` (USDG/USD feed `0x61B7e5650328764B076A108EFF5fa7282a1B9aD2`) | `0x18d197cD6454eF08d80c5FA92209B3aF31926ea9` | deployed 2026-11-15 |
| `AgentRegistry` | `0x0662564d7Ead0A9eb85E4F17cD21d422d339c459` | deployed 2026-11-15 |
| `GuardedVaultFactory` | `0x33f420792328958739e4983A9Bac7FB44297Cf91` | deployed 2026-11-15 |
| `UniswapV3Adapter` (router) | `0x8E662a5D28d089960d601e817aBa430e5981fdd2` | deployed 2026-11-15; routes + feeds for AAPL, MSFT, NVDA, AMZN, GOOGL, TSLA, META, SPY, QQQ, COIN |
| `SiroZap` (user swap + deposit) | `0x6F635334962beadc61c42011B8A892bc23ab7437` | deployed 2026-11-15, block 114474352; source verified on Sourcify (full match); whitelist: WETH9 only |

Not audited by a third party. Records: `contracts/deployments/`.

### Two swap paths, never mixed

| Path | Contract | Who calls it | Purpose |
|---|---|---|---|
| **User zap** (canonical for users) | `SiroZap` | Any wallet, from `/app/swap` | Swap ETH/WETH into the vault's asset (`vault.asset()`, USDG today) via SwapRouter02, then deposit for the receiver in one transaction. Vault must pass `factory.isVault()`. |
| **Vault-internal trades** | `UniswapV3Adapter` | Only a vault executor (SessionExecutor) | Rebalance trades inside a vault under its on-chain policy. Not for users; the zap never routes through it. |

### Swap page (/app/swap)

Spec: [docs/swap-brief.md](docs/swap-brief.md). Every address and tunable lives in `src/lib/config/swap.ts` and `src/lib/config/tokens.ts`.

- **Env:** set `NEXT_PUBLIC_SIRO_ZAP=0x6F635334962beadc61c42011B8A892bc23ab7437`. Startup throws if it is missing, zero or malformed. RPC goes through the existing relay `/api/rpc/4663`.
- **Add an input token:**
  1. The SiroZap owner calls `setWhitelisted(token, true)`.
  2. Confirm that a Uniswap v3 pool against the vault asset exists and has liquidity.
  3. Add the token to `SWAP_TOKENS` with `enabled: true`.

  Disabled entries show "pool not ready".
- **Fee tiers:** the tier with the best quoted output wins. `EXCLUDED_FEE_TIERS` (1% today) is a policy rule, applied only in `selectBestQuote`. The contract still accepts that tier.
- **Deploy the zap:**
  1. Dry run: `DEX_V3_ROUTER=… WETH9=… VAULT_FACTORY=… ZAP_WHITELIST=<WETH9> ALLOW_MAINNET_DEPLOY=true forge script script/DeploySiroZap.s.sol --rpc-url $RH_RPC_URL`
  2. Run the same command again with `--broadcast`.
  3. Verify with `forge verify-contract … --verifier sourcify`. Blockscout's API sits behind a Cloudflare challenge, so it cannot be used for this.
- **Tests:**
  - `npm run test:unit` runs Vitest: minOut, priceImpact, format, quote selection, errors and button states, plus the MSW interception proof.
  - `npm run test:e2e` runs Playwright: the happy path, and the no-route/insufficient-balance flow. It uses an in-page wallet stub and a mocked RPC.
  - On Windows, run both from `C:\` with an upper-case drive letter; otherwise Vitest cannot find its runner.
- **Modes:** the swap is real; the agent strategy runs in **paper** mode (real prices and fees, no real orders) until walk-forward validation passes. The PAPER badge appears on the swap page, in the Evidence header and next to every paper figure.

### Vault funding

| Date (UTC) | Vault | ETH in | USDG received | Deposited | Shares | Log |
|---|---|---|---|---|---|---|
| 2026-11-14 21:59 | agent #1 `0xB9db…242A` | 0.02 | 35.426113 (quote 35.421552, +0.013%) | 35.244444 | 35,244,444,000,000 | [docs/funding/2026-11-14-agent1-tranche1.md](docs/funding/2026-11-14-agent1-tranche1.md) |
| 2026-11-14 (block 114481077) | agent #1 via **SiroZap** smoke test | 0.002 | 3.535866 (quote 3.536163, −0.008%) | 3.535866 | 3,535,866,000,000 | same log, Step D |

Script: `contracts/script/FundVault.s.sol`, configured through env (`FUND_VAULT`, `FUND_ETH_WEI`, reserve, slippage, USDG range). A new tranche needs explicit approval.

> **Trust note: SiroZap owner.** `owner()` is the deployer hot key `0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4`.
> The owner can change the input-token whitelist. Ownership (`transferOwnership` + `acceptOwnership`)
> must move to a multisig before any serious funds flow through the zap.
`SiroCopyVault`, `SiroRiskGuard` and `SiroLeaderboard` are legacy contracts with known unsafe behavior
reproduced in `contracts/test/ReadinessAudit.t.sol`. The app does not use them; never deploy them.

## Structure
- `contracts/`: Foundry project.
  - `src/SiroCopyVault.sol`, `src/SiroRiskGuard.sol`, `src/SiroLeaderboard.sol`: legacy, unsafe, not deployed.
  - `src/GuardedVault.sol`, `src/DecisionLog.sol`, `src/AgentRegistry.sol`, `src/AgentTokenFactory.sol`, `src/FeeSplitter.sol`, `src/BuybackBurn.sol`: guarded agent platform.
  - `script/DeploySiro.s.sol`: mainnet-only deploy of oracle, registry and vault factory; writes `deployments/4663.json`.
  - `script/DeployEvidence.s.sol`: `Anchor` + `SessionExecutor`; `npm run deploy:evidence` writes `deployments/4663-evidence.json`.
- `scripts/sync-abi.mjs`: copies ABIs and deployment records into `src/lib/generated`.
- `src/lib/chains.ts`: network registry. `src/app/api/rpc/[chainId]/route.ts`: same-origin RPC relay with fallback upstreams, since robinhood.com is ISP-filtered in Indonesia.
- `src/lib/robinhood.ts`, `src/lib/chainlink-feeds.ts`, `src/lib/robinhood-chain.ts`: live Stock Token prices (Robinhood API, Chainlink feeds) and chain reads for `/markets`.

## Development
Requires Node 24+ and Foundry. The app always targets Robinhood Chain mainnet.

```bash
npm install
npm run contracts:build
npm run contracts:test     # fork tests need RH_RPC_URL, e.g. https://robinhood-rpc.publicnode.com
npm run abi:sync           # ABIs + contracts/deployments → src/lib/generated
npm run dev                # http://localhost:3000
```
