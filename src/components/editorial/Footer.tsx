import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Strategies", href: "/strategies" },
      { label: "Studio", href: "/studio" },
      { label: "Agent", href: "/agent" },
      { label: "Markets", href: "/markets" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
      { label: "Changelog", href: "/changelog" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Brand", href: "/brand" },
      { label: "Contact", href: "/contact" },
      { label: "Community", href: "/community" },
      { label: "Referral", href: "/referral" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Risk", href: "/risk" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer data-tone="dark" className="bg-[var(--bg)] text-[var(--fg)] pt-20 pb-10">
      <div className="site-container">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <span aria-hidden="true" className="siro-brand-mask block h-7 w-7" />
              <span className="font-serif text-xl tracking-tight">siro.</span>
            </Link>
            <p className="text-[var(--fg-70)] text-sm leading-relaxed">
              Agentic investing on tokenized stocks. Non-custodial. On Robinhood Chain.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[var(--fg-70)] text-xs font-medium uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-[var(--fg-70)] hover:text-[var(--fg)] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--line)] pt-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[var(--fg-70)] text-xs">
            <p>© 2026 Siro. All rights reserved.</p>
            <p className="max-w-xl leading-relaxed">
              Siro is software, not a broker, exchange, or investment adviser. Tokenized stocks are synthetic assets. Past performance does not guarantee future results. $SIRO is a utility token, not a security.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
