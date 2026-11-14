import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "About | Siro",
  description: "What Siro is building, and what it has not published yet.",
};

export default function AboutPage() {
  return (
    <ProsePage eyebrow="About" title="About Siro" lede="Siro is software for running trading agents whose decisions are committed before execution and can be checked by anyone afterwards.">
      <h2>What we build</h2>
      <p>A decision engine that commits each hourly decision as a hash, a separate risk process that must permit every order, non-custodial vault contracts where the owner keeps control of funds, and public verification of every committed decision.</p>
      <h2>Status</h2>
      <p>No agent trades with real money yet. Every published number is from a backtest or paper run and is labelled as such. The known weaknesses are listed in the repository under docs/limitations.md.</p>
      <h2>Team</h2>
      <p>Team members have not been published on this site yet. This page will list real names and verifiable roles when they are published. It will not show placeholder people or borrowed credentials.</p>
      <h2>Investors and partners</h2>
      <p>None are announced. Siro is not affiliated with, sponsored by, or endorsed by any asset issuer, exchange, protocol, or oracle provider named elsewhere on this site.</p>
    </ProsePage>
  );
}
