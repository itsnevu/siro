---
status: PLANNED
last_reviewed: 2026-11-13
---

# Kondisi gagal

Halaman ini menulis di muka kondisi yang membuktikan Siro **tidak bekerja**. Kalau
salah satu kondisi di bawah terpenuhi pada tanggal evaluasinya, kami menulis hasilnya
di `docs/honesty-log.md` dan memperbarui README. Kami tidak menggeser tanggal atau ambang
setelah melihat data.

Status `PLANNED`: per 2026-11-13 belum ada agent live. Jam evaluasi mulai berjalan pada
**T0 = tanggal agent publik pertama berjalan dengan modal nyata**. T0 dicatat sebagai tx
anchor dan ditulis di sini saat terjadi. Sebelum T0, halaman ini adalah janji, bukan hasil.

Semua metrik memakai definisi di `docs/metrics.md`, seri **net**, mode `live`.
Angka `backtest` dan `paper` tidak dihitung di sini.

## Kondisi

### F1. Mesin tidak menambah nilai di atas pasar

- **Metrik.** Median `spy.alpha_annual` net dari semua agent publik yang berjalan ≥ 60 hari.
- **Gagal jika.** Median ≤ 0, dengan minimal 50 agent.
- **Evaluasi.** T0 + 90 hari, lalu setiap 90 hari.
- **Catatan.** Karena "alpha" kami diukur terhadap benchmark yang diskalakan volatilitasnya
  (lihat RT-01), kami juga mempublikasikan median selisih return majemuk net vs SPY buy-and-hold
  pada periode yang sama. Keduanya harus > 0.
- **Jika baru < 50 agent.** Evaluasi ditunda, dan penundaan itu sendiri dicatat.

### F2. Backtest tidak memprediksi live

- **Metrik.** Untuk setiap agent yang lulus gate validasi: rasio `net_sharpe live` /
  `net_sharpe backtest OOS`.
- **Gagal jika.** Median rasio < 0.3 pada minimal 20 agent dengan ≥ 90 hari live.
- **Evaluasi.** T0 + 180 hari.
- **Artinya.** Gate validasi (DSR, walk-forward, sensitivitas) tidak menyaring overfitting.
  Gate harus didesain ulang sebelum agent baru diizinkan masuk leaderboard.

### F3. LLM advisory tidak menambah nilai

- **Metrik.** Selisih net return antara varian dengan dan tanpa advisory, dengan order
  yang **benar-benar berbeda** (ablation sungguhan, bukan tabel biaya saat ini, lihat RT-02).
- **Gagal jika.** Selisih rata-rata ≤ biaya token per agent, atau interval bootstrap 95%
  memuat 0, pada ≥ 30 agent selama ≥ 90 hari.
- **Evaluasi.** 90 hari setelah ablation sungguhan pertama kali dijalankan.
- **Konsekuensi.** Advisory menjadi opsional dan dimatikan secara default. Halaman
  produk berhenti menyebut LLM sebagai sumber keputusan.

### F4. Biaya memakan edge

- **Metrik.** Rasio `(gross_return - net_return) / gross_return` agregat seluruh agent live.
- **Gagal jika.** Rasio > 0.8 selama 2 kuartal berturut-turut. Artinya lebih dari 80% edge
  bruto habis untuk fee, slippage, dan gas.
- **Evaluasi.** Akhir setiap kuartal kalender setelah T0.

### F5. Model biaya kami salah

- **Metrik.** Slippage realisasi per fill vs slippage prediksi `costmodel`.
- **Gagal jika.** Median slippage realisasi > 2× prediksi pada ≥ 500 fill.
- **Evaluasi.** Begitu 500 fill live tercapai, lalu bulanan.
- **Artinya.** Semua angka net historis kami terlalu optimistis dan harus dihitung ulang
  di `honesty-log.md`.

### F6. Probabilitas model tidak terkalibrasi

- **Metrik.** Brier skill score vs base rate, agregat seluruh keputusan live.
- **Gagal jika.** Skill score ≤ 0 pada ≥ 5 000 keputusan resolved.
- **Evaluasi.** T0 + 90 hari.

### F7. Verifikasi tidak bisa dipakai orang luar

- **Metrik.** Uji pengguna: orang tanpa akun Siro mengikuti `docs/verification.md` untuk
  satu keputusan acak.
- **Gagal jika.** Kurang dari 4 dari 5 penguji non-teknis berhasil sendiri dalam 20 menit.
- **Evaluasi.** Sebelum `verification.md` dinaikkan ke `LIVE`, lalu setiap rilis mayor.
- **Artinya.** Klaim "bisa diverifikasi" tidak berlaku untuk orang yang paling membutuhkannya.

## Yang tidak dihitung sebagai bukti keberhasilan

- Agent dengan return tertinggi di leaderboard. Dengan 50 agent acak, satu pasti di atas.
- Angka backtest apa pun, termasuk yang lulus gate.
- Agent internal tim, kecuali ditandai `internal` dan dipisah dari median.
- Harga token SIRO.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa memeriksa sendiri, pada tanggal yang tertulis, apakah median alpha net,
rasio live/backtest, nilai advisory, beban biaya, akurasi model slippage, dan kalibrasi
memenuhi ambang di atas. Kalau ada yang terpenuhi dan kami tidak menulisnya di
`honesty-log.md`, itu pelanggaran halaman ini yang bisa ditunjukkan siapa pun. Pembaca
juga bisa menuntut T0 diumumkan, karena tanpa T0 semua tenggat di sini tidak berlaku.
