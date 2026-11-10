const VARIANTS: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-800",
  "coming-soon": "bg-amber-100 text-amber-800",
  backtested: "bg-blue-100 text-blue-800",
  paper: "bg-purple-100 text-purple-800",
  planned: "bg-gray-100 text-gray-600",
};

export function Badge({ variant = "planned", children }: { variant?: keyof typeof VARIANTS | string; children: React.ReactNode }) {
  const cls = VARIANTS[variant] ?? VARIANTS.planned;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}
