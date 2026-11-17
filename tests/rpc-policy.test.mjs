import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAllowedRpc } from '../services/anchor/rpc-policy.mjs';
import { freezeBatch, receiptGate } from '../services/anchor/execution-gate.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const batch = freezeBatch(['a'.repeat(64)], -1, 1);
function scenario(rpc, hosts) {
  const state = { reads: 0, executions: 0, misses: 0 };
  return { state, run: () => receiptGate({ batch, currentLeaves: () => batch.leaves,
    publish: async () => {
      assertAllowedRpc(rpc, hosts);
      state.reads++;
      return { root: batch.root, status: 'success' };
    },
    execute: async () => { state.executions++; },
    missedBatch: async () => { state.misses++; }, sleep: async () => {},
  }) };
}
test('explicitly allowlisted non-loopback host releases after receipt', async () => {
  const s = scenario('https://mainnet.rpc.example/private-path', 'mainnet.rpc.example');
  await s.run();
  assert.deepEqual(s.state, { reads: 1, executions: 1, misses: 0 });
});
test('unlisted host holds through failed-receipt path without a network request', async () => {
  const s = scenario('https://mainnet.rpc.example', undefined);
  await assert.rejects(s.run(), /not allowlisted/);
  assert.deepEqual(s.state, { reads: 0, executions: 0, misses: 1 });
});
test('defaults allow loopback; explicit empty lists and lookalike hosts deny', () => {
  for (const rpc of ['http://localhost:8547', 'http://127.0.0.1:8547', 'http://[::1]:8547']) assert.doesNotThrow(() => assertAllowedRpc(rpc));
  assert.throws(() => assertAllowedRpc('http://localhost', ''), /Invalid/);
  assert.throws(() => assertAllowedRpc('https://mainnet.rpc.example.attacker.test', 'mainnet.rpc.example'), /not allowlisted/);
  assert.throws(() => assertAllowedRpc('https://mainnet.rpc.example@attacker.test', 'mainnet.rpc.example'), /not allowlisted/);
  assert.throws(() => assertAllowedRpc('https://mainnet.rpc.example', '*.rpc.example'), /Invalid/);
  assert.throws(() => assertAllowedRpc('file:///localhost', 'localhost'), /HTTP/);
});
test('publisher CLI rejects unlisted host through missed-batch without creating a signed outbox', () => {
  const directory = mkdtempSync(join(tmpdir(), 'siro-rpc-policy-'));
  const key = generatePrivateKey();
  const journal = join(directory, 'anchor.jsonl');
  try {
    const child = spawnSync(process.execPath, ['services/anchor/witness.mjs', '--batch', '--once'], {
      env: { ...process.env, WITNESS_KEY: key, WITNESS_ADDRESS: privateKeyToAccount(key).address,
        SIRO_OPERATOR_ADDRESS: privateKeyToAccount(generatePrivateKey()).address,
        SIRO_ANCHOR_OWNER_ADDRESS: privateKeyToAccount(generatePrivateKey()).address,
        SIRO_ANCHOR_CHAIN_ID: '4663', SIRO_ANCHOR_ADDRESS: `0x${'1'.repeat(40)}`,
        SIRO_ANCHOR_RPC: 'https://unlisted.invalid', ALLOWED_RPC_HOSTS: 'localhost',
        SIRO_ANCHOR_CONFIRMATIONS: '2', SIRO_ANCHOR_JOURNAL: journal },
      input: JSON.stringify({ ...batch, root: batch.root.slice(2) }), encoding: 'utf8', timeout: 15000, windowsHide: true,
    });
    assert.ifError(child.error);
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /"kind":"missed-batch"/);
    assert.match(child.stderr, /not allowlisted/);
    assert.equal(existsSync(`${journal}.witness-outbox.json`), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
