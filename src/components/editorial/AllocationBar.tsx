type Segment = {
  label: string;
  value: number;
  color?: string;
};

const COLORS = ["var(--allocation-1)", "var(--allocation-2)", "var(--allocation-3)", "var(--allocation-4)"];

export function AllocationBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <div className="flex items-center gap-0.5 h-3 rounded-full overflow-hidden bg-surface">
      {segments.map((seg, i) => (
        <div
          key={seg.label}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{
            width: `${(seg.value / total) * 100}%`,
            backgroundColor: seg.color || COLORS[i % COLORS.length],
          }}
          title={`${seg.label}: ${seg.value}`}
        />
      ))}
    </div>
  );
}
