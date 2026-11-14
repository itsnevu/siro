// Phase 11: clock drift check against NTP (SNTP v4 over UDP). Alarm when |offset| > 200 ms.
//   node services/ops/clock.mjs            prints offset per server, exit 1 on alarm
import dgram from "node:dgram";

export const DRIFT_ALARM_MS = 200;
const NTP_EPOCH_OFFSET = 2_208_988_800; // seconds between 1900 and 1970

/** Milliseconds since Unix epoch from a 64-bit NTP timestamp at `offset` in a reply buffer. */
export function ntpTime(buf, offset) {
  const seconds = buf.readUInt32BE(offset) - NTP_EPOCH_OFFSET;
  const fraction = buf.readUInt32BE(offset + 4) / 2 ** 32;
  return (seconds + fraction) * 1000;
}

/** Standard SNTP offset: ((t2 - t1) + (t3 - t4)) / 2, with t1/t4 local send/receive times. */
export function offsetMs(reply, t1, t4) {
  if (reply.length < 48 || (reply[0] & 0x07) !== 4) throw new Error("not an NTP server reply");
  const stratum = reply[1];
  if (stratum === 0 || stratum > 15) throw new Error(`unsynchronised server (stratum ${stratum})`);
  const t2 = ntpTime(reply, 32), t3 = ntpTime(reply, 40);
  return { offset: ((t2 - t1) + (t3 - t4)) / 2, delay: (t4 - t1) - (t3 - t2), stratum };
}

export function query(host, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const req = Buffer.alloc(48);
    req[0] = 0x23; // LI=0, VN=4, Mode=3 (client)
    const timer = setTimeout(() => { socket.close(); reject(new Error(`${host}: timeout`)); }, timeoutMs);
    socket.once("message", msg => { const t4 = Date.now(); clearTimeout(timer); socket.close(); try { resolve({ host, ...offsetMs(msg, t1, t4) }); } catch (e) { reject(e); } });
    socket.once("error", e => { clearTimeout(timer); socket.close(); reject(e); });
    const t1 = Date.now();
    socket.send(req, 123, host);
  });
}

/** Median offset over servers that answered; alarm if above threshold or if none answered. */
export function verdict(results) {
  const ok = results.filter(r => Number.isFinite(r.offset)).map(r => r.offset).sort((a, b) => a - b);
  if (!ok.length) return { alarm: true, reason: "no NTP server reachable; clock unverified", median_offset_ms: null };
  const median = ok[Math.floor(ok.length / 2)];
  return { alarm: Math.abs(median) > DRIFT_ALARM_MS, reason: Math.abs(median) > DRIFT_ALARM_MS ? `clock drift ${median.toFixed(0)} ms exceeds ${DRIFT_ALARM_MS} ms` : "within tolerance", median_offset_ms: median };
}

if (process.argv[1]?.endsWith("clock.mjs")) {
  const servers = (process.env.SIRO_NTP_SERVERS ?? "time.cloudflare.com,time.google.com,pool.ntp.org").split(",");
  const results = await Promise.all(servers.map(h => query(h.trim()).catch(e => ({ host: h, error: e.message }))));
  const v = verdict(results);
  console.log(JSON.stringify({ results, ...v }, null, 2));
  process.exitCode = v.alarm ? 1 : 0;
}
