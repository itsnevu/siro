---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 5 — walk-forward dan gate

Kode: `crates/replay/src/study.rs` dan `validation.rs`. Training memakai label resolved
yang timestamp-nya sebelum akhir jendela training. Kalender bergeser satu bulan;
parameter terpilih dikunci sebelum data uji dibaca. OOS lock eksternal diverifikasi
melalui receipt `Anchor.StrategyLocked`. Backdating lock historis tidak diperbolehkan.

Sensitivitas mencakup sembilan parameter dengan +/-20%, stress biaya >=2x slippage,
deflated Sharpe dengan trial history dan bootstrap 10.000 moving-block samples.
Release gagal jika bukti tidak lengkap. Metadata dan hasil disimpan sebagai event baru
beserta file journal per evaluasi; tidak ada migrasi database lama.

Tes unit mencakup batas kalender, gate kosong gagal dan determinisme bootstrap. Tes
end-to-end mengubah data masa depan pada 50 cutoff dan membandingkan record trading.
Belum ada hasil 12-window dari histori produksi yang dapat diklaim lulus, dan target
runtime 3 tahun × 40 aset × 10 agent belum diukur pada 8 core.
