"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Keep each cell's column label available when rows stack on small screens. */
export function ResponsiveTables() {
  const pathname = usePathname();
  useEffect(() => {
    document.querySelectorAll<HTMLTableElement>(".editorial-site main table").forEach(table => {
      const labels = Array.from(table.querySelectorAll("thead th"), cell => cell.textContent ?? "");
      if (!labels.length) return;
      table.classList.add("ed-responsive-table");
      table.querySelectorAll("tbody tr").forEach(row => {
        Array.from(row.children).forEach((cell, i) => cell.setAttribute("data-label", labels[i] ?? ""));
      });
    });
  }, [pathname]);
  return null;
}
