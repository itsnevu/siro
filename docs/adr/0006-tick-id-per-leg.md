---
status: LIVE
last_reviewed: 2026-11-14
date: 2026-11-14
---

# ADR 0006: `tick_id` memasukkan hash strategi leg

**Konteks.** Spec fase 11 mendefinisikan `tick_id = sha256(agent_id + tick_ts)` sebagai kunci
idempotensi, dengan aturan "tick ganda ditolak". Agent portofolio (`replay portfolio`) membuat satu
keputusan per aset per tick dengan `agent_id` yang sama. Pada journal nyata 12–13 Nov 2026,
70 keputusan hanya menghasilkan 35 `tick_id` unik, sehingga constraint UNIQUE di Postgres akan
menolak leg kedua.

**Opsi.**
1. Satu keputusan per agent per tick: portofolio menggabungkan semua leg ke satu record.
2. `tick_id = sha256(agent_id + tick_ts + aset)`. Tapi aset tidak disimpan eksplisit di record.
3. `tick_id = sha256(agent_id + tick_ts + strategy_hash)`. Hash strategi sudah ada di setiap
   record dan berbeda per leg.

**Pilihan.** Opsi 3.

**Konsekuensi.**
- Tick ganda tetap ditolak per leg, karena versi strategi yang sama di tick yang sama
  menghasilkan kunci yang sama.
- Rumus ini menyimpang dari teks spec. Pembaca yang menghitung `sha256(agent_id + tick_ts)` akan
  mendapat nilai berbeda dan harus memakai rumus ini.
- Versi strategi baru di tick yang sama menghasilkan kunci baru. Itu benar, karena keputusannya
  memang berbeda.

**Tanggal.** 2026-11-14.
