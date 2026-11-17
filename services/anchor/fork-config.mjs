import { privateKeyToAccount } from 'viem/accounts';

export function readForkConfig(env) {
  if (!env.FORK_URL || !env.LOCAL_FORK_RPC || !Number.isSafeInteger(Number(env.FORK_BLOCK))) throw new Error('Fork URL, local RPC and pinned block required');
  const roles = {};
  for (const role of ['WITNESS', 'CREATOR', 'DEPOSITOR']) {
    const key = env[`${role}_KEY`], address = env[`${role}_ADDRESS`];
    if (!/^0x[0-9a-f]{64}$/i.test(key || '') || !/^0x[0-9a-f]{40}$/i.test(address || '')) throw new Error(`${role} key and address required`);
    if (privateKeyToAccount(key).address.toLowerCase() !== address.toLowerCase()) throw new Error(`${role} key/address mismatch`);
    roles[role] = { key, address };
  }
  if (new Set(Object.values(roles).map(x => x.address.toLowerCase())).size !== 3) throw new Error('Fork roles must use separate keys');
  return { block: Number(env.FORK_BLOCK), rpc: env.LOCAL_FORK_RPC, roles };
}
