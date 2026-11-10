"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    trades: true,
    approvals: true,
    rebalance: false,
    newsletter: false,
  });

  const [apiKeys] = useState([
    { id: "1", name: "Production", key: "sk-siro-****...a3f2", created: "Oct 20, 2026" },
  ]);

  const [wallets] = useState([
    { address: "0x1234...5678", type: "MetaMask", connected: "Oct 15, 2026" },
  ]);

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-[28px] text-ink">Settings</h1>
          <p className="text-[13px] text-muted mt-1">Manage your account preferences.</p>
        </div>

        {/* Profile */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-ink">Profile</h3>
            <span className="text-[11px] text-muted bg-soft px-2 py-0.5 rounded">Coming soon</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50 pointer-events-none">
            <div>
              <label className="block text-[11px] text-muted mb-1">Display Name</label>
              <input type="text" placeholder="anon" className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none" />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Bio</label>
              <input type="text" placeholder="DeFi enthusiast" className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none" />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-medium text-ink">Notifications</h3>
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[13px] text-ink capitalize">{key === "trades" ? "Trade executions" : key === "approvals" ? "Pending approvals" : key === "rebalance" ? "Rebalance alerts" : "Newsletter"}</span>
              <button
                onClick={() => toggle(key as keyof typeof notifications)}
                className={`w-10 h-5 rounded-full transition relative ${value ? "bg-ink" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* API Keys */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-ink">API Keys</h3>
            <button className="px-3 py-1.5 rounded-[8px] bg-ink text-bg text-[12px] font-medium hover:opacity-90 transition">
              Generate Key
            </button>
          </div>
          {apiKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between py-2 border-b border-line last:border-0">
              <div>
                <div className="text-[13px] text-ink">{k.name}</div>
                <div className="text-[11px] text-muted font-mono">{k.key}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted">{k.created}</span>
                <button className="text-[11px] text-muted hover:text-ink">Copy</button>
              </div>
            </div>
          ))}
        </div>

        {/* Connected Wallets */}
        <div className="rounded-[12px] border border-line bg-surface p-5 space-y-4">
          <h3 className="text-[14px] font-medium text-ink">Connected Wallets</h3>
          {wallets.map((w) => (
            <div key={w.address} className="flex items-center justify-between py-2">
              <div>
                <div className="text-[13px] text-ink font-mono">{w.address}</div>
                <div className="text-[11px] text-muted">{w.type} · Connected {w.connected}</div>
              </div>
              <button className="text-[12px] text-red-500 hover:text-red-600">Disconnect</button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
