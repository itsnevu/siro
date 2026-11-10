const VARIANTS: Record<string, string> = {
  live: "status-live",
  "coming-soon": "status-paper",
  backtested: "status-backtested",
  paper: "status-paper",
  planned: "text-fg-70",
};

export function Badge({ variant = "planned", children }: { variant?: keyof typeof VARIANTS | string; children: React.ReactNode }) {
  const cls = VARIANTS[variant] ?? VARIANTS.planned;
  return (
    <span className={`pill-badge ${cls}`}>
      {children}
    </span>
  );
}
