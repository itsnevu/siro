"use client";
import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { AppShell } from "@/components/app/AppShell";
import { WorkspaceAccess } from "@/components/app/WorkspaceAccess";
import { buttonClass, inputClass } from "@/components/app/StrategyStudio";
import { useWorkspace } from "@/lib/workspace";
export default function SettingsPage() {
 const { address, connector, chainId } = useAccount(); const { disconnect } = useDisconnect(); const ws = useWorkspace(); const [name, setName] = useState<string>(), [message, setMessage] = useState("");
 return <AppShell><div className="py-10 space-y-5"><h1 className="font-serif text-3xl">Settings</h1><WorkspaceAccess /><section className="rounded-xl border border-line p-5 space-y-3"><h2 className="font-serif text-xl">Connected wallet</h2>{address ? <><p className="font-mono text-sm break-all">{address}</p><p className="text-sm">{connector?.name} | Chain {chainId}</p><button className={buttonClass} onClick={async () => { try { await ws.logout(); disconnect(); } catch { setMessage("Could not clear the server session. Retry before disconnecting."); } }}>Sign out and disconnect</button></> : <p>Connect your wallet using the header.</p>}</section><section className="rounded-xl border border-line p-5 space-y-3"><h2 className="font-serif text-xl">Profile</h2><label className="text-sm">Display name<input className={inputClass} maxLength={80} value={name ?? ws.workspace?.settings.displayName ?? ""} onChange={e => setName(e.target.value)} /></label><button className={buttonClass} disabled={!ws.workspace || ws.busy} onClick={async () => { try { await ws.save({ ...ws.workspace!, settings: { displayName: name ?? ws.workspace!.settings.displayName } }); setMessage("Profile saved to your wallet workspace."); } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); } }}>Save profile</button></section><p className="text-sm text-fg-70">Notifications and API-key issuance are not connected. Your provider credentials are managed only in the server environment.</p>{message && <p role="status">{message}</p>}</div></AppShell>;
}
