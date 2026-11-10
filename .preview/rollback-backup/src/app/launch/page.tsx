"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";

function SiroLogo({ size = 36, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      height={size}
      width={size}
      src="/brand/S-transparent.png"
      style={{ display: "block" }}
    />
  );
}

function CheckIcon() {
  return (
    <span className="launch-check">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3.5 7l2.5 2.5L10.5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const POPULAR_WALLETS = [
  { name: "Rabby Wallet", icon: "/wallets/rabby.svg" },
  { name: "MetaMask", icon: "/wallets/metamask.svg" },
  { name: "Coinbase Wallet", icon: "/wallets/coinbase.svg" },
  { name: "Rainbow", icon: "/wallets/rainbow.svg" },
  { name: "Robinhood Wallet", icon: "/wallets/robinhood.svg" },
  { name: "Base", icon: "/wallets/base.svg" },
  { name: "1inch Wallet", icon: "/wallets/1inch.svg" },
  { name: "37x", icon: "/wallets/37x.svg" },
  { name: "3S Wallet", icon: "/wallets/3s.svg" },
  { name: "88wallet", icon: "/wallets/88wallet.svg" },
];

function SignInModal({ onClose }: { onClose: () => void }) {
  const { connectors, connect, isPending } = useConnect();
  const [email, setEmail] = useState("");
  const [showWallets, setShowWallets] = useState(false);
  const [walletSearch, setWalletSearch] = useState("");

  const allWallets = POPULAR_WALLETS;
  const filteredWallets = walletSearch.trim()
    ? allWallets.filter((w) => w.name.toLowerCase().includes(walletSearch.toLowerCase()))
    : allWallets;

  const handleWalletClick = (walletName: string) => {
    const match = connectors.find((c) => c.name.toLowerCase().includes(walletName.toLowerCase()));
    if (match) {
      connect({ connector: match });
    } else {
      const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];
      if (injected) connect({ connector: injected });
    }
  };

  if (showWallets) {
    return (
      <div className="launch-overlay" onClick={onClose}>
        <div className="launch-modal" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <div className="launch-modal-header">
            <button className="launch-modal-back" onClick={() => setShowWallets(false)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="launch-modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="launch-modal-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="16" rx="3" stroke="#6366f1" strokeWidth="1.5" />
              <path d="M4 13h24" stroke="#6366f1" strokeWidth="1.5" />
            </svg>
          </div>

          <h2 className="launch-modal-title">Select your wallet</h2>

          <div className="launch-wallet-search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="launch-wallet-search-icon">
              <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.4" />
              <path d="M11 11l3 3" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder={`Search through ${allWallets.length} wallets`}
              value={walletSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalletSearch(e.target.value)}
              className="launch-wallet-search-input"
            />
          </div>

          <div className="launch-wallet-list">
            {filteredWallets.map((wallet) => (
              <button
                key={wallet.name}
                className="launch-wallet-item"
                disabled={isPending}
                onClick={() => handleWalletClick(wallet.name)}
              >
                <img src={wallet.icon} alt="" width={36} height={36} className="launch-wallet-icon" />
                <span className="launch-wallet-name">{wallet.name}</span>
              </button>
            ))}
          </div>

          <div className="launch-protected">
            Protected by <span className="launch-protected-logo"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" fill="#8B8B9E"/><circle cx="8" cy="8" r="3" fill="#fff"/></svg> privy</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="launch-overlay" onClick={onClose}>
      <div className="launch-modal" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="launch-modal-header">
          <div />
          <button className="launch-modal-close" onClick={onClose}>✕</button>
        </div>

        <h2 className="launch-modal-title">Sign in to Siro</h2>
        <p className="launch-modal-subtitle">Capital follows intelligence.</p>

        <div className="launch-modal-options">
          <div className="launch-option-row">
            <span className="launch-option-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="#6366f1" strokeWidth="1.3" />
                <path d="M2 7l8 5 8-5" stroke="#6366f1" strokeWidth="1.3" />
              </svg>
            </span>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="launch-email-input"
            />
            <button className="launch-email-submit" disabled={!email.trim()}>Submit</button>
          </div>

          <button className="launch-option-row launch-option-wallet" onClick={() => setShowWallets(true)}>
            <span className="launch-option-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="#6366f1" strokeWidth="1.3" />
                <path d="M2 9h16" stroke="#6366f1" strokeWidth="1.3" />
              </svg>
            </span>
            <span className="launch-option-wallet-text">Continue with a wallet</span>
          </button>
        </div>

        <div className="launch-protected">
          Protected by <span className="launch-protected-logo"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" fill="#8B8B9E"/><circle cx="8" cy="8" r="3" fill="#fff"/></svg> privy</span>
        </div>
      </div>
    </div>
  );
}

export default function LaunchPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [showSignIn, setShowSignIn] = useState(false);

  if (isConnected) {
    router.push("/app");
    return null;
  }

  return (
    <div className="launch-page">
      {/* Left Panel */}
      <div className="launch-left">
        <div className="launch-left-top">
          <div className="launch-brand">
            <SiroLogo size={28} />
            <span className="launch-brand-name">siro</span>
          </div>
        </div>

        <div className="launch-left-bottom">
          <SiroLogo size={64} />
          <h1 className="launch-tagline">
            Capital follows{" "}
            <em className="launch-tagline-italic">intelligence.</em>
          </h1>
        </div>

        <div className="launch-left-footer">
          <span className="launch-chain-label">Built on Elysium · eip155:99801</span>
        </div>
      </div>

      {/* Right Panel */}
      <div className="launch-right">
        <div className="launch-right-content">
          <h2 className="launch-welcome">
            Welcome to <em className="launch-welcome-italic">Siro</em>
          </h2>
          <p className="launch-welcome-sub">Sign in with your email or your own wallet.</p>

          <div className="launch-features">
            <div className="launch-feature">
              <CheckIcon />
              <span>A non-custodial wallet on Elysium, created for you at sign-in</span>
            </div>
            <div className="launch-feature">
              <CheckIcon />
              <span>Your keys stay yours: export them any time</span>
            </div>
            <div className="launch-feature">
              <CheckIcon />
              <span>Agents propose, the policy engine checks, you approve</span>
            </div>
          </div>

          <button className="launch-continue-btn" onClick={() => setShowSignIn(true)}>
            Continue
          </button>

          <p className="launch-disclaimer">
            Siro is software, not investment advice. Wallets are secured by Privy; Siro never holds your keys.
          </p>
        </div>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
