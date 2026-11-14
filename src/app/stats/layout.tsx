import type { ReactNode } from "react";
import { RiskDisclaimer } from "@/components/RiskDisclaimer";

// Phase 18: every page in this segment shows numbers, so every page carries the risk disclaimer.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="site-container"><RiskDisclaimer /></div>
    </>
  );
}
