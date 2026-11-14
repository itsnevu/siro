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

Not audited by a third party. Records: `contracts/deployments/`.
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
