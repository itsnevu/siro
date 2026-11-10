import type { ReactNode } from "react";
import "@/styles/siro.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ClassicalArtwork } from "./ClassicalArtwork";
import "@/styles/product-pages.css";

export function MarketingShell({ children,artwork }: { children: ReactNode;artwork?:"column"|"urn"|"arch" }) {
  return <div className="rusd-shell editorial-site"><Header /><main className="ed-product-page" data-artwork={artwork?"true":undefined} data-tone="light" id="main-content" tabIndex={-1}>{artwork&&<ClassicalArtwork name={artwork} className="ed-product-intro-art"/>}{children}</main><Footer /></div>;
}
