import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPublicClient, http, parseAbi } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { freezeBatch } from '../services/anchor/execution-gate.mjs';

// Opt-in integration command: node --test tests/witness-fork.test.mjs.
// No deploys or upstream writes. The only wallet transport is this loopback Anvil.
test('pinned local fork: three receipts, killed publisher resumes identical signed tx', { timeout: 180000 }, async () => {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const fork = process.env.FORK_URL || process.env.ALCHEMY_RPC_URL_4663;
  assert.ok(fork, 'Read-only FORK_URL is required');
  const pinned = Number(process.env.FORK_BLOCK || 116549770);
  assert.ok(Number.isSafeInteger(pinned) && pinned > 0, 'Pinned block required');
  const dir = mkdtempSync(join(tmpdir(), 'siro-witness-'));
  const port = 18547, rpc = `http://127.0.0.1:${port}`;
  const anvil = spawn(resolve(homedir(), '.foundry/bin', process.platform === 'win32' ? 'anvil.exe' : 'anvil'),
    ['--fork-url', fork, '--fork-block-number', String(pinned), '--chain-id', '4663', '--port', String(port), '--block-time', '1', '--silent'],
    { stdio: 'ignore', windowsHide: true });
  const children = new Set();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const client = createPublicClient({ transport: http(rpc, { timeout: 2000, retryCount: 0 }) });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { ready = await client.getChainId() === 4663; if (ready) break; } catch {}
      if (anvil.exitCode !== null) break;
      await sleep(500);
    }
    assert.ok(ready, 'Pinned Anvil fork did not start');
    assert.match(await client.request({ method: 'web3_clientVersion' }), /anvil/i);
    const key = generatePrivateKey(), witness = privateKeyToAccount(key);
    await client.request({ method: 'anvil_setBalance', params: [witness.address, '0x56bc75e2d63100000'] });
    const address = '0xbf9f13791c1c5bcd6e342fb500c711e574fb04e0';
    const owner = await client.readContract({ address, abi: parseAbi(['function owner() view returns(address)']), functionName: 'owner' });
    const env = { ...process.env, WITNESS_KEY: key, WITNESS_ADDRESS: witness.address,
      SIRO_OPERATOR_ADDRESS: privateKeyToAccount(generatePrivateKey()).address, SIRO_ANCHOR_OWNER_ADDRESS: owner,
      SIRO_ANCHOR_CHAIN_ID: '4663', SIRO_ANCHOR_ADDRESS: address, SIRO_ANCHOR_RPC: rpc,
      SIRO_ANCHOR_CONFIRMATIONS: '2', SIRO_ANCHOR_DEPLOYMENT_BLOCK: String(pinned),
      SIRO_ANCHOR_JOURNAL: join(dir, 'anchor.jsonl'),
      SIRO_LEDGER_BINARY: resolve('target/debug', process.platform === 'win32' ? 'ledger.exe' : 'ledger') };
    assert.ok(existsSync(env.SIRO_LEDGER_BINARY), 'Build ledger before fork test');
    const start = batch => {
      const child = spawn(process.execPath, ['services/anchor/witness.mjs', '--batch', '--once'], { env, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
      children.add(child);
      let errors = ''; child.stderr.on('data', d => { errors += d; });
      const done = new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('exit', code => { children.delete(child); resolve({ code, errors }); });
      });
      child.stdin.end(JSON.stringify({ ...batch, root: batch.root.slice(2) }));
      return { child, done };
    };
    const batchAt = hour => freezeBatch([hour.toString(16).padStart(64, '0')], hour - 1, hour);
    for (let hour = 1; hour <= 3; hour++) {
      const { code, errors } = await start(batchAt(hour)).done;
      assert.equal(code, 0, errors);
    }
    await client.request({ method: 'evm_setAutomine', params: [false] });
    await client.request({ method: 'evm_setIntervalMining', params: [0] });
    const interrupted = start(batchAt(4));
    const outbox = `${env.SIRO_ANCHOR_JOURNAL}.witness-outbox.json`;
    let saved;
    for (let i = 0; i < 100; i++) {
      try { saved = JSON.parse(readFileSync(outbox, 'utf8')); if (saved.tx_hash) break; } catch {}
      await sleep(50);
    }
    assert.ok(saved?.tx_hash, 'Signed witness outbox missing');
    interrupted.child.kill(); await interrupted.done;
    assert.equal(readFileSync(env.SIRO_ANCHOR_JOURNAL, 'utf8').trim().split('\n').length, 3, 'Killed tx must not release a receipt');
    await client.request({ method: 'evm_setAutomine', params: [true] });
    await client.request({ method: 'evm_setIntervalMining', params: [1] });
    const result = await start(batchAt(4)).done;
    assert.equal(result.code, 0, result.errors);
    const receipts = readFileSync(env.SIRO_ANCHOR_JOURNAL, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(receipts.length, 4);
    assert.equal(receipts[3].payload.tx_hash, saved.tx_hash);
    assert.equal((await start(batchAt(4)).done).code, 0, 'Confirmed batch retry must be idempotent');
    assert.equal(readFileSync(env.SIRO_ANCHOR_JOURNAL, 'utf8').trim().split('\n').length, 4);
  } finally {
    for (const child of children) child.kill();
    anvil.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
