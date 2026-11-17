/** The server passes only this boolean to clients, never env contents. */
export function readDepositCapEnforced(value: string | undefined): boolean {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('DEPOSIT_CAP_ENFORCED must be true or false');
}
