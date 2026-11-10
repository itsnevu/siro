type Segment = {
  label: string;
  value: number;
  color?: string;
};

const COLORS = ["#102a24", "#3d5a50", "#5d7a70", "#b9cfa8"];

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
