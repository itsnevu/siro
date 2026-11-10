type Status = "shipped" | "in-progress" | "planned";
type TimelineItem = { status: Status; title: string; description: string; quarter: string };

const DOT: Record<Status, string> = {
  shipped: "bg-primary",
  "in-progress": "bg-primary animate-pulse",
  planned: "bg-faint",
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-line" />
      {items.map((item, i) => (
        <div key={i} className="relative mb-8 last:mb-0">
          <div className={`absolute -left-8 top-1.5 h-3 w-3 rounded-full ring-4 ring-surface ${DOT[item.status]}`} />
          <p className="text-xs font-medium uppercase tracking-wider text-fg-70">{item.quarter}</p>
          <h3 className="mt-0.5 text-sm font-semibold text-ink">{item.title}</h3>
          <p className="mt-1 text-sm text-fg-70">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
