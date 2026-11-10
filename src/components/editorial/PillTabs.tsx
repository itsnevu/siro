"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  tabs: string[];
  activeIndex?: number;
  onChange?: (index: number) => void;
};

export function PillTabs({ tabs, activeIndex: controlledIndex, onChange }: Props) {
  const [internalIndex, setInternalIndex] = useState(0);
  const id = useId();
  const reduce = useReducedMotion();
  const active = controlledIndex ?? internalIndex;

  const handleClick = (i: number) => {
    setInternalIndex(i);
    onChange?.(i);
  };

  return (
    <div className="inline-flex bg-card rounded-full p-1 shadow-soft relative">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          type="button"
          aria-pressed={active === i}
          onClick={() => handleClick(i)}
          className={`relative z-10 px-5 py-2 text-[14px] font-medium rounded-full transition-colors ${
            active === i ? "text-primary-fg" : "text-fg-70 hover:text-fg"
          }`}
        >
          {active === i && (
            <motion.div
              layoutId={`pill-indicator-${id}`}
              className="absolute inset-0 bg-primary rounded-full"
              style={{ zIndex: -1 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          {tab}
        </button>
      ))}
    </div>
  );
}
