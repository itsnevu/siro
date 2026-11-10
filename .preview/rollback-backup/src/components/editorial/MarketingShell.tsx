import type { ReactNode } from "react";
import "@/styles/pyris.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function MarketingShell({ children }: { children: ReactNode }) {
  return <div className="rusd-shell editorial-site"><Header /><main className="ed-product-page" data-tone="light" id="main-content">{children}</main><Footer /></div>;
}
