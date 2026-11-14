"use client";
import Link from "next/link";
import { LINKS } from "@/lib/links";
import { nav } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

const COLUMNS = [
  { title: "Explore", links: [["Strategies", "/strategies"], ["Studio", "/studio"], ["Agent", "/agent"], ["Markets", "/markets"], ["Evidence", "/evidence"], ["Verify decisions", "/verify"]] },
  { title: "Learn", links: [["Documentation", "/docs"], ["API", "/api"], ["Security", "/security"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["Blog", "/blog"]] },
  { title: "Siro", links: [["About", "/about"], ["Roadmap", "/roadmap"], ["Get in touch", LINKS.support], ["Follow on X", LINKS.x]] },
];

export function Footer() {
  const [locale] = useLocale();
  const t = (s: string) => nav(locale, s);
  return (
    <footer className="ed-footer" data-tone="dark">
      <div className="site-container">
        <div className="ed-footer-top">
          <div className="ed-footer-brand"><Link href="/" className="ed-wordmark" aria-label="Siro home"><span className="siro-brand-mask" aria-hidden="true" style={{width:30,height:30}} />siro.</Link><p>{t("Onchain intelligence.")}<br />A more considered way forward.</p></div>
          {COLUMNS.map(column => <nav key={column.title} aria-label={column.title}><h2>{t(column.title)}</h2>{column.links.map(([label, href]) => <Link href={href} key={label}>{t(label)}</Link>)}</nav>)}
        </div>
        <p className="ed-footer-disclaimer">{t("Siro is in open beta. Digital assets involve risk, including the loss of capital. Published results identify their data source, trading mode and costs. Past performance does not guarantee future results.")}</p>
        <div className="ed-footer-bottom"><span>© {new Date().getFullYear()} Siro</span><div><Link href="/legal">{t("Legal")}</Link><Link href="/terms">{t("Terms")}</Link><Link href="/privacy">{t("Privacy")}</Link><Link href="/risk">{t("Risk disclosures")}</Link></div><span>Thoughtfully onchain.</span></div>
      </div>
    </footer>
  );
}
