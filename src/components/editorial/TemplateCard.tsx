type Props = {
  badge?: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  meta?: string;
};

export function TemplateCard({ badge, icon, title, description, meta }: Props) {
  return (
    <div className="bg-card rounded-[28px] p-6 flex flex-col gap-4 card-lift">
      <div className="flex items-start justify-between">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shadow-soft text-lg">
            {icon}
          </div>
        )}
        {badge && <span className="pill-badge">{badge}</span>}
      </div>
      <h3 className="font-serif text-[24px] leading-tight">{title}</h3>
      <p className="text-fg-70 text-[15px] leading-relaxed flex-1">{description}</p>
      {meta && (
        <>
          <hr className="hairline" />
          <span className="mono-meta">{meta}</span>
        </>
      )}
    </div>
  );
}
