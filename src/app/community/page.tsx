import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community | Siro",
  description: "Join the Siro community. Discord, Telegram, X, and ambassador program.",
};

const SOCIALS = [
  { name: "Discord", href: "#", desc: "Chat with traders, ask questions, share strategies.", icon: "💬" },
  { name: "Telegram", href: "#", desc: "Announcements, alpha, and community discussion.", icon: "📢" },
  { name: "X (Twitter)", href: "#", desc: "Follow for updates, threads, and market takes.", icon: "𝕏" },
];

const AMBASSADOR_PERKS = [
  "Early access to new features",
  "Exclusive $SIRO rewards pool",
  "Direct line to the core team",
  "Co-branded content opportunities",
  "Priority support",
];

export default function CommunityPage() {
  return (
    <main className="site-container py-24 md:py-40">
      <span className="eyebrow block mb-4">Community</span>
      <h1 className="serif-headline text-[44px] md:text-[84px] mb-6">
        Better together.
      </h1>
      <p className="text-muted text-lg max-w-2xl mb-16">
        Siro is built in the open. Join thousands of traders, builders, and strategists shaping the future of agentic investing.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-24">
        {SOCIALS.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-[28px] p-8 card-lift block"
          >
            <span className="text-3xl mb-4 block">{s.icon}</span>
            <h2 className="font-serif text-2xl mb-2">{s.name}</h2>
            <p className="text-muted text-[15px]">{s.desc}</p>
          </a>
        ))}
      </div>

      <div className="bg-surface rounded-[40px] p-8 md:p-12 grid md:grid-cols-2 gap-8">
        <div>
          <span className="eyebrow block mb-4">Ambassador Program</span>
          <h2 className="serif-headline text-[36px] md:text-[48px] mb-4">
            Represent <em>Siro</em>
          </h2>
          <p className="text-muted text-[15px] leading-relaxed mb-6">
            Ambassadors are community leaders who help grow Siro through content, education, and local meetups. Apply to join.
          </p>
          <a href="#" className="btn-primary">Apply now</a>
        </div>
        <div>
          <h3 className="font-serif text-xl mb-4">Perks</h3>
          <ul className="space-y-3">
            {AMBASSADOR_PERKS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px]">
                <span className="text-accent mt-0.5">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
