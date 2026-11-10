"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** One observation line selects the tone; separate section observers never race. */
export function ToneController() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const tones = new Map<Element, boolean>();
    const apply = () => {
      const active = [...tones].filter(([, visible]) => visible).map(([el]) => el)
        .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
      const dark = active?.getAttribute("data-tone") === "dark";
      root.style.setProperty("--page-bg", dark ? "#102a24" : "#dce5d8");
      root.style.setProperty("--fg", dark ? "#eef2ea" : "#102a24");
    };
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      tones.clear();
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => tones.set(entry.target, entry.isIntersecting));
        apply();
      }, { rootMargin: `-${Math.round(innerHeight * 0.2)}px 0px -${Math.round(innerHeight * 0.79)}px 0px`, threshold: 0 });
      document.querySelectorAll(".editorial-site [data-tone]").forEach(el => observer.observe(el));
    };
    observe();
    window.addEventListener("resize", observe);
    apply();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", observe);
      root.style.removeProperty("--page-bg");
      root.style.removeProperty("--fg");
    };
  }, [pathname]);
  return null;
}
