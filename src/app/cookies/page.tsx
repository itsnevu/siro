import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Siro",
  description: "How Siro uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <main className="site-container py-24 md:py-40 max-w-3xl mx-auto">
      <span className="eyebrow block mb-4">Legal</span>
      <h1 className="serif-headline text-[44px] md:text-[64px] mb-8">Cookie Policy</h1>
      <div className="space-y-6 text-[15px] text-muted leading-relaxed">
        <p>Last updated: November 2026</p>

        <h2 className="font-serif text-2xl text-fg mt-8">What are cookies?</h2>
        <p>
          Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences and understand how you interact with it.
        </p>

        <h2 className="font-serif text-2xl text-fg mt-8">Cookies we use</h2>
        <p><strong>Essential cookies:</strong> Required for the site to function. These handle wallet session state and basic preferences. Cannot be disabled.</p>
        <p><strong>Analytics cookies:</strong> Help us understand how visitors use the site. We use privacy-respecting analytics with no personal data collection. You can opt out via your browser settings.</p>
        <p><strong>Preference cookies:</strong> Remember your settings such as theme preference. Optional.</p>

        <h2 className="font-serif text-2xl text-fg mt-8">Third-party cookies</h2>
        <p>
          We do not use third-party advertising cookies. Our analytics provider does not track users across sites.
        </p>

        <h2 className="font-serif text-2xl text-fg mt-8">Managing cookies</h2>
        <p>
          You can delete or block cookies through your browser settings. Note that disabling essential cookies may prevent parts of the site from working correctly.
        </p>

        <h2 className="font-serif text-2xl text-fg mt-8">Contact</h2>
        <p>
          Questions about this policy? Email <a href="mailto:support@siro.trade" className="underline hover:text-fg">support@siro.trade</a>.
        </p>
      </div>
    </main>
  );
}
