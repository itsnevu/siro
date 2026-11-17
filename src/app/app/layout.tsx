import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { AppProviders } from '@/components/app/AppProviders';
import { DepositCapPolicy } from '@/components/app/DepositCapPolicy';
import { readDepositCapEnforced } from '@/lib/deposit-cap-policy';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection();
  const enforced = readDepositCapEnforced(process.env.DEPOSIT_CAP_ENFORCED);
  return <DepositCapPolicy enforced={enforced}><AppProviders>{children}</AppProviders></DepositCapPolicy>;
}
