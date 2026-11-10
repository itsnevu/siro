import type { RoadmapItem } from "./types";

export const roadmap: RoadmapItem[] = [
  { id: "rm-01", title: "Copy Vault v1", description: "Non-custodial vaults with leader following, deposit/withdraw, and high-water mark fees.", status: "shipped", quarter: "Q3 2026", category: "Core" },
  { id: "rm-02", title: "RiskGuard Onchain", description: "Per-vault risk parameters enforced at the contract level: max trade size, daily loss, kill switch.", status: "shipped", quarter: "Q3 2026", category: "Safety" },
  { id: "rm-03", title: "Leaderboard & Stats", description: "Onchain leader registration with PnL, Sharpe, drawdown, and follower tracking.", status: "shipped", quarter: "Q3 2026", category: "Core" },
  { id: "rm-04", title: "Strategy Studio", description: "Block-based visual strategy builder with backtest engine and paper trading.", status: "in-progress", quarter: "Q4 2026", category: "Product" },
  { id: "rm-05", title: "AI Agent Proposals", description: "AI agents propose trades and rebalances; users approve or auto-execute within policy bounds.", status: "in-progress", quarter: "Q4 2026", category: "Agent" },
  { id: "rm-06", title: "$SIRO Staking & Tiers", description: "Stake $SIRO to unlock fee discounts, priority access, and governance voting.", status: "in-progress", quarter: "Q4 2026", category: "Token" },
  { id: "rm-07", title: "x402 Agent API", description: "HTTP 402-based API for external agents to submit proposals and query vault state.", status: "planned", quarter: "Q1 2027", category: "Agent" },
  { id: "rm-08", title: "DCA & Scheduled Orders", description: "Automated dollar-cost averaging and recurring rebalance schedules.", status: "planned", quarter: "Q1 2027", category: "Product" },
  { id: "rm-09", title: "Multi-Chain Expansion", description: "Deploy vaults on additional Arbitrum Orbit chains and EVM L2s.", status: "planned", quarter: "Q2 2027", category: "Infrastructure" },
  { id: "rm-10", title: "Governance v1", description: "Token-weighted voting on protocol parameters, fee splits, and asset whitelisting.", status: "planned", quarter: "Q2 2027", category: "Governance" },
];
