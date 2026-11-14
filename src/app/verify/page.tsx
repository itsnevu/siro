import { ProsePage } from "@/components/ProsePage";
import { DecisionVerifier } from "@/components/trading/DecisionVerifier";
export const metadata = { title: "Verify decisions | Siro" };
const TEXT = {
  en: { title: "Verify a decision", lede: "Inspect the commitment, reveal, hash chain, Merkle proofs, publication witness and anchor. Everything is recomputed in your browser; no account is needed." },
};
export default function VerifyPage() {
  const t = TEXT.en;
  return <ProsePage title={t.title} lede={t.lede}><DecisionVerifier /></ProsePage>;
}
