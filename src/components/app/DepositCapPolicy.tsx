'use client';
import { createContext, useContext, type ReactNode } from 'react';
const Context = createContext<boolean | null>(null);
export function DepositCapPolicy({ enforced, children }: { enforced: boolean; children?: ReactNode }) {
  return <Context.Provider value={enforced}>{children}</Context.Provider>;
}
export function useDepositCapEnforced() {
  const enforced = useContext(Context);
  if (enforced === null) throw new Error('Deposit cap policy provider is missing');
  return enforced;
}
export function DirectDepositControls({ disabled, className, onDeposit }: { disabled: boolean; className?: string; onDeposit: () => void }) {
  const enforced = useDepositCapEnforced();
  return <>
    <p>{enforced ? 'Direct-deposit depth ceiling unavailable for this vault; deposits are held until a strategy-specific pool depth quote is configured.' : 'Capacity is not yet strategy-specific. Deposit cap enforcement is off; direct deposits are available.'}</p>
    <button className={className} disabled={enforced || disabled} onClick={enforced ? undefined : onDeposit}>{enforced ? 'Deposit held — depth unavailable' : 'Approve / deposit'}</button>
  </>;
}
