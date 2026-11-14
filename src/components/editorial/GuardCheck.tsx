"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Illustrative attempts the guard evaluates. Limits mirror the example policy on the page. */
const ATTEMPTS = [
  { action: "BUY NVDA", amount: "$800", checks: ["Under $1,000 per trade", "NVDA is whitelisted", "Router is approved"], ok: true, verdict: "Executed" },
  { action: "BUY TSLA", amount: "$5,000", checks: ["Under $1,000 per trade"], ok: false, verdict: "Blocked · max per trade" },
  { action: "TRANSFER", amount: "→ 0x7a…f3", checks: ["Recipient is the vault owner"], ok: false, verdict: "Blocked · agent cannot withdraw" },
  { action: "SWAP", amount: "unknown router", checks: ["Router is approved"], ok: false, verdict: "Blocked · not whitelisted" },
];

export function GuardCheck() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % ATTEMPTS.length), 3200);
    return () => clearInterval(id);
  }, [reduce]);
  const a = ATTEMPTS[i];
  return (
    <div className="ag-check" data-ok={a.ok} aria-live="polite">
      <div className="ag-check-head">
        <span className="ag-check-label">Agent proposes</span>
        <span className="ag-check-dots" aria-hidden="true">{ATTEMPTS.map((_, n) => <i key={n} data-on={n === i} />)}</span>
      </div>
      <div className="ag-check-trade" key={`t${i}`}><strong>{a.action}</strong><span>{a.amount}</span></div>
      <ul className="ag-check-list" key={`l${i}`}>
        {a.checks.map((c, n) => <li key={c} style={{ animationDelay: `${n * 0.18}s` }} data-ok={a.ok}>{a.ok ? "✓" : "✕"} {c}</li>)}
      </ul>
      <div className="ag-check-verdict" key={`v${i}`}>{a.verdict}</div>
    </div>
  );
}
