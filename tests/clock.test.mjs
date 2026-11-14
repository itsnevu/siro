import test from "node:test";
import assert from "node:assert/strict";
import { ntpTime, offsetMs, verdict, DRIFT_ALARM_MS } from "../services/ops/clock.mjs";

function reply(t2, t3, { stratum = 2, mode = 4 } = {}) {
  const b = Buffer.alloc(48);
  b[0] = (4 << 3) | mode; b[1] = stratum;
  const put = (ms, off) => { const s = Math.floor(ms / 1000) + 2_208_988_800; b.writeUInt32BE(s, off); b.writeUInt32BE(Math.round(((ms / 1000) % 1) * 2 ** 32), off + 4); };
  put(t2, 32); put(t3, 40);
  return b;
}

test("NTP timestamp decoding round-trips to the millisecond", () => {
  const t = Date.UTC(2026, 10, 13, 12, 0, 0, 250);
  assert.ok(Math.abs(ntpTime(reply(t, t), 32) - t) < 1);
});

test("offset: server 300 ms ahead with symmetric 20 ms delay", () => {
  const t1 = 1_000_000, t4 = t1 + 20;
  const r = offsetMs(reply(t1 + 10 + 300, t1 + 10 + 300), t1, t4);
  assert.ok(Math.abs(r.offset - 300) < 1);
  assert.ok(Math.abs(r.delay - 20) < 1);
  assert.throws(() => offsetMs(reply(t1, t1, { stratum: 0 }), t1, t4), /unsynchronised/);
  assert.throws(() => offsetMs(reply(t1, t1, { mode: 3 }), t1, t4));
});

test("verdict: median offset, alarm above 200 ms, alarm when nothing answers", () => {
  assert.equal(verdict([{ offset: 10 }, { offset: 15 }, { offset: 900 }]).alarm, false, "one bad server does not move the median");
  assert.equal(verdict([{ offset: DRIFT_ALARM_MS + 1 }, { offset: 250 }]).alarm, true);
  assert.equal(verdict([{ error: "timeout" }]).alarm, true);
});
