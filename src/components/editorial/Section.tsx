"use client";

import { useRef, useEffect, type ReactNode } from "react";

type Props = {
  tone?: "light" | "dark";
  className?: string;
  children: ReactNode;
  id?: string;
};

export function Section({ tone = "light", className = "", children, id }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll(".section-enter").forEach((child) => {
              child.classList.add("in-view");
            });
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      data-tone={tone}
      className={`py-24 md:py-40 ${tone === "dark" ? "bg-bg text-fg" : ""} ${className}`}
    >
      <div className="site-container section-enter">{children}</div>
    </section>
  );
}
