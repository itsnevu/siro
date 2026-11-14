---
status: LIVE
last_reviewed: 2026-11-13
---

# Honesty log

Setiap koreksi klaim publik atau bug metrik. Tidak ada koreksi diam-diam. Format:
tanggal, apa yang salah, angka sebelum dan sesudah, siapa yang menemukan, commit perbaikan.

## 2026-11-13: halaman situs dengan orang, program, dan angka yang tidak ada

- **Apa yang salah.** `/about` menampilkan empat anggota tim fiktif dengan riwayat kerja di
  perusahaan sungguhan. `/token` menampilkan tier pemegang dengan diskon, kredit, dan boost
  staking. `/tokenomics` menampilkan alokasi supply dan vesting. `/referral` menawarkan hadiah
  SIRO dan bagi hasil fee. `/x402` menampilkan harga API. `/community` menyebut "ribuan trader"
  dan program ambassador. `/contact` punya form yang menyatakan pesan terkirim tanpa mengirim
  apa pun. Tidak satu pun dari ini ada: tidak ada tim yang dipublikasikan, tidak ada token,
  tidak ada program referral, tidak ada API berbayar, dan tidak ada kanal komunitas.
- **Angka sebelum/sesudah.** Semua angka di halaman itu dihapus, bukan dikoreksi, karena tidak
  ada angka benar yang bisa menggantikannya. Halaman sekarang berlabel `PLANNED` atau menyatakan
  "belum ada". `/roadmap` tidak lagi menyebut item sebagai "shipped".
- **Ditemukan oleh.** Audit dummy/demo di seluruh situs.
- **Perbaikan.** Halaman ditulis ulang. `src/lib/mock/` dihapus. `/changelog` dirender dari
  `CHANGELOG.md`.

## 2026-11-13: runner menghitung order sendiri dua kali dalam batas turnover harian

- **Apa yang salah.** Saat order tertunda akan dieksekusi, `request()` di
  `crates/replay/src/runtime.rs` menjumlahkan semua order hari itu, **termasuk order itu
  sendiri**. Risk engine lalu menambahkan notional order yang sama lagi. Akibatnya, setiap order
  dengan notional di atas setengah batas turnover harian (0.25 × equity) diveto
  `daily_turnover` saat eksekusi, lalu dibatalkan. `trades_today` juga ikut terhitung dua kali.
- **Angka sebelum/sesudah.** Fixture uji `crates/replay/tests/runtime_e2e.rs` (161 tick, 1 aset,
  `max_weight` 0.2), dijalankan 2026-11-13: sebelum perbaikan **0 fill**, dan setiap order
  dibatalkan oleh veto `daily_turnover` dengan nilai teramati 0.4. Sesudah perbaikan: **31 fill**.
  Pada run sebelum perbaikan ini, setiap order dengan notional di atas 0.125 × equity (dikurangi
  turnover lain hari itu) dibatalkan. Order yang lebih kecil tetap tereksekusi. Run dengan
  `max_weight` di atas 0.125 karena itu sebagian besar memegang uang tunai, dan angka net-nya
  meremehkan aktivitas strategi.
- **Ditemukan oleh.** Test end-to-end runner pertama, ditulis saat refactor portofolio.
- **Perbaikan.** Order yang sedang dievaluasi dikeluarkan dari hitungan harian. Test end-to-end
  sekarang mewajibkan fixture benar-benar bertransaksi.

## 2026-11-13: label "beta (risk matched)" sebenarnya korelasi

- **Apa yang salah.** UI `/evidence` menampilkan "SPY beta (risk matched)" dan
  "QQQ beta (risk matched)". Benchmark diskalakan ke volatilitas strategi sebelum regresi,
  jadi nilainya sama dengan koefisien korelasi.
- **Angka sebelum/sesudah.** Belum ada angka live yang dipublikasikan. Untuk strategi
  dengan leverage 3× terhadap benchmark: tampil 1.0, nilai beta OLS 3.0
  (`tests/metrics/formulas.test.mjs`).
- **Ditemukan oleh.** Review dokumentasi metrik.
- **Perbaikan.** 2026-11-14: label UI diganti menjadi "correlation" dan "excess vs volatility-matched". Hitungannya tidak diubah.

## 2026-11-13: tabel "Advisory contribution" tidak mengukur kontribusi

- **Apa yang salah.** Kedua varian menjalankan order identik. Selisihnya hanya biaya token.
- **Angka sebelum/sesudah.** Return bruto "With LLM" sama persis dengan "Without LLM"
  untuk setiap laporan, secara konstruksi.
- **Ditemukan oleh.** Review dokumentasi metrik.
- **Perbaikan.** 2026-11-14: tabel diberi judul "Advisory cost (not contribution)" beserta penjelasannya. Ablation dengan order berbeda belum ada.

## 2026-11-13: klaim per jam vs anchor harian

- **Apa yang salah.** Dokumen engine menyebut "root hourly dan daily". Hanya root harian
  yang dikirim ke chain. Root per jam tidak punya saksi luar.
- **Ditemukan oleh.** Review dokumentasi verifikasi.
- **Perbaikan.** Witness on-chain per batch commit (ADR 0005). `publication_proven` sekarang
  dihitung dari timestamp blok witness. Kontrak dan worker berstatus TESTING; belum di-deploy.
