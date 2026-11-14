---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook: chain berhenti

**Gejala.** Blok baru tidak muncul lebih dari 5 menit. Order eksekusi menggantung. Anchor
worker timeout menunggu receipt (120 detik).

**Langkah.**
1. Aktifkan kill switch: `touch "$SIRO_KILL_FILE"`.
2. Pastikan dari minimal dua sumber independen (explorer + status page jaringan) bahwa
   chain memang berhenti, bukan RPC kita yang macet. Kalau hanya RPC, pindah ke
   [rpc-down.md](rpc-down.md).
3. Jangan kirim ulang order. Order yang sudah ditandatangani bisa masuk setelah chain jalan lagi.
4. Catat semua order dengan status "submitted tanpa receipt" dari execution journal.
5. Setelah chain jalan, tunggu minimal 2 konfirmasi untuk setiap order tertunda, lalu
   rekonsiliasi posisi dengan saldo onchain sebelum menghapus kill file.
6. Anchor worker akan mengulang anchor harian yang tertunda. Root yang sudah ada tidak
   bisa ditimpa. Kalau worker melaporkan `Immutable anchor conflict`, berhenti dan eskalasi.

**Dampak publik.** Hari yang anchor-nya terlambat dicatat di status page dengan jam
anchor sebenarnya.

**Latihan.** Belum pernah.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa membandingkan waktu chain berhenti (dari explorer) dengan transaksi kami.
Order baru setelah waktu itu, sebelum rekonsiliasi, berarti runbook ini tidak diikuti.
