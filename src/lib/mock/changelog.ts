import type { ChangelogEntry } from "./types";

export const changelog: ChangelogEntry[] = [
  {
    version: "0.3.0",
    date: "2026-10-28",
    title: "Strategy Studio Beta",
    changes: [
      "Block-based visual strategy builder",
      "Backtest engine with historical data from 2024",
      "Paper trading mode for live simulation",
      "Export strategy as shareable link",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-15",
    title: "Copy Vault Launch",
    changes: [
      "Non-custodial vault smart contracts deployed on Elysium testnet",
      "Follow up to 5 leaders per vault",
      "RiskGuard with max trade size, daily loss limit, and kill switch",
      "Leaderboard with PnL, Sharpe ratio, and drawdown tracking",
      "15% performance fee with high-water mark",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-08-01",
    title: "Initial Preview",
    changes: [
      "Landing page and launch flow",
      "Wallet connection via Privy (email + injected wallets)",
      "Elysium testnet integration",
      "Basic vault dashboard with deposit/withdraw",
    ],
  },
];
