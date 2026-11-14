---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook: agent runaway

**Gejala.** Jumlah order atau turnover jauh di atas normal, posisi bertambah terus, atau
drawdown naik cepat.

**Pertahanan otomatis yang ada.** Veto `daily_trades` (6 per hari), `daily_turnover`
(0.25 × equity), dan `risk_budget`. Governor drawdown mengecilkan bobot mulai DD 0.05, dan
memveto semua order di DD 0.20.

**Perilaku di DD 0.20.** Runner menjual semua posisi, lalu halt setelah posisi nol. Order pengurang
tidak diveto. Kill manual tetap memblokir semua order, termasuk penjualan.

**Langkah.**
1. `touch "$SIRO_KILL_FILE"`.
2. Pemilik vault bisa mencabut session key (lihat [session-key-leak.md](session-key-leak.md)).
3. Untuk menutup posisi saat kill aktif, pemilik vault harus bertransaksi langsung dari
   dompetnya, di luar engine. Transaksi ini tidak tercatat sebagai keputusan agent, dan
   harus dicatat manual sebagai event koreksi di journal.
4. Cari penyebab di decision record: fitur, probabilitas, dan permit. Bandingkan dengan
   versi strategi sebelumnya (`agent_version`, `parent_version`).
5. Jika agent berjalan lewat scheduler, job berstatus `halted` tidak dijalankan lagi sampai
   operator menjalankan `node services/scheduler/worker.mjs --reset JOB_ID`. Pemilik vault juga
   bisa menjeda schedule-nya di `/app/schedules`.
6. Agent yang dihentikan permanen masuk [graveyard.md](../graveyard.md).

**Latihan.** Belum pernah.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menghitung order per hari dari decision record publik. Lebih dari 6 trade
yang menambah posisi dalam satu hari UTC berarti veto `daily_trades` gagal.
