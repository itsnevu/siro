---
status: TESTING
last_reviewed: 2026-11-13
---

# Keterbatasan

Daftar ini sengaja ditulis tanpa bahasa halus. Diperbarui setiap rilis. Butir yang sudah
diperbaiki dipindahkan ke bagian "Sudah ditangani" beserta commit-nya, bukan dihapus.

## Belum ada bukti

1. **Belum ada satu pun agent live dengan uang nyata.** Per 2026-11-13, semua angka yang
   tampil berasal dari backtest atau paper. Tidak ada track record.
2. **Tidak ada bukti LLM menambah nilai.** Tabel "Advisory contribution" menjalankan order
   identik dan hanya mengurangi biaya token. Secara konstruksi tabel itu tidak bisa
   menunjukkan kontribusi (temuan RT-02 di [metrics.md](metrics.md)).
3. **"Beta" di UI adalah korelasi.** Strategi dengan leverage 3× terhadap SPY tampil dengan
   beta 1.0 (RT-01).
4. **DSR bergantung pada jumlah percobaan yang dilaporkan operator sendiri.** Tidak ada log
   percobaan yang dipaksakan (RT-03).

## Verifikasi

5. **Kontrak witness sudah di-deploy, tapi worker witness belum berjalan, dan jendelanya tidak nol.**
   `Anchor` ada di Robinhood Chain sejak 2026-11-14 (`0xbf9f…04e0`), tapi belum ada keputusan
   produksi yang di-witness. Setelah worker berjalan pun, operator punya sampai `max_lag` (default 300 detik) setelah tick sebelum hash wajib
   ter-witness. Operator juga bisa memilih untuk tidak mem-witness keputusan buruk. Keputusan itu
   tampil `proven: false`, jadi terlihat, tapi tidak dicegah.
6. **Kunci anchor dan session key dibaca dari env var** (`SIRO_ANCHOR_PRIVATE_KEY`,
   `SIRO_SESSION_PRIVATE_KEY`). Ini melanggar aturan kami sendiri (kunci hanya di HSM/KMS).
   Siapa pun yang membaca env server bisa menulis root atau trading sampai batas session.
7. **Kontrak `Anchor` dikendalikan satu `owner`.** Tidak ada multisig, tidak ada timelock.
8. **Merkle tree menduplikasi daun terakhir saat jumlah daun ganjil.** Pohon `[a,b,c]` dan
   `[a,b,c,c]` menghasilkan root yang sama. Proof tetap sah untuk daun yang ada, tapi jumlah
   keputusan dalam satu jam tidak terikat oleh root.
9. **API publik belum ada.** Default bind `127.0.0.1:4010`. Orang luar belum bisa mengikuti
   [verification.md](verification.md) terhadap data produksi.

## Angka dan metrik

10. **Drawdown hanya diukur di penutupan bar jam.** Penurunan intrabar tidak terlihat.
11. **Risk-free rate = 0** di semua rasio. Sharpe kami lebih tinggi daripada Sharpe excess-return.
12. **Test di `tests/metrics/` menguji formula dokumen, bukan output crate Rust.** Kalau kode
    Rust berubah tanpa dokumen berubah, CI dokumentasi tidak akan menangkapnya.
13. **Audit supply chain berjalan di CI untuk npm dan Rust** (`npm audit`, `npm audit signatures`,
    `cargo audit` 0.22.2), dan GitHub Actions di-pin ke hash commit. Per 2026-11-14 tidak ada advisory
    terbuka: `arrow`/`parquet` dinaikkan ke 59.3.2 untuk menutup RUSTSEC-2026-0442 dan RUSTSEC-2026-0435.
    Audit hanya menangkap kerentanan yang sudah diketahui publik.
14. **Median `average_win`/`average_loss` tidak dipublikasikan.** Rata-rata disetir outlier.
15. **Brier tidak dibandingkan dengan baseline base rate** di UI (RT-08).
16. **Label rezim pasar diisi di data input**, bukan dideteksi. Satu bar berlabel cukup untuk
    lulus syarat rezim di gate validasi (RT-07).

## Risiko dan eksekusi

17. **Kill drawdown di ambang 0.20 melikuidasi dulu, baru berhenti.** Order pengurang tetap
    diizinkan, dan runner menjual semua posisi sebelum halt. Likuidasi itu sendiri memakan biaya
    dan slippage di pasar yang sedang turun, dan kill manual tetap memblokir semua order.
18. **Stop loss per posisi diukur pada harga open per jam.** Pergerakan intrabar di bawah ambang
    stop tidak memicu keluar sampai tick berikutnya, dan eksekusi terjadi di open jam berikutnya.
    Strategi lama tanpa `stop_loss_pct` tetap tanpa stop loss.
19. **MEV tidak dimodelkan** di model biaya. Eksekusi live bisa memakai private relay
    (`SIRO_MEV_PROTECTED`), tapi itu opsional, dan backtest tetap tidak menghitung MEV.
    Angka net untuk pool tipis kemungkinan terlalu tinggi.
20. **Eksponen slippage (0.6) dan ambang pemecahan order (0.5 persen depth) adalah asumsi**,
    bukan hasil kalibrasi.
21. **Portofolio lintas aset tetap long-only.** `replay portfolio` menjalankan sampai 16 aset
    dengan satu saldo tunai. Short tidak didukung, karena DEX spot butuh pinjaman. Korelasi
    pasangan memakai 47 return per jam, yang merupakan sampel kecil. Korelasi yang tidak
    terdefinisi dianggap 1.0. Benchmark dan rezim diambil satu per timestamp untuk seluruh
    portofolio. Eksekusi live portofolio (`assets` per aset di config eksekusi) belum pernah
    diuji di chain.

