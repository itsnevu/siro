"use client";
import { AppShell } from "@/components/app/AppShell";
import { StrategyStudio } from "@/components/app/StrategyStudio";
import { useAccount } from "wagmi";
import { useNetwork } from "@/lib/network";
export default function StudioPage() { const { address } = useAccount(); const net = useNetwork(); return <AppShell><StrategyStudio key={`${net.id}:${address}`} /></AppShell>; }
