import "@/styles/pyris.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EditorialHome } from "@/components/editorial/EditorialHome";

export default function Home() {
  return <div className="rusd-shell editorial-site"><Header /><EditorialHome /><Footer /></div>;
}
