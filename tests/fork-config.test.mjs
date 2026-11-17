import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { readForkConfig } from '../services/anchor/fork-config.mjs';
test('fork keys are paired and distinct', () => {
  const env = { FORK_URL: 'https://example.invalid', LOCAL_FORK_RPC: 'http://127.0.0.1:8547', FORK_BLOCK: '116549770' };
  for (const role of ['WITNESS', 'CREATOR', 'DEPOSITOR']) { env[`${role}_KEY`] = generatePrivateKey(); env[`${role}_ADDRESS`] = privateKeyToAccount(env[`${role}_KEY`]).address; }
  assert.equal(readForkConfig(env).roles.WITNESS.address, env.WITNESS_ADDRESS);
  env.CREATOR_KEY = env.WITNESS_KEY; env.CREATOR_ADDRESS = env.WITNESS_ADDRESS;
  assert.throws(() => readForkConfig(env), /separate/);
});
