---
status: TESTING
last_reviewed: 2026-11-13
source_of_truth: crates/costmodel/src/lib.rs
---

# Model biaya

Setiap angka **net** di Siro adalah angka bruto dikurangi biaya dari model ini. Kalau model
ini terlalu murah, semua angka net kami terlalu tinggi. Kondisi F5 di
[falsification.md](falsification.md) mengukur hal itu.

## Komponen

Semua dalam basis poin (bps) dari notional order.

| Komponen | Formula | Sumber input |
| --- | --- | --- |
| Slippage | `max(2, k × (notional / depth)^0.6)` | `k` dari kalibrasi fill per aset; `depth` dari snapshot pasar |
| Protocol fee | `protocol_bps` | konfigurasi venue |
| LP fee | `lp_bps` | konfigurasi venue (tier pool) |
| Funding | `funding_bps_per_hour × holding_hours` | data pasar bertimestamp |
| Borrow | `borrow_bps_per_day × holding_hours / 24` | data pasar bertimestamp |
| Gas | `(gas_usd + priority_usd) / notional × 10 000` | data gas bertimestamp |

Aturan tambahan di `decision_quote`:

- Kapasitas fill per jam = notional penuh, kecuali notional > 0.5% depth. Di atas batas itu
  batas kapasitas = 20% notional, dan order dipecah menjadi 5 transaksi. Gas dihitung 5×.
- Slippage tidak pernah di bawah 2 bps.
- Tanpa `calibration_id`, quote ditolak. Model tidak menebak kalibrasi.
- Carry (funding + borrow) aktual dicatat per jam terpisah lewat `carry_usd`. Biaya dari
  quote tidak dibukukan dua kali.

## Contoh hitung tangan: satu order

Contoh ilustratif, bukan data pasar. Input:

- notional $10 000, depth $500 000, `k = 30`
- `protocol_bps = 0`, `lp_bps = 30` (pool tier 0.3 persen, contoh)
- funding 0, borrow 0 (spot, tanpa leverage)
- gas $0.40 + priority $0.10

Langkah:

1. Rasio `notional / depth = 0.02`. `0.02^0.6 = 0.09564`. Slippage = `30 × 0.09564 = 2.869` bps.
   Di atas batas bawah 2, jadi tetap 2.869.
2. Gas = `0.50 / 10 000 × 10 000 = 0.5` bps.
3. Total awal = `2.869 + 0 + 30 + 0 + 0 + 0.5 = 33.369` bps.
4. Batas fill: 0.5 persen dari depth = $2 500. Notional $10 000 melewati batas, jadi kapasitas
   per jam = $2 000. Order dipecah 5 kali. Gas tambahan `0.5 × 4 = 2` bps.
5. **Total = 35.369 bps = $35.37** untuk satu sisi. Round-trip ≈ $70.74.

Bacaan: dalam contoh ini, LP fee adalah 85 persen dari biaya. Strategi dengan
`expected_edge_bps` di bawah ~36 tidak bisa untung dari satu sisi, berapa pun akurasinya.

## Kapan model ini salah

- Eksponen 0.6 dan batas 0.5 persen adalah asumsi struktural, bukan hasil kalibrasi. Hanya `k`
  yang dikalibrasi.
- Depth diambil dari snapshot. Depth bisa hilang dalam detik saat pasar bergejolak.
- MEV (sandwich, frontrun) tidak dimodelkan sama sekali.
- Biaya token LLM tidak masuk model ini. Biaya itu dicatat terpisah di `advisory_comparison`.
- Pajak tidak dimodelkan.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menghitung ulang biaya satu order dari decision record (`cost_estimate_bps`)
dan membandingkannya dengan fill onchain. Kalau slippage realisasi jauh di atas prediksi,
angka net kami terlalu tinggi, dan pembaca bisa menunjukkannya per transaksi. Pembaca juga
bisa menolak angka net apa pun untuk aset yang rawan MEV, karena MEV tidak ada di model.
