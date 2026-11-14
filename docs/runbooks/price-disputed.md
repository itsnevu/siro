---
status: PLANNED
last_reviewed: 2026-11-13
---

# Runbook: harga disputed

**Kondisi saat ini.** Status `disputed` (selisih antarsumber di atas ambang 1 persen) belum
diimplementasi. Pembanding Chainlink belum terhubung ke engine. Pertahanan yang ada hari
ini: veto `stale_data`, `gap` (di atas 3 sigma), dan `spread` (di atas 5× normal).

**Langkah (manual, sampai fase 9 selesai).**
1. Kalau harga pool berbeda jelas dari harga referensi publik, aktifkan kill switch.
2. Catat aset, waktu UTC, kedua harga, dan sumbernya.
3. Cari keputusan yang dibuat dengan harga itu (`features` di decision record). Tandai
   keputusan itu di laporan insiden. Record tidak diubah.
4. Hapus kill file hanya setelah harga kembali konsisten minimal 2 tick.

**Latihan.** Belum pernah.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa mencari keputusan yang fiturnya memakai harga pool yang menyimpang dari
referensi. Kalau ada dan order tetap dieksekusi, pertahanan harga kami tidak bekerja.
