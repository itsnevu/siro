import fs from 'node:fs';
const token='src/styles/tokens.css';
let css=fs.readFileSync(token,'utf8');
const colors={'#dce5d8':'#F8F9F9','#e8eee5':'#F0F1F1','#f3f6f1':'#FFFFFF','#102a24':'#03211C','#5d6f68':'rgba(3,33,28,.70)','#a9b8b0':'rgba(3,33,28,.40)','#eef2ea':'#F8F9F9','#1a3d34':'#072B25','#234e44':'#0C3730','16,42,36':'3,33,28','16 42 36':'3 33 28','238,242,234':'248,249,249','rgba(185,207,168,.25)':'var(--primary-soft)'};
for(const [a,b] of Object.entries(colors)) css=css.replaceAll(a,b);
css=css.replace('--surface-2:#FFFFFF','--surface-2:#E8EAEA').replace('--dark-card:#072B25','--dark-card:#0A302A').replace('--card:#072B25','--card:#0A302A').replace('--line:rgba(248,249,249,.12)','--line:rgba(255,255,255,.12)');
fs.writeFileSync(token,css);
fs.writeFileSync('src/components/editorial/ToneController.tsx',`"use client";
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
      }, { rootMargin: \`-\${top}px 0px -\${innerHeight - top - 1}px 0px\`, threshold: 0 });
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
`);
fs.writeFileSync('src/components/editorial/Navbar.tsx','import { Header } from "@/components/Header";\n\nexport function Navbar() {\n  return <Header />;\n}\n');
const nav='src/components/HeaderNavigation.tsx';
let n=fs.readFileSync(nav,'utf8');
n=n.replace('  {\n    label: "Resources",','  {\n    label: "Token",\n    children: [\n      { label: "SIRO", href: "/token", desc: "Explore the Siro token" },\n      { label: "Tokenomics", href: "/tokenomics", desc: "Supply and distribution" },\n      { label: "Buyback", href: "/buyback", desc: "Protocol buyback activity" },\n    ],\n  },\n  {\n    label: "Resources",');
fs.writeFileSync(nav,n);
const footer='src/components/editorial/Footer.tsx';
let f=fs.readFileSync(footer,'utf8');
f=f.replace(/<img src="\/brand\/S-transparent.png"[^>]*\/>/,'<span aria-hidden="true" className="siro-brand-mask block h-7 w-7" />');
f=f.replace('bg-[#102a24] text-[#eef2ea]','bg-[var(--bg)] text-[var(--fg)]').replaceAll('text-[#a9b8b0]','text-[var(--fg-70)]').replaceAll('text-[#c5cfc8]','text-[var(--fg-70)]').replaceAll('text-[#5d6f68]','text-[var(--fg-70)]').replace('border-[rgba(238,242,234,0.1)]','border-[var(--line)]').replace('hover:text-white','hover:text-[var(--fg)]');
fs.writeFileSync(footer,f);
const page='src/app/page.tsx';let p=fs.readFileSync(page,'utf8');p=p.replace('      <div className="pt-16">\n        <EditorialHome />\n      </div>','      <EditorialHome />');fs.writeFileSync(page,p);
