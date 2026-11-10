import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referral Program | Siro",
  description: "Invite friends to Siro and earn $SIRO rewards on every referral.",
};

const TIERS = [
  { min: 1, max: 10, reward: "50 $SIRO per referral", badge: "Starter" },
  { min: 11, max: 50, reward: "75 $SIRO per referral", badge: "Advocate" },
  { min: 51, max: null, reward: "100 $SIRO per referral + 5% fee share", badge: "Champion" },
];

const STEPS = [
  { num: "01", title: "Get your link", desc: "Connect your wallet and copy your unique referral link from the app." },
  { num: "02", title: "Share it", desc: "Send your link to friends, post it on socials, or include it in your content." },
  { num: "03", title: "Earn rewards", desc: "When someone signs up and makes their first deposit, you both earn $SIRO." },
];

export default function ReferralPage() {
  return (
    <main className="site-container py-24 md:py-40">
      <span className="eyebrow block mb-4">Referral Program</span>
      <h1 className="serif-headline text-[44px] md:text-[84px] mb-6">
        Share Siro, <em>earn $SIRO.</em>
      </h1>
      <p className="text-muted text-lg max-w-2xl mb-16">
        Invite friends to Siro. When they deposit and trade, you both earn token rewards.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-24">
        {STEPS.map((s) => (
          <div key={s.num} className="bg-card rounded-[28px] p-8">
            <span className="mono-meta text-2xl block mb-4">{s.num}</span>
            <h2 className="font-serif text-2xl mb-2">{s.title}</h2>
            <p className="text-muted text-[15px]">{s.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="serif-headline text-[36px] md:text-[48px] mb-8">Reward tiers</h2>
      <div className="bg-surface rounded-[28px] overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-6 py-4 text-muted text-sm font-medium">Tier</th>
              <th className="px-6 py-4 text-muted text-sm font-medium">Referrals</th>
              <th className="px-6 py-4 text-muted text-sm font-medium">Reward</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t.badge} className="border-b border-line last:border-b-0">
                <td className="px-6 py-4">
                  <span className="pill-badge">{t.badge}</span>
                </td>
                <td className="px-6 py-4 mono-meta">
                  {t.max ? `${t.min} - ${t.max}` : `${t.min}+`}
                </td>
                <td className="px-6 py-4 text-[15px]">{t.reward}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-faint text-sm">
        Rewards are distributed monthly. Siro reserves the right to modify or end the program at any time.
      </p>
    </main>
  );
}
