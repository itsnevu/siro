export function PriceBadge({ change }: { change: number }) {
  const positive = change >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium bg-surface-2 text-fg">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={positive ? "text-success" : "rotate-180 text-danger"}>
        <path d="M5 2l3.5 5h-7L5 2z" fill="currentColor"/>
      </svg>
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}
