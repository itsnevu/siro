import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";
import { Faq } from "@/components/Faq";

export const metadata: Metadata = { title: "FAQ  Siro", description: "Understand Siro’s copy vaults, agent, fees, and risk controls." };
export default function FAQPage() {
  return <ProsePage wide eyebrow="A little more clarity" title="Good questions. Clear answers." lede="Get to know the thinking behind your vault, your agent, and your controls."><Faq /></ProsePage>;
}
