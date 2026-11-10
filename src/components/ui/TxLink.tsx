function truncateHash(hash: string) {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

export function TxLink({ hash, explorerUrl, label }: { hash: string; explorerUrl: string; label?: string }) {
  return (
    <a
      href={`${explorerUrl.replace(/\/$/, "")}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:text-accent-dark transition-colors"
    >
      {label ?? truncateHash(hash)}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5h5v5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </a>
  );
}
