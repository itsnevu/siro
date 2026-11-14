---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook: reorg

**Gejala.** Receipt yang sudah tercatat tidak lagi ada di chain kanonik. Block hash di
execution atau anchor journal berbeda dari block hash di nomor blok yang sama.

**Langkah.**
1. Aktifkan kill switch.
2. Untuk setiap receipt di journal dalam N blok terakhir, bandingkan `block_hash` dengan
   chain saat ini.
3. **Anchor.** Kalau transaksi anchor hilang, root harian belum tercatat. Jalankan ulang
   `node services/anchor/worker.mjs --once`. Kontrak menolak root berbeda untuk hari yang
   sama. Kalau root yang sama masuk lagi, catat receipt baru sebagai event tambahan, jangan
   menimpa yang lama.
4. **Eksekusi.** Order yang hilang dari chain dianggap tidak terisi. Rekonsiliasi posisi
   dari saldo onchain, bukan dari journal.
5. Naikkan `SIRO_ANCHOR_CONFIRMATIONS` jika reorg lebih dalam dari nilai saat ini (minimal 2).

**Dampak publik.** Angka PnL dari fill yang hilang dikoreksi di
[honesty-log.md](../honesty-log.md).

**Latihan.** Belum pernah. `tests/receipt-chaos.test.mjs` menguji sebagian logika receipt,
bukan reorg di chain nyata.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa memeriksa apakah fill yang kami laporkan masih ada di chain kanonik. Fill
yang hilang setelah reorg tapi masih dihitung di PnL adalah angka yang salah.
