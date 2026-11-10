import type { BlogPost } from "./types";

export const blogPosts: BlogPost[] = [
  {
    slug: "introducing-siro",
    title: "Introducing Siro: Agentic Investment on Elysium",
    excerpt: "Siro brings tokenized stock strategies to Elysium L2. Non-custodial vaults, onchain risk guards, and AI-powered agents  all controlled by you.",
    category: "Announcements",
    author: "Siro Team",
    date: "2026-09-15",
    readingMin: 5,
    coverImage: "/blog/introducing-siro.png",
  },
  {
    slug: "riskguard-explained",
    title: "How RiskGuard Keeps Your Capital Safe Onchain",
    excerpt: "Every trade proposed by a strategy or agent passes through RiskGuard before execution. Here's how max trade size, daily loss limits, and the kill switch work under the hood.",
    category: "Technical",
    author: "Siro Team",
    date: "2026-10-02",
    readingMin: 8,
    coverImage: "/blog/riskguard.png",
  },
  {
    slug: "tokenomics-siro-token",
    title: "$SIRO Tokenomics: Utility, Buyback, and Governance",
    excerpt: "A breakdown of $SIRO supply, fee distribution, the monthly buyback-and-burn mechanism, and what staking unlocks for strategy creators and followers.",
    category: "Token",
    author: "Siro Team",
    date: "2026-10-20",
    readingMin: 6,
    coverImage: "/blog/tokenomics.png",
  },
];
