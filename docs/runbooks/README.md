---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook

Satu file per mode kegagalan. **Belum ada runbook yang pernah dilatih** (game day) per
2026-11-13. Setelah latihan, catat tanggal dan hasilnya di bagian "Latihan" tiap file.

Aturan umum untuk semua insiden:

1. **Hentikan dulu, selidiki kemudian.** Kill switch: `touch "$SIRO_KILL_FILE"`. Risk engine
   memveto semua order selama file itu ada, termasuk order pengurang posisi.
2. Jangan menyunting journal. Journal append-only. Koreksi ditulis sebagai event baru.
3. Catat waktu UTC setiap langkah. Setelah insiden, tulis ringkasan di
   [honesty-log.md](../honesty-log.md) jika ada angka publik yang terdampak.

| Mode | File |
| --- | --- |
| Chain berhenti | [chain-halt.md](chain-halt.md) |
| RPC mati | [rpc-down.md](rpc-down.md) |
| Reorg | [reorg.md](reorg.md) |
| Harga disputed | [price-disputed.md](price-disputed.md) |
| LLM down | [llm-down.md](llm-down.md) |
| Session key bocor | [session-key-leak.md](session-key-leak.md) |
| Agent runaway | [agent-runaway.md](agent-runaway.md) |
| Disk/DB penuh | [db-full.md](db-full.md) |

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menuntut bukti latihan. Selama kolom "Latihan" kosong, klaim bahwa tim siap
menghadapi insiden belum terbukti.
