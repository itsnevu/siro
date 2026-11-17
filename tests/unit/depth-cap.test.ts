import { expect, test } from 'vitest';
import { depthCap } from '../../src/lib/swap/depthCap';
import { HOUR } from '../../services/scheduler/core.mjs';
import cadence from '../../config/engine-cadence.json';

test('depth cap uses input side, respects inventory, and holds empty pools', () => {
  const q96 = 2n ** 96n;
  expect(depthCap(1000000n, q96, 2000000n, true).limit).toBe(2500n);
  expect(depthCap(1000000n, q96 * 2n, 2000000n, true).limit).toBe(1250n);
  expect(depthCap(1000000n, q96 * 2n, 2000000n, false).limit).toBe(5000n);
  expect(depthCap(1000000n, q96, 100n, true).limit).toBe(0n);
  expect(depthCap(0n, q96, 100n, true).limit).toBe(0n);
});
test('stop disclosure stays in sync with the unchanged hourly scheduler', () => {
  expect(cadence.stopCheckMinutes * 60000).toBe(HOUR);
});
