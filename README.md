# Siro: guarded trading agents on Robinhood Chain

Describe a strategy in one sentence. An agent trades tokenized stocks inside a vault with limits it cannot break, and commits every decision onchain.

Siro runs on **Robinhood Chain** (Arbitrum Orbit L2). Deposits are in **USDG**, gas is ETH.

| Network | Chain id | Explorer | Status |
|---|---|---|---|
| Robinhood Chain | 4663 | [robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) | Not deployed |
| Robinhood Chain Testnet | 46630 | [explorer.testnet.chain.robinhood.com](https://explorer.testnet.chain.robinhood.com) | Not deployed |

Not audited. `contracts/test/ReadinessAudit.t.sol` reproduces open vault issues that must be fixed before any deployment with real funds.

## Structure
- `contracts/`: Foundry project.
  - `src/SiroCopyVault.sol`, `src/SiroRiskGuard.sol`, `src/SiroLeaderboard.sol`: vault, per-user risk limits, leader stats.
  - `src/GuardedVault.sol`, `src/DecisionLog.sol`, `src/AgentRegistry.sol`, `src/AgentTokenFactory.sol`, `src/FeeSplitter.sol`, `src/BuybackBurn.sol`: guarded agent platform.
  - `script/DeploySiro.s.sol`: deploys the vault, guard and leaderboard and writes `deployments/<chainId>.json`.
- `scripts/sync-abi.mjs`: copies ABIs and deployment records into `src/lib/generated`.
- `src/lib/chains.ts`: network registry. `src/app/api/rpc/[chainId]/route.ts`: same-origin RPC relay with fallback upstreams, since robinhood.com is ISP-filtered in Indonesia.
- `src/lib/robinhood.ts`, `src/lib/chainlink-feeds.ts`, `src/lib/robinhood-chain.ts`: live Stock Token prices (Robinhood API, Chainlink feeds) and chain reads for `/markets`.

## Local development
Requires Node 20+ and Foundry.

```bash
npm install
npm run contracts:build
npm run contracts:test     # fork tests need RH_RPC_URL, e.g. https://robinhood-rpc.publicnode.com
npm run chain              # local Anvil
npm run deploy:local       # DeploySiro + abi:sync
npm run dev                # http://localhost:3000
```
