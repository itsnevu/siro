"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { TokenLogo } from "./TokenLogo";
import { DISABLED_TOKEN_REASON, SWAP_TOKENS, type SwapToken } from "@/lib/config/tokens";

const RECENT_KEY = "siro_swap_recent_v1";
const readRecent = (): string[] => { try { const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 4) : []; } catch { return []; } };
const writeRecent = (symbol: string) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([symbol, ...readRecent().filter((s) => s !== symbol)].slice(0, 4))); } catch { /* storage blocked */ } };

/** Subsequence fuzzy match over symbol and name, scored so prefix matches rank first. */
function score(t: SwapToken, q: string): number {
  if (!q) return 1;
  const hay = `${t.symbol} ${t.name}`.toLowerCase();
  const needle = q.toLowerCase();
  if (t.symbol.toLowerCase().startsWith(needle)) return 3;
  if (hay.includes(needle)) return 2;
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length ? 1 : 0;
}

export function TokenSelector({ selected, onSelect, balances }: { selected: SwapToken; onSelect: (t: SwapToken) => void; balances: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const onOpenChange = (o: boolean) => { if (o) { setRecent(readRecent()); setQuery(""); setActive(0); } setOpen(o); };

  const rows = useMemo(() => {
    const matched = SWAP_TOKENS.map((t) => ({ t, s: score(t, query) })).filter((x) => x.s > 0);
    matched.sort((a, b) => b.s - a.s || Number(b.t.enabled) - Number(a.t.enabled) || (recent.indexOf(a.t.symbol) + 1 || 99) - (recent.indexOf(b.t.symbol) + 1 || 99));
    return matched.map((x) => x.t);
  }, [query, recent]);
  const recentTokens = query ? [] : recent.map((s) => SWAP_TOKENS.find((t) => t.symbol === s && t.enabled)).filter((t): t is SwapToken => !!t);

  const choose = (t: SwapToken) => { if (!t.enabled) return; writeRecent(t.symbol); onSelect(t); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(rows.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && rows[active]) { e.preventDefault(); choose(rows[active]); }
  };
  useEffect(() => { listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button type="button" className="token-pill" aria-label={`Pay with ${selected.name}. Change token`}>
          <TokenLogo src={selected.logo} />{selected.symbol}<span aria-hidden>▾</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog" onKeyDown={onKey} aria-describedby={undefined}>
          <div className="dialog-head"><Dialog.Title>Select a token</Dialog.Title><Dialog.Close className="icon-btn" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></Dialog.Close></div>
          <input className="search" placeholder="Search name or symbol" aria-label="Search tokens" value={query} autoFocus
            role="combobox" aria-expanded aria-controls="token-listbox" aria-activedescendant={rows[active] ? `token-${rows[active].symbol}` : undefined}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }} />
          {recentTokens.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }} aria-label="Recent tokens">
              {recentTokens.map((t) => <button key={t.symbol} type="button" className="chip" onClick={() => choose(t)} style={{ minHeight: 44 }}>{t.symbol}</button>)}
            </div>
          )}
          <Tooltip.Provider delayDuration={150}>
            <ul id="token-listbox" role="listbox" aria-label="Tokens" className="token-list" ref={listRef}>
              {rows.length === 0 && <li className="muted" style={{ padding: 12 }}>No token matches “{query}”.</li>}
              {rows.map((t, i) => {
                const row = (
                  <li key={t.symbol} id={`token-${t.symbol}`} data-index={i} role="option" aria-selected={i === active} aria-disabled={!t.enabled || undefined}
                    className="token-row" onMouseEnter={() => setActive(i)} onClick={() => choose(t)}
                    aria-label={`${t.name}, ${t.symbol}${t.enabled ? `, balance ${balances[t.symbol] ?? "unknown"}` : `, unavailable: ${DISABLED_TOKEN_REASON}`}`}>
                    <TokenLogo src={t.logo} size={36} />
                    <span style={{ flex: 1, minWidth: 0 }}><b>{t.symbol}</b><br /><span className="muted" style={{ fontSize: 12 }}>{t.name}</span></span>
                    <span className="num muted" style={{ fontSize: 13 }}>{t.enabled ? balances[t.symbol] ?? "" : DISABLED_TOKEN_REASON}</span>
                  </li>
                );
                return t.enabled ? row : (
                  <Tooltip.Root key={t.symbol}>
                    <Tooltip.Trigger asChild>{row}</Tooltip.Trigger>
                    <Tooltip.Portal><Tooltip.Content className="tooltip" side="left">{DISABLED_TOKEN_REASON}</Tooltip.Content></Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
            </ul>
          </Tooltip.Provider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
