import { headers } from "next/headers";
import { ProsePage } from "@/components/ProsePage";
import { DecisionVerifier } from "@/components/trading/DecisionVerifier";
import { LocaleSwitch } from "@/components/LocaleSwitch";
export const metadata = { title: "Verify decisions | Siro" };
const TEXT = {
  en: { title: "Verify a decision", lede: "Inspect the commitment, reveal, hash chain, Merkle proofs, publication witness and anchor. Everything is recomputed in your browser; no account is needed." },
  id: { title: "Verifikasi satu keputusan", lede: "Periksa komitmen, reveal, rantai hash, proof Merkle, witness publikasi, dan anchor. Semua dihitung ulang di browsermu; tidak perlu akun." },
};
export default async function VerifyPage() {
  const t = TEXT[(await headers()).get("x-siro-locale") === "id" ? "id" : "en"];
  return <ProsePage title={t.title} lede={t.lede}><LocaleSwitch /><DecisionVerifier /></ProsePage>;
}
