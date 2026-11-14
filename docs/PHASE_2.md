---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 2 — biaya dan metrik

`costmodel` adalah fungsi murni. Fee protokol/LP dan kalibrasi slippage berasal dari
konfigurasi venue/aset. Kalibrasi tanpa ID ditolak. Model mengembalikan setiap komponen
bps: slippage minimum 2 bps, protokol, LP, funding per jam, borrow per hari, gas dan priority.
Ukuran >0,5% depth dibatasi 20% notional awal per jam; setiap transaksi perlu quote ulang.
Quote carry hanya estimasi; posisi terbuka mengakrual carry aktual, tidak membukukan
estimasi dan aktual dua kali. Input invalid ditolak. Biaya >=100% notional tetap dilaporkan secara jujur; adapter menolak fill tersebut.

`metrics` memerlukan seri equity gross/net, turnover, exposure dan benchmark SPY/QQQ
pada interval yang sama. Menghasilkan return berpasangan, Sharpe, Sortino, Calmar,
drawdown/durasi, tail ratio, hit rate, average win/loss, turnover, exposure, dan atribusi
terhadap benchmark dengan volatilitas disetarakan. Risk-free rate saat ini nol dan
harus dinyatakan pada laporan. Rasio yang tidak terdefinisi adalah null.
Brier score dan reliability curve memakai prediksi yang telah memiliki outcome.

Komponen UI `PerformanceTable` menolak record gross-only. Tidak ada data contoh,
agent internal palsu, atau angka hasil yang di-hardcode. Tidak ada migrasi database
web; struktur laporan baru menjadi kontrak API publik.

Verifikasi: `scripts/test-core.ps1`. Pengujian mencakup 1.000 ukuran order untuk
monotonisitas slippage/batas partial fill, carry, pasangan gross/net dan kalibrasi.
Input sintetis hanya ada di tes terisolasi, tidak di aplikasi atau runtime.

Batasan: funding rebate negatif belum didukung; input rebate harus dinormalisasi
sebagai cashflow terpisah. Akurasi model memerlukan depth historis dan kalibrasi fill
nyata; konfigurasi tersebut tidak ditebak dari OHLCV.
