"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

import { LINKS } from "@/lib/links";
import "@/styles/navigation-motion.css";

type NavItem = {
  label: string;
  href?: string;
  children?: { label: string; href: string; desc?: string }[];
};

const NAV: NavItem[] = [
  {
    label: "Product",
    children: [
      { label: "Leaderboard", href: LINKS.app, desc: "Browse top-performing wallets" },
      { label: "Strategies", href: "/strategies", desc: "Find your starting point" },
      { label: "Studio", href: "/studio", desc: "Shape your own approach" },
      { label: "Agent", href: "/agent", desc: "Intelligence within your boundaries" },
      { label: "How It Works", href: "/#how", desc: "Step-by-step copy flow" },
    ],
  },
  {
    label: "Token",
    children: [
      { label: "SIRO", href: "/token", desc: "Explore the Siro token" },
      { label: "Tokenomics", href: "/tokenomics", desc: "Supply and distribution" },
      { label: "Buyback", href: "/buyback", desc: "Protocol buyback activity" },
    ],
  },
  {
    label: "Resources",
    children: [
      { label: "Docs", href: LINKS.docs, desc: "Technical documentation" },
      { label: "Whitepaper", href: LINKS.whitepaper, desc: "Protocol deep-dive" },
      { label: "Blog", href: LINKS.blog, desc: "Updates & insights" },
      { label: "API", href: "/api", desc: "Resources for builders" },
      { label: "FAQ", href: "/faq", desc: "Good questions, clear answers" },
      { label: "Risk", href: LINKS.risk, desc: "Risk disclosures" },
    ],
  },
  { label: "Markets", href: "/markets" },
];

function Dropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="nav-dropdown" ref={ref} onPointerEnter={event => { if (event.pointerType === "mouse") setOpen(true); }} onPointerLeave={event => { if (event.pointerType === "mouse") setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); ref.current?.querySelector("button")?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button
        className="rusd-nav-link nav-dropdown-trigger"
        onClick={event => {
          const pointerHover=event.detail>0&&window.matchMedia("(hover: hover) and (pointer: fine)").matches;
          setOpen(current=>pointerHover?true:!current);
        }}
        aria-expanded={open}
        type="button"
      >
        {item.label}
        <svg className="nav-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && item.children && (
        <div className="nav-dropdown-menu">
          {item.children.map((child) => (
            <Link key={child.label} href={child.href} className="nav-dropdown-item" onClick={() => setOpen(false)}>
              <span className="nav-dropdown-item-label">{child.label}</span>
              {child.desc && <span className="nav-dropdown-item-desc">{child.desc}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeaderNavigation() {
  const [open, setOpen] = useState(false);
  const navigation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navigation.current?.querySelector<HTMLElement>("nav button, nav a")?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(navigation.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", trapFocus); };
  }, [open]);
  return (
    <div className="dockyard-header-navigation" ref={navigation}>
      <button
        aria-controls="nav"
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        className="dockyard-nav-toggle"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </button>
      <nav aria-label="Primary" className="rusd-nav" data-open={open ? "true" : "false"} id="nav" onKeyDown={event => { if (event.key === "Escape") { setOpen(false); event.currentTarget.parentElement?.querySelector("button")?.focus(); } }} onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        {NAV.map((item) =>
          item.children ? (
            <Dropdown key={item.label} item={item} />
          ) : (
            <Link key={item.href} className="rusd-nav-link" href={item.href!}>
              {item.label}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}
