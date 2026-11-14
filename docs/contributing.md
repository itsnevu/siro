---
status: TESTING
last_reviewed: 2026-11-13
---

# Kontribusi

## Menjalankan test

```bash
npm run lint                          # ESLint web
npm run test:trading                  # test Node: advisory, decision proof, receipt chaos, integrasi
node --test tests/metrics/*.test.mjs  # formula di docs/metrics.md
node scripts/docs-lint.ts             # linter dokumentasi (butuh Node 24)
node scripts/docs-lint.ts --offline   # tanpa cek tautan eksternal
cargo test --workspace --locked       # engine Rust
cargo clippy --workspace --all-targets --locked -- -D warnings
```

Kontrak: `forge test` di `contracts/`.

## Aturan PR

1. Satu PR, satu tujuan.
2. CI wajib hijau: Rust core, kontrak, docs lint.
3. Perubahan formula metrik wajib mengubah `docs/metrics.md` **dan** `tests/metrics/` di PR
   yang sama, plus entri di `docs/honesty-log.md` jika angka publik berubah.
4. Perubahan arsitektur besar wajib ADR baru di `docs/adr/`. ADR lama tidak dihapus.
5. Setiap fitur yang muncul di docs diberi label `LIVE`, `TESTING`, atau `PLANNED`. Tidak ada
   label lain.
6. Saat merilis, perbarui `docs/limitations.md` dan `CHANGELOG.md`.

## Aturan linter dokumentasi

`scripts/docs-lint.ts` gagal kalau:

1. Ada kata terlarang. Daftarnya ada di konstanta `BANNED` di script, dan sengaja tidak
   diulang di sini supaya halaman ini tidak memicu aturannya sendiri.
2. Baris tabel memuat "return" atau persen tanpa label net, bruto, gross, atau backtest.
3. Angka persen tanpa rentang tanggal (`YYYY-MM-DD – YYYY-MM-DD` atau `T0`) dalam 3 baris.
   **Pengecualian:** baris yang mendefinisikan ambang atau contoh (memuat `<`, `>`, `≤`, `≥`,
   atau kata seperti "ambang", "maks", "minimal", "contoh", "persentil"). Pengecualian ini
   melemahkan aturan. Kalau disalahgunakan untuk menyelundupkan klaim kinerja, hapus.
4. Tautan eksternal tidak menjawab HTTP 200, atau tautan relatif menunjuk file yang tidak ada.
5. File di `docs/` tanpa frontmatter `status` dan `last_reviewed`. File lama yang belum
   dimigrasi ada di `LEGACY_NO_FRONTMATTER`. Daftar itu hanya boleh menyusut.
6. File `LIVE` dengan `last_reviewed` lebih tua dari 90 hari.
7. Metrik di judul `###` `docs/metrics.md` tanpa nama yang sama di `tests/metrics/`.
8. `docs/limitations.md` kurang dari 15 butir.
9. Kalimat dengan "APY" tanpa kata "fee" atau "emisi".

## Gaya commit

Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`. Commit yang
mengubah angka publik diawali `fix(metrics):` dan menyebut entri honesty-log-nya.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menjalankan setiap perintah di atas pada commit mana pun. Perintah yang gagal
di `main` membuktikan aturan PR tidak ditegakkan. Pembaca juga bisa menunjukkan bahwa
pengecualian aturan 3 adalah celah, karena itu memang celah.
