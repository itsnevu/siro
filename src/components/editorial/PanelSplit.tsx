import type { ReactNode } from "react";

type Props = {
  left: ReactNode;
  right: ReactNode;
  className?: string;
};

export function PanelSplit({ left, right, className = "" }: Props) {
  return (
    <div
      className={`bg-surface rounded-[40px] p-8 md:p-12 grid md:grid-cols-2 gap-8 md:gap-12 ${className}`}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
