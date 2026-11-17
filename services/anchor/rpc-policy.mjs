export const LOOPBACK_RPC_HOSTS = '127.0.0.1,localhost,[::1]';

/** Exact hostname matching; no wildcards, suffix matching, paths, ports, or URL credentials. */
export function assertAllowedRpc(rpc, configuredHosts = LOOPBACK_RPC_HOSTS) {
  const url = new URL(rpc);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('RPC transport must be HTTP(S)');
  const hosts = configuredHosts.split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
  if (!hosts.length || hosts.some(host => !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[::1\])$/.test(host))) {
    throw new Error('Invalid ALLOWED_RPC_HOSTS: exact hostnames required');
  }
  if (!hosts.includes(url.hostname.toLowerCase())) throw new Error('RPC host is not allowlisted; execution held');
  return url.hostname;
}
