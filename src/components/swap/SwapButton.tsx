import type { ButtonState } from "@/lib/swap/buttonState";

const ACTIONABLE = new Set<ButtonState["kind"]>(["connect", "wrong_network", "approve", "swap"]);
const BUSY = new Set<ButtonState["kind"]>(["approving", "preparing", "quoting"]);

export function SwapButton({ state, onClick }: { state: ButtonState; onClick: () => void }) {
  const busy = BUSY.has(state.kind);
  return (
    <button type="button" className="swap-btn" disabled={!ACTIONABLE.has(state.kind)} aria-busy={busy || undefined}
      data-tone={state.kind === "swap" && state.label === "Swap anyway" ? "danger" : undefined} data-state={state.kind} onClick={onClick}>
      {busy && <span className="spinner" aria-hidden />}
      {state.label}
    </button>
  );
}
