import "@/styles/siro.css";
import { Navbar } from "@/components/editorial/Navbar";
import { Footer } from "@/components/editorial/Footer";
import { EditorialHome } from "@/components/editorial/EditorialHome";

export default function Home() {
  return (
    <div className="editorial-site">
      <Navbar />
      <EditorialHome />
      <Footer />
    </div>
  );
}
