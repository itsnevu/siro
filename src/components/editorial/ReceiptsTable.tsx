type Receipt = {
  date: string;
  label: string;
  amount: string;
  action?: { label: string; href: string };
};

export function ReceiptsTable({ receipts }: { receipts: Receipt[] }) {
  return (
    <div className="divide-y divide-line">
      {receipts.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-4">
          <div>
            <span className="mono-meta mr-4">{r.date}</span>
            <span className="text-[15px]">{r.label}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="mono-meta font-medium">{r.amount}</span>
            {r.action && (
              <a href={r.action.href} className="pill-badge hover:opacity-80">
                {r.action.label}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
