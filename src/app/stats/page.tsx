import { ProsePage } from "@/components/ProsePage";
import { RegistrySurface } from "@/components/RegistrySurface";
export const metadata = { title: "Onchain Statistics | Siro", description: "Observed factory registry and vault values, without estimated user or performance counts." };
export default function StatsPage() { return <ProsePage eyebrow="Statistics" title="Observed onchain activity" lede="Registry counts and vault values come from the configured chain. Unavailable data is left unavailable."><RegistrySurface stats /></ProsePage>; }
