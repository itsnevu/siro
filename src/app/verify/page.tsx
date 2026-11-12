import type { Metadata } from "next";
import { Verifier } from "@/components/vaulta/Verifier";
export const metadata: Metadata = { title: "Decision Verifier" };
export default function VerifyPage() { return <Verifier />; }
