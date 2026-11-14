"use client";
import { useWorkspace } from "@/lib/workspace";
export function WorkspaceAccess() {
  const ws = useWorkspace();
  return <div className="my-4 space-y-2 text-sm">{!ws.authenticated && <><p className="text-fg-70">Sign a message to access your saved strategies and settings. No gas is required.</p><button className="rounded-pill border border-line px-4 py-2 disabled:opacity-40" disabled={ws.busy} onClick={ws.login}>{ws.busy ? "Waiting for wallet..." : "Sign in with wallet"}</button></>}{ws.error && <p role="alert">{ws.error}</p>}</div>;
}
