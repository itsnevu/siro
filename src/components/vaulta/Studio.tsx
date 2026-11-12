"use client";

import { useMemo, useState } from "react";
import { ProductShell, StatusTag } from "./ProductShell";

const examples = [
  "Rebalance weekly across approved stock tokens. Keep at least 25% in USDG and cap each position at 15%.",
  "Buy only when 30-day momentum is positive. Exit below the 50-day average and stop after a 2% daily loss.",
  "Hold three approved technology stock tokens with inverse-volatility weights and monthly rebalancing.",
];

function compile(input: string) {
  const lower = input.toLowerCase();
  const position = Number(lower.match(/(?:cap|position)(?:\s+\w+){0,4}\s+(\d{1,2})%/)?.[1] ?? 20);
  const dailyLoss = Number(lower.match(/(?:loss|stop)(?:\s+\w+){0,5}\s+(\d{1,2})%/)?.[1] ?? 3);
  const cadence = lower.includes("monthly") ? "monthly" : lower.includes("weekly") ? "weekly" : "daily";
  return { universe: "approved_stock_tokens", cadence, maxPositionBps: Math.min(position, 100) * 100, dailyLossLimitBps: Math.min(dailyLoss, 100) * 100, requireFreshOracle: true, humanReview: true };
}

export function Studio() {
  const [input, setInput] = useState(examples[0]);
  const [compiled, setCompiled] = useState(false);
  const policy = useMemo(() => compile(input), [input]);
  const riskScore = Math.max(1, Math.min(100, Math.round(92 - policy.maxPositionBps / 150 - policy.dailyLossLimitBps / 100)));
  return <ProductShell eyebrow="AGENT STUDIO / LOCAL PREVIEW" title="TURN INTENT INTO POLICY." lede="Describe the strategy. Review the compiled constraints. Backtest before any onchain action.">
    <section className="vp-workspace">
      <aside className="vp-sidebar"><h2>Examples</h2>{examples.map((example, index) => <button key={example} type="button" onClick={() => { setInput(example); setCompiled(false); }}><span>0{index + 1}</span>{example}</button>)}</aside>
      <div className="vp-editor">
        <div className="vp-panel-head"><span>STRATEGY.INPUT</span><StatusTag tone="neutral">NO FUNDS</StatusTag></div>
        <textarea aria-label="Natural language strategy" value={input} onChange={(event) => { setInput(event.target.value); setCompiled(false); }} />
        <button className="v-btn" type="button" onClick={() => setCompiled(true)}>Compile Policy ↗</button>
      </div>
      <div className="vp-output">
        <div className="vp-panel-head"><span>POLICY.JSON</span><StatusTag tone={compiled ? "lime" : "neutral"}>{compiled ? "VALID" : "PREVIEW"}</StatusTag></div>
        <pre>{JSON.stringify(policy, null, 2)}</pre>
        <div className="vp-score"><span>VAULTA RISK SCORE</span><strong>{riskScore}<small>/100</small></strong><p>Rule-based preview. A higher score means tighter permissions, not guaranteed performance.</p></div>
      </div>
    </section>
    <section className="vp-note"><StatusTag tone="red">NOT AUDITED</StatusTag><p>Compilation is local and deterministic in this preview. Deployments require wallet review and explicit confirmation.</p></section>
  </ProductShell>;
}
