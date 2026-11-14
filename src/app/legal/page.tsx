import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = { title: "Legal | Siro", description: "Siro’s terms, privacy policy, and risk disclosures." };
const documents = [
  { title: "Terms of use", description: "The terms that govern your use of Siro.", href: "/terms" },
  { title: "Privacy policy", description: "How information is handled when you use the platform.", href: "/privacy" },
  { title: "Risk disclosures", description: "Understand the risks before committing capital.", href: "/risk" },
];
export default function LegalPage() {
  return <ProsePage eyebrow="The details matter" title="Clarity, in writing." lede="Our policies and disclosures, together in one place."><div className="ed-template-grid">{documents.map(document => <Link className="ed-template-card card-lift" key={document.href} href={document.href}><h2>{document.title}</h2><p>{document.description}</p><span className="ed-text-link">Read document <span aria-hidden="true">↗</span></span></Link>)}</div></ProsePage>;
}
