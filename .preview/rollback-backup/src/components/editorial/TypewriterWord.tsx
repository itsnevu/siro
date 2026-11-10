"use client";

import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

type Props = {
  words: string[];
  className?: string;
};

export function TypewriterWord({ words, className = "" }: Props) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(words[0] ?? "");
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

  useEffect(() => {
    if (reduce || !words.length) return;
    const word = words[index];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < word.length) {
        timeout = setTimeout(() => setText(word.slice(0, text.length + 1)), 80);
      } else {
        timeout = setTimeout(() => setPhase("hold"), 1500);
      }
    } else if (phase === "hold") {
      timeout = setTimeout(() => setPhase("deleting"), 0);
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(text.slice(0, -1)), 50);
      } else {
        setIndex((i) => (i + 1) % words.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(timeout);
  }, [text, phase, index, words, reduce]);

  return (
    <span className={`headline-pill ${className}`}>
      <span className="sr-only">{words[0]}</span>
      <span aria-hidden="true">{reduce ? words[0] : text}</span>
      <span aria-hidden="true" className="ml-px" style={{ animation: reduce ? "none" : "blink 1s step-end infinite" }}>
        |
      </span>
    </span>
  );
}
