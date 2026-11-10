"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type Props = {
  text: string;
  className?: string;
};

export function ScrollRevealText({ text, className = "" }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.3"],
  });

  const words = text.split(" ");

  return (
    <p ref={ref} className={`serif-headline text-[36px] md:text-[56px] ${className}`}>
      {words.map((word, i) => (
        <Word key={i} progress={scrollYProgress} index={i} total={words.length}>
          {word}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  index,
  total,
}: {
  children: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  index: number;
  total: number;
}) {
  const start = index / total;
  const end = start + 1 / total;
  const opacity = useTransform(progress, [start, end], [0.2, 1]);
  const reduce = useReducedMotion();
  return (
    <motion.span style={{ opacity: reduce ? 1 : opacity }} className="inline-block mr-[0.3em]">
      {children}
    </motion.span>
  );
}
