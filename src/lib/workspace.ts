"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { useNetwork } from "./network";
import { type Workspace } from "./workspace-model";

async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...options?.headers }, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}
export function useWorkspace() {
  const { address } = useAccount();
  const net = useNetwork();
  const cache = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const auth = useQuery<{ address?: string }>({ queryKey: ["session", address], queryFn: async () => { const res = await fetch("/api/session", { cache: "no-store" }); if (res.status === 401) return {}; if (!res.ok) throw new Error("Could not read your session."); return res.json(); }, enabled: !!address, retry: false });
  const authenticated = !!address && auth.data?.address?.toLowerCase() === address.toLowerCase();
  const key = ["workspace", address, net.id];
  const data = useQuery<{ revision: number; workspace: Workspace }>({ queryKey: key, queryFn: () => request(`/api/workspace?chainId=${net.id}`), enabled: authenticated, retry: false });
  async function login() {
    if (!address) { setError("Connect your wallet first."); return; }
    setBusy(true); setError("");
    try {
      const challenge = await request("/api/session", { method: "POST", body: JSON.stringify({ action: "challenge", address, chainId: net.id }) });
      const signature = await signMessageAsync({ message: challenge.message });
      await request("/api/session", { method: "POST", body: JSON.stringify({ action: "verify", id: challenge.id, signature }) });
      await cache.invalidateQueries({ queryKey: ["session"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  async function save(workspace: Workspace) {
    if (!authenticated || !data.data) throw new Error("Sign in and load your workspace first.");
    setBusy(true); setError("");
    try { const result = await request("/api/workspace", { method: "PUT", body: JSON.stringify({ chainId: net.id, revision: data.data.revision, workspace }) }); cache.setQueryData(key, result); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed."); throw e; }
    finally { setBusy(false); }
  }
  return { authenticated, workspace: authenticated ? data.data?.workspace : undefined, busy, error: error || (authenticated ? data.error?.message : auth.error?.message) || "", login, save, refresh: data.refetch, logout: async () => { await request("/api/session", { method: "POST", body: JSON.stringify({ action: "logout" }) }); cache.removeQueries({ queryKey: ["workspace"] }); await cache.invalidateQueries({ queryKey: ["session"] }); } };
}
