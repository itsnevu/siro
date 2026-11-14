import { ProsePage } from "@/components/ProsePage";
import { RegistrySurface } from "@/components/RegistrySurface";
export const metadata = { title: "Registered Strategies | Siro", description: "Factory-built agent vaults read from the blockchain." };
export default function StrategiesPage() { return <ProsePage eyebrow="Strategies" title="Registered agent vaults" lede="Only factory-registered vaults appear here. Listing does not imply audited performance or an active keeper."><RegistrySurface /></ProsePage>; }
