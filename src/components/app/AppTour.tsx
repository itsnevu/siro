"use client";
import { useEffect, useCallback } from "react";
import "driver.js/dist/driver.css";

const SEEN_KEY = "siro_tour_seen_v1";

const STEPS = [
  { element: "[data-tour='connect']", title: "Connect your wallet", description: "Sign in with a browser wallet. Siro never asks for your recovery phrase and holds no funds." },
  { element: "[data-tour='sections']", title: "Workspace sections", description: "Overview, portfolio, strategies, the agent, approvals, schedules, policies and settings. Each section is one job." },
  { element: "[data-tour='main']", title: "This page", description: "The current section. Actions that need a deployed contract stay disabled and say why." },
  { element: "[data-tour='disclaimer']", title: "Read the numbers carefully", description: "Every figure is labelled backtest, paper or live, gross or net. Past or simulated results do not predict future results." },
  { element: "[data-tour='restart']", title: "Replay any time", description: "Open this tour again from here." },
];

export function AppTour() {
  const start = useCallback(async () => {
    const { driver } = await import("driver.js");
    const steps = STEPS.filter((s) => document.querySelector(s.element)).map((s) => ({ element: s.element, popover: { title: s.title, description: s.description } }));
    driver({ showProgress: true, popoverClass: "siro-tour", steps }).drive();
  }, []);

  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(SEEN_KEY) === "1"; localStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked: do not auto-start */ }
    if (!seen) { const id = setTimeout(() => void start(), 800); return () => clearTimeout(id); }
  }, [start]);

  return (
    <button type="button" data-tour="restart" onClick={() => void start()} className="rounded-pill border border-line px-3 py-1.5 text-[13px] text-fg-70 hover:text-ink">
      Tour
    </button>
  );
}
