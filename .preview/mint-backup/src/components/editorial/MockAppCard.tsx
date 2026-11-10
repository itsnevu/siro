type Row = {
  name: string;
  meta: string;
  segments: { value: number; color?: string }[];
};

const COLORS = ["#102a24", "#5d7a70", "#b9cfa8"];

export function MockAppCard({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-card rounded-3xl p-5 shadow-soft max-w-sm">
      <div className="bg-surface rounded-xl px-3 py-2 mb-4 text-muted text-sm">
        Search strategies...
      </div>
      <div className="flex gap-2 mb-4">
        {["All", "DCA", "Rebalance", "Momentum"].map((chip, i) => (
          <span
            key={chip}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              i === 0 ? "bg-fg text-cream" : "bg-surface text-muted"
            }`}
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const total = row.segments.reduce((s, seg) => s + seg.value, 0);
          return (
            <div key={row.name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{row.name}</div>
                <div className="mono-meta text-xs">{row.meta}</div>
              </div>
              <div className="flex items-center gap-0.5 h-2 w-20 rounded-full overflow-hidden bg-surface">
                {row.segments.map((seg, j) => (
                  <div
                    key={j}
                    className="h-full"
                    style={{
                      width: `${(seg.value / total) * 100}%`,
                      backgroundColor: seg.color || COLORS[j % COLORS.length],
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
