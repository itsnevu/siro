"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";

type Message = {
  role: "user" | "agent";
  text: string;
  proposal?: {
    trades: { action: string; asset: string; amount: string }[];
    estimatedCost: string;
    riskLevel: string;
    policyChecks: { name: string; passed: boolean }[];
  };
};

const SUGGESTIONS = [
  "Rebalance my portfolio to 60% ETH, 30% BTC, 10% SOL",
  "What's the best entry point for ETH right now?",
  "Reduce my SOL exposure by 50%",
  "Show me top performing strategies this week",
];

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = (text: string) => {
    const userMsg: Message = { role: "user", text };
    const agentMsg: Message = {
      role: "agent",
      text: "I've analyzed your request and prepared the following trades for your approval:",
      proposal: {
        trades: [
          { action: "Sell", asset: "USDC", amount: "2,000.00" },
          { action: "Buy", asset: "ETH", amount: "0.8214" },
          { action: "Buy", asset: "SOL", amount: "12.50" },
        ],
        estimatedCost: "$3.42 (gas + slippage)",
        riskLevel: "Low",
        policyChecks: [
          { name: "Spending limit", passed: true },
          { name: "Asset whitelist", passed: true },
          { name: "Slippage tolerance", passed: true },
          { name: "Daily loss limit", passed: true },
        ],
      },
    };
    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setInput("");
  };

  return (
    <AppShell>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 220px)" }}>
        <div className="flex items-center gap-3 mb-4">
          <h1 className="font-serif text-[28px] text-ink">Agent</h1>
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[12px] text-muted">Online</span>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 mb-6">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted text-[14px]">Ask your agent to manage your portfolio.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-2 rounded-[10px] border border-line bg-surface text-[12px] text-muted hover:text-ink hover:border-ink transition text-left max-w-[280px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-[12px] p-4 ${
                msg.role === "user"
                  ? "bg-ink text-bg text-[13px]"
                  : "border border-line bg-surface text-[13px] text-ink"
              }`}>
                <p>{msg.text}</p>
                {msg.proposal && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[8px] border border-line bg-bg p-3 space-y-2">
                      <div className="text-[11px] text-muted uppercase tracking-wide">Proposed Trades</div>
                      {msg.proposal.trades.map((t, j) => (
                        <div key={j} className="flex justify-between text-[12px]">
                          <span className={t.action === "Buy" ? "text-green-600" : "text-red-500"}>{t.action}</span>
                          <span>{t.amount} {t.asset}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted">Est. Cost</span>
                      <span>{msg.proposal.estimatedCost}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted">Risk Level</span>
                      <span className="text-green-600">{msg.proposal.riskLevel}</span>
                    </div>
                    <div className="rounded-[8px] border border-line bg-bg p-3">
                      <div className="text-[11px] text-muted uppercase tracking-wide mb-2">Policy Checks</div>
                      {msg.proposal.policyChecks.map((c, j) => (
                        <div key={j} className="flex items-center gap-2 text-[12px]">
                          <span className={c.passed ? "text-green-600" : "text-red-500"}>{c.passed ? "✓" : "✗"}</span>
                          <span>{c.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 px-3 py-2 rounded-[8px] bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition">
                        Approve
                      </button>
                      <button className="flex-1 px-3 py-2 rounded-[8px] bg-red-500 text-white text-[12px] font-medium hover:bg-red-600 transition">
                        Reject
                      </button>
                      <button className="flex-1 px-3 py-2 rounded-[8px] border border-line text-[12px] font-medium text-muted hover:text-ink transition">
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-bg pt-2 pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input.trim() && sendMessage(input.trim())}
              placeholder="Tell your agent what to do..."
              className="flex-1 rounded-[10px] border border-line bg-surface px-4 py-3 text-[13px] text-ink outline-none focus:border-ink"
            />
            <button
              onClick={() => input.trim() && sendMessage(input.trim())}
              disabled={!input.trim()}
              className="px-5 py-3 rounded-[10px] bg-ink text-bg text-[13px] font-medium hover:opacity-90 transition disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
