type Feature = {
  title: string;
  description: string;
  icon?: React.ReactNode;
};

type Props = {
  items: Feature[];
};

export function NumberedFeatureList({ items }: Props) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="flex gap-5 py-6 border-b border-line last:border-b-0">
          <span className="mono-meta shrink-0 w-8 pt-1">
            {String(i + 1).padStart(2, "0")}
          </span>
          {item.icon && <span className="ed-feature-icon">{item.icon}</span>}
          <div>
            <h3 className="font-serif text-[20px] md:text-[24px] mb-1 leading-tight">{item.title}</h3>
            <p className="text-fg-70 text-[15px] leading-relaxed">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
