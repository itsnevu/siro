---
status: TESTING
last_reviewed: 2026-11-13
source_of_truth: crates/riskengine/src/lib.rs
---

# Aturan risiko

Risk engine berjalan sebagai proses terpisah. Setiap order butuh **permit** yang
ditandatangani HMAC, terikat ke hash request, dengan TTL maksimal 5 detik. Tanpa permit
valid, eksekutor menolak order. Telemetry yang tidak valid (NaN, negatif, di luar
rentang) menghasilkan error, bukan permit.

## Veto: order ditolak penuh

Veto membuat `weight = 0`. Kode veto, nilai yang diamati, dan batasnya dicatat di decision
record (`risk_veto`) dan bisa diverifikasi.

| Kode | Kondisi | Berlaku untuk order pengurang posisi? |
| --- | --- | --- |
| `manual_kill` | kill file ada | ya, semua order |
| `automatic_kill_drawdown` | drawdown net ≥ 0.20 | tidak: order pengurang tetap boleh |
| `position_mismatch` | selisih rekonsiliasi > toleransi | ya, semua order |
| `stale_data` | data tertinggal > 2 tick | tidak |
| `gap` | gap harga > 3 sigma | tidak |
| `funding` | funding > 10 bps per jam | tidak |
| `spread` | rasio spread > 5× normal | tidak |
| `daily_trades` | sudah ≥ 6 trade hari ini | tidak |
| `daily_turnover` | turnover hari ini + order ini > 0.25 × equity | tidak |
| `risk_budget` | risk units terpakai > 100 | tidak |

**Yang membuat agent berhenti trading total:** `manual_kill` dan `position_mismatch` menolak
semua order, termasuk order pengurang. `automatic_kill_drawdown` hanya menolak order yang menambah
risiko. Saat drawdown mencapai ambang 0.20, runner **menjual semua posisi dulu**, lalu berhenti
permanen setelah posisi nol. Lihat [limitations.md](limitations.md) dan
[runbooks/agent-runaway.md](runbooks/agent-runaway.md).

## Penyesuaian: order dikecilkan

Untuk order yang menambah posisi, bobot diambil sebagai nilai minimum dari:

- bobot yang diminta
- `max_weight` kebijakan
- batas volatilitas `target_vol_pct / atr_pct`
- sisa ruang aset: `max_weight - sector_weight`
- sisa ruang sektor: `0.4 - sector_weight` (batas sektor 0.4 tertanam di kode)
- sisa risk budget: `(100 - risk_units) / risk_units_per_weight`

Lalu:

- korelasi pasangan maksimum > 0.75 → bobot × 0.5 (`correlation_trim`)
- governor drawdown mengalikan bobot:

| Drawdown net | Pengali |
| --- | --- |
| di bawah 0.05 | 1.0 |
| 0.05 sampai di bawah 0.10 | 0.75 |
| 0.10 sampai di bawah 0.15 | 0.5 |
| 0.15 sampai di bawah 0.20 | 0.25 |
| 0.20 ke atas | 0 dan veto |

Setiap pengecilan dicatat sebagai `weight_trim` dengan bobot diminta vs bobot diizinkan.

## Telemetry portofolio (runner `replay portfolio`)

Untuk portofolio beberapa aset, runner mengisi request risiko dengan nilai level portofolio:

| Field | Isi |
| --- | --- |
| `current_risk_units` | total bobot semua aset yang dipegang × 100 |
| `sector_weight` | jumlah bobot aset dengan label sektor yang sama dengan aset order |
| `max_pair_correlation` | korelasi Pearson tertinggi antara 47 return bruto per jam aset order dan setiap aset lain yang dipegang; tak terdefinisi = 1.0 |
| `trades_today`, `turnover_today` | seluruh order portofolio hari itu, **tanpa** order yang sedang dievaluasi |

Batas sektor 0.4 dan pemangkasan korelasi di atas ambang 0.75 karena itu berlaku lintas aset. Aset
yang punya order tertunda tidak membuat keputusan baru, tapi aset lain tetap jalan.

## Aturan yang belum ada

- Deteksi decay dan kill otomatis berbasis Sharpe/Brier rolling (fase 16): `PLANNED`.
- Stop loss per posisi: tidak ada. Yang ada hanya governor drawdown level akun.
- Default onboarding aman (stop loss, batas per aset, modal virtual): `PLANNED`, belum di UI.
- Kebijakan (`max_weight`, `target_vol_pct`) diisi operator lewat file JSON. Tidak ada batas
  atas yang dipaksakan selain `max_weight ≤ 1`.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa mengambil decision record mana pun dan memeriksa apakah ada order yang
dieksekusi padahal telemetry-nya memenuhi kondisi veto di tabel atas. Satu kasus seperti
itu membuktikan risk engine tidak menegakkan aturannya. Pembaca juga bisa menunjukkan
bahwa stop loss per posisi hanya dicek pada harga open per jam, dan bahwa likuidasi saat kill
drawdown terjadi di pasar yang sedang turun, sehingga kerugian akhirnya bisa melebihi ambang 0.20.
