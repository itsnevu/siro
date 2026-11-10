"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ToneController() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    // Scroll changes only the backdrop. Foreground tokens belong to each theme.
    root.style.removeProperty("--page-bg");
    root.style.removeProperty("--fg");
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      const top = Math.round(innerHeight * 0.2);
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) root.dataset.scrollTone = entry.target.getAttribute("data-tone") ?? "light";
        }
      }, { rootMargin: `-${top}px 0px -${innerHeight - top - 1}px 0px`, threshold: 0 });
      document.querySelectorAll(".editorial-site [data-tone]:not([data-tone-local])").forEach(section => observer.observe(section));
    };
    root.dataset.scrollTone = "light";
    observe();
    window.addEventListener("resize", observe);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", observe);
      delete root.dataset.scrollTone;
    };
  }, [pathname]);
  return null;
}
