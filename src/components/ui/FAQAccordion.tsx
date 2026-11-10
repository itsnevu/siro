"use client";

import { useState } from "react";

type FAQItem = { question: string; answer: string };

function Item({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-ink hover:text-accent transition-colors"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
      >
        {item.question}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-4 text-sm text-fg-70">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div className="divide-y-0 rounded-xl border border-line bg-surface px-5">
      {items.map((item, i) => <Item key={i} item={item} />)}
    </div>
  );
}
