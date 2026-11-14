---
status: LIVE
last_reviewed: 2026-11-13
date: 2026-11-13
superseded_by: 0005 (sebagian)
---

# ADR 0003: Anchor onchain harian, bukan per jam

> **Digantikan sebagian oleh [ADR 0005](0005-per-commit-chain-witness.md)** untuk klaim waktu
> publikasi. Anchor harian tetap dipakai untuk integritas rantai.

**Konteks.** Root keputusan harus tercatat di tempat yang tidak dikendalikan operator.
Setiap transaksi anchor membayar gas.

**Opsi.**
1. Anchor setiap root jam (24 transaksi per hari).
2. Anchor root harian yang memuat semua root jam (1 transaksi per hari).
3. Publikasi ke beberapa saksi off-chain (repo publik, timestamping server) tiap jam.

**Pilihan.** Opsi 2.

**Konsekuensi.**
- Biaya gas 24× lebih rendah.
- **Jendela kepercayaan sampai sekitar 24 jam.** Keputusan dalam hari berjalan belum terikat
  ke saksi luar. Ini melemahkan klaim utama produk.
- Perlu ditinjau ulang: opsi 3 (atau 1 di chain murah) menutup jendela ini dengan biaya kecil.
  Kalau diganti, tulis ADR baru yang menggantikan ADR ini.

**Tanggal.** 2026-11-13.
