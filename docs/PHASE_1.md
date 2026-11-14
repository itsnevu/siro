---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 1 — data dan kausalitas

Workspace Rust berdampingan dengan aplikasi Next.js. Tidak mengubah jalur transaksi web.

## Jalankan

```powershell
cargo test --workspace --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo run -p replay -- ingest BARS.jsonl NEW.parquet
```

Runtime hanya menerima data yang diimpor pengguna. Tidak ada generator data contoh.

```powershell
cargo run -p replay -- features DATA.parquet ASSET FROM_MS THROUGH_MS features-v2-z48-pop-rsi14-bounded-atr14-simple
```

Windows: gunakan toolchain `1.92.0-x86_64-pc-windows-gnullvm` dan LLVM-MinGW UCRT.
Jalankan `powershell -File scripts/test-core.ps1` untuk pemeriksaan.

## Skema data v1 / migrasi

Tidak ada migrasi database aplikasi. Dataset baru memakai skema Parquet ketat:
`asset: utf8`, `open_ts, close_ts: int64`, `open, high, low, close, volume: float64`, semua non-null.
Timestamp UTC dalam milidetik Unix; interval bar `[open_ts, close_ts)` tepat satu jam.
Bar baru tersedia pada `close_ts`. Tidak ada forward-fill. Duplikat, gap dalam jendela,
OHLC tidak konsisten, NaN, infinity, volume negatif, atau versi skema berbeda ditolak.
Simpan dataset lama terpisah; konversi harus menghasilkan file baru dan lolos validator.

## Kontrak fitur yang dibekukan

Kontrak keputusan untuk fase berikutnya dibekukan di
[`schemas/decision-v1.schema.json`](schemas/decision-v1.schema.json). Record fitur
fase 1 sengaja bukan record keputusan: tidak memiliki commit yang telah disiarkan.
Constraint lintas field (waktu, hash, biaya, lineage) memerlukan validator ledger fase 3.
Spesifikasi mengandung konflik waktu: commit "sebelum tutup" berlawanan dengan fitur
bar tertutup serta tenggat `tick_ts + 5s`. Interpretasi eksplisit: tick adalah batas
penutupan, commit pada `[tick_ts, tick_ts + 5s)`, reveal paling cepat satu jam kemudian.
Timestamp replay historis tidak membuktikan publikasi sebelum harga bergerak.

Versi `features-v2-z48-pop-rsi14-bounded-atr14-simple` (RSI dibatasi 0–100 setelah perbaikan roundoff):

| Fitur | max_lookback | Definisi |
| --- | --- | --- |
| z_48h | 48 bar | (close terakhir - mean) / simpangan baku populasi 48 close; konstan = 0 |
| rsi_14 | 15 bar | 14 perubahan close, 100 × gain / (gain + loss); konstan = 50 |
| atr_pct | 15 bar | Mean 14 true range / close terakhir × 100 |

RSI dan ATR memakai mean sederhana, **bukan Wilder smoothing**. Kernel hanya menerima
48 bar tertutup dan berurutan, setelah validasi aset serta batas timestamp. Perubahan rumus wajib versi baru.

`no_future_leak` menjalankan replay penuh, mengacak seluruh OHLCV setelah masing-masing
50 cutoff unik dengan seed eksplisit, lalu membandingkan serialisasi record sampai cutoff
byte demi byte. Tes tambahan memeriksa batas query, store yang sengaja mengembalikan masa
depan, roundtrip Parquet, warmup, gap, duplikat, nilai numerik, dan fitur dengan hasil analitis.

`earliest_execution_open_ts` adalah open bar berikutnya, sama dengan batas close bar sinyal.
Harga close sinyal tidak dipakai untuk fill. Fase ini belum punya order atau fill simulator.

## Batasan yang diketahui

- Reader Parquet memuat dataset ke memori; query memakai pencarian biner aset/waktu. Predicate pushdown dan
  benchmark 3 tahun × 40 aset × 10 agent belum ada; target performa belum diklaim lulus.
- Belum ada ingestion vendor, revisi data, corporate actions, atau timestamp publikasi vendor.
  Sumber produksi wajib membuktikan bar benar-benar tersedia pada timestamp penutupan.
- Replay ini hanya harness fitur fase 1. Skema keputusan kriptografis, biaya, metrik,
  risk veto, order, anchor, UI gross/net, serta live trading menunggu fase berikutnya.
- Tidak ada klaim bisa mengalahkan produk lain atau sudah layak menggunakan uang nyata.
- Penulisan create-only mencegah overwrite; kegagalan disk dapat meninggalkan file parsial.
  File hanya boleh dipakai setelah writer selesai dan pembacaan ulang berhasil.

CI Rust wajib menjalankan format, tes termasuk 50 cutoff, dan Clippy. Fase berikutnya
baru boleh dimulai setelah fase ini terverifikasi.

## Hasil verifikasi lokal — 13 November 2026

- Rust 1.100.0, target `x86_64-pc-windows-gnullvm`, LLVM-MinGW UCRT.
- `scripts/test-core.ps1`: format lulus, 7 tes integrasi lulus, Clippy `-D warnings` lulus.
- `no_future_leak`: 50 cutoff unik; hasil sebelum/saat cutoff identik byte demi byte.
- Generator dan artefak contoh telah dihapus sesuai permintaan; fixture sintetis hanya ada di tes terisolasi.
- Skema keputusan terbaca sebagai JSON valid; validasi semantik ledger belum tersedia.
- Workflow CI telah disiapkan; belum diklaim pernah berjalan di remote.
