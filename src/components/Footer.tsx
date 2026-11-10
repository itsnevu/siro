import Link from "next/link";
import { LINKS } from "@/lib/links";

const COLUMNS = [
  { title: "Explore", links: [["Strategies", "/strategies"], ["Studio", "/studio"], ["Agent", "/agent"], ["Markets", "/markets"]] },
  { title: "Learn", links: [["Documentation", "/docs"], ["API", "/api"], ["Security", "/security"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["Blog", "/blog"]] },
  { title: "Siro", links: [["About", "/about"], ["Roadmap", "/roadmap"], ["Get in touch", LINKS.support], ["Follow on X", LINKS.x]] },
];

export function Footer() {
  return (
    <footer className="ed-footer" data-tone="dark">
      <div className="site-container">
        <div className="ed-footer-top">
          <div className="ed-footer-brand"><Link href="/" className="ed-wordmark" aria-label="Siro home"><span className="siro-brand-mask" aria-hidden="true" style={{width:30,height:30}} />siro.</Link><p>Onchain intelligence.<br />A more considered way forward.</p><span className="ed-footer-beta"><span className="ed-status-dot" /> Built in the open · Beta</span></div>
          {COLUMNS.map(column => <nav key={column.title} aria-label={column.title}><h2>{column.title}</h2>{column.links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</nav>)}
        </div>
        <p className="ed-footer-disclaimer">Siro is in open beta. Digital assets involve risk, including the loss of capital. Illustrative strategies and mock data are provided for information only and do not constitute investment advice. Past performance does not guarantee future results.</p>
        <div className="ed-footer-bottom"><span>© {new Date().getFullYear()} Siro</span><div><Link href="/legal">Legal</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/risk">Risk disclosures</Link></div><span>Thoughtfully onchain.</span></div>
      </div>
    </footer>
  );
}
