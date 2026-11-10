type Props = {
  value: string;
  label: string;
  sub?: string;
};

export function StatBlock({ value, label, sub }: Props) {
  return (
    <div className="text-center">
      <div className="font-serif text-[48px] md:text-[64px] leading-none tracking-tight">{value}</div>
      <div className="text-fg-70 text-[15px] mt-2">{label}</div>
      {sub && <div className="mono-meta mt-1">{sub}</div>}
    </div>
  );
}
