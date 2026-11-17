import { ProsePage } from "@/components/ProsePage";
import { DecisionVerifier } from "@/components/trading/DecisionVerifier";
export const metadata = { title: "Verify decisions | Siro" };
const TEXT = {
  en: { title: "Verify a decision", lede: "The browser recomputes content hashes and Merkle paths. The server separately checks chain receipts and execution timing; no account is needed. Reveals and trade associations are served by the operator." },
};
export default function VerifyPage() {
  const t = TEXT.en;
  return <ProsePage title={t.title} lede={t.lede}><DecisionVerifier /></ProsePage>;
}
