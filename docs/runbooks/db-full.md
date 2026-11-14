---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook: disk atau DB penuh

**Kondisi saat ini.** Penyimpanan adalah journal file append-only dengan fsync, Parquet
create-only, dan SQLite (`SIRO_ADVISORY_DB`, `SIRO_EXECUTION_DB`). Postgres dengan
partisi dan retensi (fase 12) masih `PLANNED`.

**Gejala.** Append journal gagal. Tanpa append, keputusan tidak bisa di-commit, sehingga
tidak ada order. Ini perilaku yang diinginkan.

**Langkah.**
1. Aktifkan kill switch, supaya eksekusi juga berhenti, bukan hanya commit.
2. **Jangan** menghapus atau memotong journal dan Parquet. Keduanya adalah bukti.
3. Kosongkan ruang dari log, cache build (`target/`, `.next/`), dan file sementara.
4. Pindahkan arsip lama ke penyimpanan lain hanya setelah root hariannya ter-anchor, dan
   catat lokasi dan hash arsip.
5. Jalankan `cargo run -p api` untuk memvalidasi journal sebelum menghapus kill file.
   API menolak start kalau journal tidak valid.

**Latihan.** Belum pernah.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa memeriksa rantai `prev_hash` di sekitar waktu insiden. Celah di rantai
berarti ada data yang hilang atau dihapus, berlawanan dengan langkah 2.
