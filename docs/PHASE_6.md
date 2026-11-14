---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 6 — paper publik

Kode: runner mode paper, API read-only dan WebSocket; `/evidence`, `/leaderboard`,
`/evidence/[agent]`. Laporan hanya berasal dari event nyata. Gross/net satu baris,
label mode, filter aset/risiko/rezim/modal, kalibrasi, regime breakdown dan versi.
Semua agent internal ditandai. Gate gagal tetap terlihat pada laporan backtest;
tidak memberi izin paper/live. Tidak ada seed leaderboard atau migrasi workspace web.

Verifikasi: integrasi Parquet → subprocess risk → order/fill → journal → API; build
Next.js dan guard presentasi gross/net. Aktivasi paper membutuhkan histori yang telah
lulus gate dan data market aktual pada tick; source yang belum ada adalah error.

Batasan: source vendor, hasil kelayakan, konfigurasi server dan histori nyata belum
diberikan. Tidak ada paper trader yang diaktifkan secara fiktif untuk mengisi halaman.
