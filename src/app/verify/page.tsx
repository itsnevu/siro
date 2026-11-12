import type { Metadata } from "next";
import { ProductShell } from "@/components/vaulta/ProductShell";
import { Verifier } from "@/components/vaulta/Verifier";
export const metadata: Metadata = { title: "Decision Verifier" };
export default function VerifyPage() { return <ProductShell eyebrow="Decision verifier" title="Check the commitment." lede="Validate input shape locally, then compare the reconstructed Merkle root with DecisionLog on Robinhood Chain."><Verifier /></ProductShell>; }