## Fase 9–18: dibangun, dengan batas

22. **Kuorum RPC.** Data pasar historis disepakati 2 endpoint archive, tapi high, low, dan volume
    dari event `Swap` hanya punya satu sumber (Pinax, free tier, rate limit). Pemulihan eksekusi
    live memakai kuorum 2 RPC hanya kalau `SIRO_EXECUTION_RPC_SECONDARY` diisi.
23. **Pembanding Chainlink** dibaca pada blok yang sama dengan harga pool. Feed saham Chainlink
    punya heartbeat 24 jam, jadi di antara update, jawabannya bisa basi. Jawaban basi tidak
    dipakai untuk menandai `disputed`.
24. **Universe pertama berlaku mulai 2026-11-13 13:00 UTC.** Semua backtest sebelum tanggal itu
    memakai aset pilihan tangan (`hand-picked`). Allowlist token resmi baru berisi NVDA dan AAPL,
    karena API aset Robinhood tidak bisa dijangkau dari mesin build.
25. **Rekonsiliasi harian** membandingkan PnL dengan fill dan, untuk agent live, dengan saldo
    on-chain yang harus dipasok lewat `--onchain`. Papan publik (`/evidence`, `/leaderboard`)
    hanya menampilkan agent yang lolos rekonsiliasi terakhir di `SIRO_RECON_FILE`. Tanpa file
    itu, papan kosong. Itu disengaja.
26. **Pemicu Brier di job harian** me-resolve prediksi dengan harga open pada tick dan pada tick +
    horizon dari file market runner, bukan dengan harga close bar seperti laporan replay. Kedua
    angka Brier karena itu bisa sedikit berbeda.
27. **Geo-gating hanya bekerja di belakang CDN** yang mengirim header negara (Vercel atau
    Cloudflare). Tanpa header, akses diizinkan dan ditandai `unknown`. Daftar blokir adalah
    baseline sanksi dan **belum ditinjau penasihat hukum**. Daftar "tanpa saham tokenized" kosong.
28. **i18n mencakup** header, footer, disclaimer, onboarding, pesan geo, `/verify`, verifier, dan
    `/evidence`. Isi halaman konten lain (docs, whitepaper, FAQ, legal, dan sebagainya) masih
    berbahasa Inggris.
36. **Postgres (fase 12) berjalan di VPS** (PostgreSQL 16, hanya mendengarkan localhost, diakses
    lewat tunnel SSH `npm run db:tunnel`). Migrasi 0001–0002 sudah diterapkan, dan `db:verify`
    lulus di sana pada 2026-11-14. Scheduler (setelah setiap run sukses) dan job harian
    menyalin journal ke Postgres secara otomatis bila `DATABASE_URL` diisi; kegagalan database hanya
    dicatat dan tidak menghentikan trading. Runner Rust sendiri tetap menulis ke journal file. Journal file tetap sumber kebenaran. Belum ada
    backup otomatis untuk database ini.
37. **Jam mesin build meleset sekitar 350 ms dari NTP** pada 2026-11-13, di atas ambang alarm 200
    ms. Mode live tidak boleh dijalankan sebelum jam disinkronkan.
38. **Login hanya lewat wallet.** Login email OTP dan Google tidak dibangun, karena dikecualikan
    atas permintaan pemilik proyek.
29. **File docs lama baru diberi label `TESTING` per 2026-11-14 tanpa ditinjau isinya ulang.**
    Linter tidak lagi punya pengecualian.

32. **Worker scheduler dites end-to-end dengan replay palsu** (`tests/scheduler-worker.test.mjs`):
    aktivasi, lease, `through`, halt permanen, dan reset. Replay mode paper/live yang sungguhan
    butuh data segar dan gate yang lulus, jadi belum pernah dijalankan oleh scheduler.
33. **Kepemilikan vault dicek on-chain sebelum setiap run scheduler**, lewat satu RPC
    (`SIRO_RPC_<chain>` atau `ALCHEMY_RPC_URL_<chain>`), tanpa kuorum. Kalau RPC itu berbohong,
    job bisa berjalan untuk vault yang sudah berpindah tangan, tapi tetap butuh session key yang
    sah.
34. **Pemulihan live otomatis baru dites dengan chain simulasi.** Resolver dites untuk RPC
    timeout, tx dropped, nonce terpakai, dan RPC tidak sepakat. Belum ada uji di testnet dengan
    tx yang benar-benar macet. Pembatalan butuh tx EIP-1559; tx legacy akan halt.
35. **Runner tidak punya test end-to-end sampai 2026-11-13**, dan test pertama langsung
    menemukan bug turnover yang mencegah sebagian besar order tereksekusi (lihat honesty-log).
    Kemungkinan masih ada bug serupa di jalur paper dan live, yang belum punya test end-to-end.

## Tidak diukur

30. Pajak, biaya on-ramp/off-ramp, dan biaya kesempatan modal yang menganggur.
31. Kinerja saat chain berhenti atau reorg dalam. Runbook ada, tapi belum pernah dilatih.

## Sudah ditangani

- **Scheduler trading otomatis** (sebelumnya: aktivasi ditolak). `services/scheduler/worker.mjs`
  menjalankan runner tervalidasi per tick untuk job yang diaktifkan pemilik vault. Status: TESTING.
- **Pemulihan live untuk hasil RPC tidak pasti** (sebelumnya: selalu halt).
  `services/execution/resolve.mjs`: mined, pasti tidak tereksekusi (lanjut), atau tidak pasti
  (halt). Status: TESTING.
- **Satu aset per run** (sebelumnya). `replay portfolio` (lihat butir 21 untuk batasannya).
- **Root harian sebagai satu-satunya saksi waktu** (sebelumnya butir 5). Lihat ADR 0005.
