import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDedicatedWitness, canonicalBatch } from '../services/anchor/witness-policy.mjs';
const a = 'a'.repeat(64), b = 'b'.repeat(64);
test('canonical commitment root and strict hour order', () => {
  assert.equal(canonicalBatch([a, b], 1, 2).leaves.length, 2);
  assert.throws(() => canonicalBatch([a], 2, 2), /monotonically/);
  assert.throws(() => canonicalBatch([b, a], 1, 2), /Noncanonical/);
  assert.throws(() => canonicalBatch([a, a], 1, 2), /Noncanonical/);
});
test('dedicated key differs from operator and owner', () => {
  const w = '0x' + '1'.repeat(40), op = '0x' + '2'.repeat(40), owner = '0x' + '3'.repeat(40);
  assert.doesNotThrow(() => assertDedicatedWitness(w, op, owner));
  assert.throws(() => assertDedicatedWitness(op, op, owner), /operator/);
});
