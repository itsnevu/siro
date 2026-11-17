'use client';
import { useEffect, useState } from 'react';
export function EvidenceStatus() {
  const [status, setStatus] = useState<Record<string, unknown>>({});
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => fetch('/api/evidence-status', { cache: 'no-store', signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setStatus).catch(() => setStatus({}));
    refresh(); const timer = setInterval(refresh, 60000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  return <section aria-label="Evidence status" className="border rounded p-4 my-6"><dl>{[
    ['last_witness', 'Last witness (chain)'], ['last_anchor', 'Last anchor (chain)'],
    ['last_heartbeat', 'Last scheduler heartbeat (operator)'], ['session_count', 'Enabled, unexpired sessions (chain)'],
    ['decisions_without_reveal', 'Decisions without reveal, including pending (operator)'],
  ].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{status[key] === null || status[key] === undefined ? 'unavailable' : String(status[key])}</dd></div>)}</dl>
    <p>Root and session fields require a complete chain scan. Unknown values are never reported as zero. Heartbeats and reveal availability are operator observations.</p>
  </section>;
}
