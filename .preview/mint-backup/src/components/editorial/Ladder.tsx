type Step = {
  label: string;
  description: string;
  live: boolean;
};

export function Ladder({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-4">
          <div className="mt-1.5 shrink-0">
            {step.live ? (
              <div className="w-3 h-3 rounded-full bg-fg" />
            ) : (
              <div className="w-3 h-3 rounded-full border-2 border-faint" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg">{step.label}</span>
              {step.live ? (
                <span className="pill-badge text-[11px]">Live</span>
              ) : (
                <span className="pill-badge text-[11px] opacity-60">Unlocks when it ships</span>
              )}
            </div>
            <p className="text-muted text-sm mt-0.5">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
