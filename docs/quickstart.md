---
status: TESTING
last_reviewed: 2026-11-13
---

# Quickstart: dari nol ke agent pertama

Target: kurang dari 5 menit untuk web lokal. Engine Rust butuh waktu kompilasi lebih lama
saat pertama kali dijalankan.

> **Peringatan default aman.** Default onboarding yang direncanakan (stop loss 8 persen,
> maksimal 25 persen per aset, universe otomatis, modal virtual $10 000) **belum
> diimplementasi** (`PLANNED`). Onboarding saat ini tidak mengisi batas apa pun. Isi
> kebijakan risiko sendiri sebelum menghubungkan dana nyata. Jangan pakai dana nyata di
> versi `TESTING`.

## 1. Web lokal (±2 menit)

```bash
git clone <repo> siro && cd siro
npm install
npm run dev
```

Buka `http://localhost:3000/app/onboarding`.

## 2. Engine dan agent pertama dalam mode replay (±3 menit + kompilasi)

Butuh Rust 1.92. Di Windows tanpa MSVC, lihat [TRADING_ENGINE.md](TRADING_ENGINE.md).

```bash
cargo build --workspace --locked
cargo run -p replay -- ingest BARS.jsonl data.parquet
cargo run -p replay -- run CONFIG.json
```

`CONFIG.json` mengikuti struct `replay::runtime::Config`. Field yang tidak dikenal ditolak.
Runner butuh `SIRO_RISK_POLICY` (path JSON kebijakan) dan `SIRO_RISK_MAC_KEY` (hex, minimal
32 byte). Tidak ada data contoh di repo. Kamu harus membawa data bar sendiri.

Contoh kebijakan konservatif (bukan default, isi sendiri):

```json
{ "max_weight": 0.25, "target_vol_pct": 1.0, "risk_units_per_weight": 100, "permit_ttl_ms": 5000 }
```

- `max_weight` 0.25: tidak ada satu aset pun di atas seperempat equity.
- `target_vol_pct` 1.0: bobot dikecilkan saat ATR aset tinggi.
- `permit_ttl_ms` 5000: permit risiko kedaluwarsa dalam 5 detik.

## 3. Lihat hasil

```bash
SIRO_JOURNAL=path/ke/journal cargo run -p api
```

Hasil replay berlabel `backtest`. Baca [metrics.md](metrics.md) sebelum membaca angkanya.
Verifikasi satu keputusan dengan [verification.md](verification.md).

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa membuktikan bahwa "default aman" belum ada dengan membuka onboarding dan
melihat tidak ada batas yang terisi. Pembaca juga bisa mencatat waktu langkah 1–3. Kalau
lebih dari 5 menit (di luar kompilasi), target halaman ini gagal.
