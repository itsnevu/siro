import type { FAQItem } from "./types";

export const faq: FAQItem[] = [
  { question: "What is Siro?", answer: "Siro is an agentic investment platform for tokenized stocks on Elysium L2. You can follow proven strategies, build your own, or let AI agents manage your portfolio  all non-custodial.", category: "general" },
  { question: "What are tokenized stocks?", answer: "Tokenized stocks are ERC-20 tokens that track the price of real-world equities like AAPL, TSLA, and NVDA. They trade 24/7 on Elysium and settle instantly.", category: "general" },
  { question: "Is Siro custodial?", answer: "No. Your funds stay in your own vault smart contract. Siro never holds your keys or your capital. You can withdraw at any time.", category: "general" },
  { question: "What blockchain does Siro run on?", answer: "Siro runs on Elysium, a Kinetiq L2 built on Arbitrum Orbit. Gas is paid in HYPE.", category: "general" },

  { question: "How do I connect my wallet?", answer: "Click 'Continue' on the launch page and select your wallet from the list, or sign in with email to get a non-custodial wallet created automatically via Privy.", category: "wallet" },
  { question: "Which wallets are supported?", answer: "Siro supports MetaMask, Rabby, Coinbase Wallet, Rainbow, and any injected EVM wallet. Email sign-in creates an embedded wallet via Privy.", category: "wallet" },
  { question: "Can I export my wallet keys?", answer: "Yes. Wallets created through Privy allow you to export your private key at any time. You retain full ownership.", category: "wallet" },

  { question: "How do strategies work?", answer: "A strategy is a defined set of rules for allocating capital across tokenized stocks. Strategies can be buy-and-hold, DCA, fixed-weight, rebalancing, or momentum-based.", category: "strategies" },
  { question: "Can I create my own strategy?", answer: "Yes. The Strategy Studio lets you build strategies visually with a block-based editor, backtest them against historical data, and deploy them live.", category: "strategies" },
  { question: "How do I follow a strategy?", answer: "Browse the marketplace, pick a strategy, and deposit USDC into a vault that tracks it. Your vault mirrors the strategy's trades automatically.", category: "strategies" },
  { question: "What is paper trading?", answer: "Paper trading lets you simulate a strategy with virtual capital before committing real funds. Performance is tracked but no actual trades are executed.", category: "strategies" },

  { question: "What is the Siro Agent?", answer: "The Siro Agent is an AI-powered assistant that proposes trades, rebalances, and strategy adjustments. Every proposal passes through your policy engine and RiskGuard before execution.", category: "agent" },
  { question: "Can the agent trade without my approval?", answer: "Only if you configure auto-execute policies. By default, every agent proposal requires your explicit approval.", category: "agent" },
  { question: "What is the x402 API?", answer: "The x402 API lets external agents and services submit trade proposals to your vault using HTTP 402 micropayments. It enables a permissionless agent economy.", category: "agent" },

  { question: "What is $SIRO?", answer: "$SIRO is the platform's utility token. It's used for fee discounts, staking tiers, governance voting, and is the target of the monthly buyback-and-burn.", category: "token" },
  { question: "How does the buyback work?", answer: "Each month, 5% of protocol fees are used to buy $SIRO on the open market and burn it, permanently reducing supply.", category: "token" },
  { question: "Can I stake $SIRO?", answer: "Staking is coming in Q4 2026. Stakers will unlock fee discounts, priority access to new strategies, and governance voting power.", category: "token" },

  { question: "What fees does Siro charge?", answer: "Siro charges a 15% performance fee on profit only, calculated using a high-water mark. 10% goes to strategy leaders, 5% to the protocol. No management fees.", category: "fees" },
  { question: "Are there deposit or withdrawal fees?", answer: "No. Deposits and withdrawals are free. You only pay Elysium gas fees (in HYPE) for the transaction.", category: "fees" },

  { question: "What is RiskGuard?", answer: "RiskGuard is an onchain module that enforces per-vault risk limits: max trade size, daily loss limit, slippage tolerance, and a kill switch. No trade can bypass it.", category: "safety" },
  { question: "What happens if a strategy loses money?", answer: "Your vault's kill switch triggers if daily losses exceed your configured limit. You can also pause your vault manually at any time. Siro does not guarantee returns.", category: "safety" },
  { question: "Has Siro been audited?", answer: "Smart contract audits are in progress. All contracts are open-source and verified on-chain. Bug bounty details are available on the Security page.", category: "safety" },
];
