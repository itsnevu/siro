import test from 'node:test';
import assert from 'node:assert/strict';
import { freezeBatch, receiptGate } from '../services/anchor/execution-gate.mjs';

const leaves = ['a'.repeat(64), 'b'.repeat(64)];
const batch = freezeBatch(leaves, 0, 1);
test('three batches execute only after matching successful receipt', async () => {
  for (let hour = 1; hour <= 3; hour++) {
    const frozen = freezeBatch(leaves, hour - 1, hour), order = [];
    await receiptGate({ batch: frozen, currentLeaves: () => leaves,
      publish: async () => { order.push('receipt'); return { root: frozen.root, status: 'success' }; },
      execute: async () => order.push('execution') });
    assert.deepEqual(order, ['receipt', 'execution']);
  }
});
test('killed witness holds execution, emits missed batch, resumes same root', async () => {
  let executions = 0, misses = 0;
  const delays = [];
  const input = { batch, currentLeaves: () => leaves, execute: async () => executions++,
    missedBatch: async () => misses++, sleep: async ms => delays.push(ms) };
  await assert.rejects(receiptGate({ ...input, publish: async () => { throw new Error('Witness killed'); } }), /killed/);
  assert.equal(executions, 0); assert.equal(misses, 1); assert.deepEqual(delays, [1000, 2000]);
  await receiptGate({ ...input, publish: async () => ({ root: batch.root, status: 'success' }) });
  assert.equal(executions, 1);
});
test('leaf mutation during receipt wait refuses execution', async () => {
  let current = [...leaves];
  await assert.rejects(receiptGate({ batch, currentLeaves: () => current,
    publish: async () => { current.push('c'.repeat(64)); return { root: batch.root, status: 'success' }; },
    execute: async () => assert.fail('must hold') }), /changed/);
});
