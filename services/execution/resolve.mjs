// Automatic resolution of a broadcast whose outcome the RPC did not make certain.
// Pure: every chain access is injected, so the decision logic is tested without a chain.
//
// Outcomes:
//   { outcome: "mined", receipt }                 the original transaction has a receipt
//   { outcome: "not_executed", reason, cancelHash } provably not executed; safe to cancel the order
//   throws UncertainOutcome                       nothing provable; operator reconciliation needed
//
// "Provably not executed" requires BOTH: the sender's confirmed nonce has moved past our nonce
// (so our signed bytes can never be mined again) AND SessionExecutor.executed(id) is false at a
// block no older than that nonce read. Quorum readers return null when RPCs disagree; null never
// counts as proof.
export const NOT_EXECUTED_EXIT = 3;
export class UncertainOutcome extends Error {}

export async function resolveOutcome({ tx, getReceipt, confirmedNonce, executed, rebroadcast, sendCancel, now, sleep, deadlineMs, cancelDeadlineMs, pollMs }) {
  if (!(deadlineMs > 0 && cancelDeadlineMs > 0 && pollMs > 0)) throw new Error("Invalid resolution timing");
  const start = now();
  let cancel = null;
  for (;;) {
    const original = await getReceipt(tx.hash);
    if (original) return { outcome: "mined", receipt: original };
    if (cancel) {
      const replacement = await getReceipt(cancel.hash);
      if (replacement) {
        const done = await executed();
        if (done === false) return { outcome: "not_executed", reason: "cancellation transaction mined in place of the order", cancelHash: cancel.hash };
        throw new UncertainOutcome("Cancellation mined but executor state is not provably unexecuted");
      }
    }
    const nonce = await confirmedNonce();
    if (nonce !== null && nonce > tx.nonce) {
      const done = await executed();
      if (done === false) {
        // Re-check: the original may have been mined between the receipt read and the nonce read.
        if (await getReceipt(tx.hash)) continue;
        return { outcome: "not_executed", reason: "sender nonce consumed by another transaction and order id unexecuted", cancelHash: cancel?.hash ?? null };
      }
      // executed === true (receipt not visible yet on this RPC) or unknown: keep waiting.
    }
    const elapsed = now() - start;
    if (cancel && elapsed >= deadlineMs + cancelDeadlineMs) throw new UncertainOutcome("Order and cancellation both unresolved; reconcile the outbox manually");
    if (!cancel && elapsed >= deadlineMs) cancel = await sendCancel();
    else if (!cancel) await rebroadcast().catch(() => {});
    await sleep(pollMs);
  }
}

/** Value agreed by every reader, or null if any reader fails or they disagree. */
export async function quorum(readers) {
  const values = await Promise.all(readers.map(r => r().then(v => ({ ok: true, v }), () => ({ ok: false }))));
  if (values.some(x => !x.ok)) return null;
  const first = values[0].v;
  return values.every(x => x.v === first) ? first : null;
}

/** EIP-1559 replacement fees: at least +12.5% on both caps (nodes require >= +10%). */
export function bumpedFees({ maxFeePerGas, maxPriorityFeePerGas }) {
  if (typeof maxFeePerGas !== "bigint" || typeof maxPriorityFeePerGas !== "bigint") throw new Error("Cancellation needs an EIP-1559 original");
  const bump = v => v + (v * 125n + 999n) / 1000n;
  return { maxFeePerGas: bump(maxFeePerGas), maxPriorityFeePerGas: bump(maxPriorityFeePerGas) };
}
