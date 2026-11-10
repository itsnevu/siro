"use client";

import { useState } from "react";

function truncate(addr: string) {
  return addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function AddressChip({ address, explorerUrl }: { address: string; explorerUrl?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const chip = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-soft/50 px-2.5 py-1 font-mono text-xs text-muted">
      {truncate(address)}
      <button onClick={copy} className="hover:text-ink transition-colors" title="Copy address" type="button">
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
        )}
      </button>
    </span>
  );

  if (explorerUrl) {
    return <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">{chip}</a>;
  }
  return chip;
}
