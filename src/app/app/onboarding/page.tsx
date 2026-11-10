"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    title: "Welcome to Siro",
    desc: "An agentic investment platform for tokenized stocks on Elysium. Non-custodial, transparent, AI-powered.",
    icon: "👋",
  },
  {
    title: "Connect your wallet",
    desc: "Use your existing wallet or create one via Privy. Your keys stay yours. Export any time.",
    icon: "🔗",
  },
  {
    title: "Pick a strategy",
    desc: "Browse proven strategies from top traders. Or build your own in Studio. Backtest before committing.",
    icon: "📊",
  },
  {
    title: "Start trading",
    desc: "Go live with real funds or paper trade first. The agent executes within your risk policies. You approve everything.",
    icon: "🚀",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const current = STEPS[step];

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <div className="flex gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-fg" : "bg-line"
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-12">
          <span className="text-5xl mb-6 block">{current.icon}</span>
          <h1 className="font-serif text-[36px] md:text-[48px] leading-tight mb-4">{current.title}</h1>
          <p className="text-muted text-lg max-w-md mx-auto">{current.desc}</p>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary">
              Next
            </button>
          ) : (
            <button onClick={() => router.push("/app")} className="btn-primary">
              Get started
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
