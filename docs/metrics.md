---
status: TESTING
last_reviewed: 2026-11-13
source_of_truth: crates/metrics/src/lib.rs, crates/replay/src/validation.rs, crates/api/src/advisory.rs
---

# Glosarium metrik

Setiap angka di `/evidence`, `/leaderboard`, dan laporan replay dihitung oleh kode di
atas. Kalau dokumen ini dan kode berbeda, kode yang benar dan dokumen ini salah.
Laporkan lewat `docs/honesty-log.md`.

Status `TESTING`: formula sudah diimplementasi dan diuji di Rust. Belum ada agent yang
berjalan live dengan uang nyata. Semua angka yang kamu lihat hari ini berasal dari
`backtest` atau `paper`, dan label mode ditampilkan di kolom tabel.

## Konvensi umum

- **Seri dasar.** Equity per bar, interval wajib seragam. Interval tidak seragam ditolak
  (`invalid equity series or irregular interval`), bukan diisi.
- **Return per periode.** `r_t = equity_t / equity_{t-1} - 1`. Bar pertama dibandingkan
  dengan modal awal.
- **Faktor tahunan.** `P = 365.25 × 86 400 000 / interval_ms`. Untuk bar 1 jam,
  `P = 8766`. Kalender 24/7 diasumsikan untuk semua aset.
- **Bruto vs net.** `gross_equity` sebelum biaya. `net_equity` setelah fee venue,
  slippage, gas, funding, dan borrow (lihat `docs/costs.md`). Setiap metrik di bawah
  memakai seri **net**, kecuali namanya diawali `gross_`.
- **Tidak terdefinisi = null.** Pembagi nol atau non-finite menghasilkan `null`, tampil
  "Unavailable". Tidak pernah diganti 0.
- **Risk-free rate = 0.** Tidak ada pengurangan suku bunga risk-free di formula mana pun.

## Daftar metrik

### `gross_return` / `net_return`

- **Formula.** `equity_akhir / modal_awal - 1`.
- **Satuan.** Pecahan. UI menampilkan persen.
- **Cara baca.** Selisih keduanya adalah total biaya. Kalau jaraknya lebar, strategi
  hidup dari turnover.
- **Kapan metrik ini berbohong.**
  - Tidak ada rentang waktu di dalam angka itu sendiri. Return 1 minggu dan 1 tahun
    tampil sama besar. Selalu baca bersama tanggal run.
  - Return total tidak menunjukkan jalan yang dilalui. Contoh: -40% lalu +70% berakhir di +2%.
  - `gross_return` adalah angka yang tidak bisa diraih siapa pun. Jangan dikutip sendirian.

### `gross_sharpe` / `net_sharpe`

- **Formula.** `mean(r) × √P / stdev_sampel(r)`. Rata-rata aritmetika, tanpa risk-free.
  `null` jika kurang dari 2 return atau stdev 0.
- **Satuan.** Tanpa satuan, sudah ditahunkan.
- **Cara baca.** Return per unit volatilitas. Gate replay mensyaratkan `net_sharpe > 0.8`.
- **Kapan metrik ini berbohong.**
  - Sampel pendek. Pada 500 bar jam (~21 hari), galat standar Sharpe tahunan ≈ √(8766/500)
    ≈ 4.2, jadi interval 95% sekitar ±8. Angka 3.0 dari 3 minggu data tidak berarti apa-apa. Lihat
    `sharpe_ci95` dari bootstrap.
  - Strategi yang menjual volatilitas (banyak menang kecil, jarang kalah besar) punya
    Sharpe tinggi sampai kejadian ekor datang. Sharpe tidak melihat skew. Bandingkan
    dengan `tail_ratio` dan `sortino`.
  - Return bar jam pada aset yang tidak likuid berautokorelasi. Volatilitas jadi terlihat
    lebih rendah, dan Sharpe terlihat lebih tinggi. Kode tidak mengoreksi autokorelasi.
  - Kalender 24/7: untuk saham tokenized yang harganya tidak bergerak di luar jam bursa,
    bar datar ikut dihitung. Gap pembukaan masuk ke satu bar.
  - Tanpa risk-free. Misal di lingkungan suku bunga 4–5% per tahun, Sharpe yang dilaporkan
    lebih tinggi daripada Sharpe excess-return standar.

### `sortino`

- **Formula.** `mean(r) × √P / √( Σ min(r,0)² / n )`. Target 0, pembagi n (bukan n−1).
- **Kapan metrik ini berbohong.** Jika hampir tidak ada bar negatif, penyebutnya mendekati
  0 dan angkanya meledak. Sortino 15 biasanya berarti "sampel belum melihat kerugian",
  bukan "strategi luar biasa".

### `max_drawdown`

- **Formula.** `max_t (1 - net_equity_t / max_{s≤t} net_equity_s)`, puncak awal = modal.
- **Satuan.** Pecahan positif. Gate replay mensyaratkan `< 0.25`.
- **Kapan metrik ini berbohong.**
  - Diukur di **penutupan bar**, bukan intrabar. Contoh: penurunan 15% yang pulih dalam bar yang
    sama tidak tercatat. Stop-loss dan likuidasi tetap terjadi di dunia nyata.
  - Satu run = satu jalur sejarah. DD historis adalah batas bawah DD masa depan, bukan
    batas atas. Lihat `drawdown_ci95` dari bootstrap.

### `longest_drawdown_days`

- **Formula.** Durasi terpanjang (hari) antara puncak dan pemulihan ke puncak itu. Jika
  run berakhir saat masih underwater, durasi dihitung sampai bar terakhir.
- **Kapan metrik ini berbohong.** Run pendek memotong durasi. Run 30 hari tidak bisa
  memperlihatkan drawdown 90 hari. Gate mensyaratkan `< 60` hari, jadi run yang terlalu
  pendek lulus syarat ini secara otomatis.

### `calmar`

- **Formula.** `((net_equity_akhir / modal)^(1/tahun) - 1) / max_drawdown`, dengan
  `tahun = jumlah_bar / P`.
- **Kapan metrik ini berbohong.** Annualisasi geometrik dari run pendek. Contoh: +3% dalam 10 hari
  menjadi ~+194% per tahun. Calmar dari run di bawah 1 tahun sebaiknya tidak dibaca.
  `null` jika DD = 0, yang terjadi pada run yang hanya naik.

### `tail_ratio`

- **Formula.** `|persentil_95(r)| / |persentil_5(r)|`, indeks dibulatkan ke bawah, tanpa
  interpolasi.
- **Kapan metrik ini berbohong.** Di bawah ~200 return, persentil 5% hanya berisi segelintir
  bar, dan satu bar bisa mengubah angka ini secara drastis. Metrik ini juga mengabaikan
  ekor di luar persentil 5/95, padahal di situlah kerugian besar berada.

### `hit_rate`

- **Formula.** `jumlah_trade(pnl_net > 0) / jumlah_trade`.
- **Kapan metrik ini berbohong.**
  - Trade dengan PnL net tepat 0 dihitung di penyebut tapi bukan menang. Ini membuat
    angkanya sedikit lebih rendah, bukan lebih tinggi. Kami catat supaya konsisten.
  - Hit rate tinggi tanpa `average_win` dan `average_loss` di sebelahnya menyesatkan.
    Contoh: 90% menang × $1 dan 10% kalah × $20 = ekspektasi negatif.

### `average_win` / `average_loss`

- **Formula.** Rata-rata PnL net trade yang > 0 / < 0, dalam USD.
- **Kapan metrik ini berbohong.** Rata-rata disetir outlier. Satu trade beruntung besar
  menutupi puluhan trade biasa. Median tidak dipublikasikan (lihat `limitations.md`).

### `turnover`

- **Formula.** `Σ turnover_usd / modal_awal`. Tidak ditahunkan.
- **Cara baca.** 50 berarti modal diperdagangkan 50 kali sepanjang run. Kalikan dengan
  biaya round-trip untuk memperkirakan berapa banyak edge yang habis untuk biaya.
- **Kapan metrik ini berbohong.** Tidak ditahunkan, jadi turnover dari run dengan durasi
  berbeda tidak bisa dibandingkan langsung.

### `time_in_market` / `average_exposure`

- **Formula.** Fraksi bar dengan exposure > 0 / rata-rata exposure per bar.
- **Kapan metrik ini berbohong.** Exposure tidak memperhitungkan arah atau leverage per
  aset. Exposure 0.5 di satu aset volatil lebih berisiko daripada 0.5 di aset tenang.

### `spy.beta` / `qqq.beta` ("beta, risk matched")

- **Formula.** Benchmark dulu diskalakan ke volatilitas strategi: `b' = b × σ_r / σ_b`.
  Lalu `beta = cov(r, b') / var(b')`.
- **Peringatan penting.** Secara aljabar `cov(r, b') / var(b') = cov(r,b) / (σ_r σ_b)`,
  yaitu **korelasi**, bukan beta OLS standar. Nilainya selalu di [-1, 1]. Strategi
  dengan leverage 3× SPY akan tampil dengan "beta" 1.0, bukan 3.0.
- **Kapan metrik ini berbohong.** Pembaca yang mengira ini beta standar akan meremehkan
  exposure pasar strategi yang lebih volatil daripada indeks. Lihat temuan red team
  RT-01 di bawah.

### `spy.alpha_annual` / `qqq.alpha_annual` ("alpha, risk matched")

- **Formula.** `(mean(r) - beta × mean(b')) × P`, dengan `b'` dan `beta` seperti di atas.
- **Cara baca.** Return tahunan di atas benchmark yang diskalakan ke volatilitas
  yang sama, setelah porsi korelasinya dikeluarkan.
- **Kapan metrik ini berbohong.**
  - Return aritmetika × P bukan return yang bisa diraih. Untuk seri volatil, angka ini
    lebih tinggi daripada selisih return majemuk.
  - Benchmark SPY/QQQ diperdagangkan di jam bursa AS. Di bar ketika bursa tutup, return
    benchmark = 0 sedangkan aset onchain bergerak. Korelasi turun, dan "alpha" naik
    tanpa ada keahlian.
  - Tanpa uji signifikansi. Alpha tanpa `information_ratio` dan ukuran sampel bukan bukti.

### `spy.information_ratio` / `qqq.information_ratio`

- **Formula.** Sharpe dari `r - b'` (active return terhadap benchmark yang diskalakan).
- **Kapan metrik ini berbohong.** Sama seperti Sharpe, plus: karena `b'` sudah diskalakan
  ke volatilitas strategi, IR ini tidak sama dengan IR yang dilaporkan manajer dana pada
  umumnya. Jangan bandingkan lintas sumber.

### `brier` (skor kalibrasi)

- **Formula.** `mean((p - y)²)`, dengan `p` = probabilitas naik dari model, `y` ∈ {0,1}.
  Kurva reliabilitas 10 bin disertakan.
- **Cara baca.** 0 = sempurna. 0.25 = sama dengan selalu menebak 0.5.
- **Kapan metrik ini berbohong.**
  - Contoh: kalau base rate 70% naik, model yang selalu bilang 0.7 mendapat Brier 0.21 tanpa
    informasi apa pun. Bandingkan dengan Brier "selalu base rate", yang belum kami
    tampilkan di UI.
  - Brier rendah tidak berarti profit. Kalibrasi bagus pada pergerakan kecil tidak
    menutup biaya.

### `dsr_probability` (Deflated Sharpe Ratio)

- **Formula.** Bailey & López de Prado (2014), persamaan 2–3. Menghitung probabilitas
  Sharpe sebenarnya > 0 setelah mengoreksi jumlah percobaan, skew, dan kurtosis.
  Gate mensyaratkan ≥ 0.95.
- **Kapan metrik ini berbohong.** DSR hanya sejujur daftar `trials` yang dimasukkan.
  Kalau 200 varian dicoba tapi hanya 5 yang dicatat, DSR terlihat lulus. Saat ini jumlah
  percobaan **dilaporkan oleh operator sendiri**. Tidak ada mekanisme yang memaksa
  semua percobaan tercatat.

### `sharpe_ci95` / `drawdown_ci95` (bootstrap)

- **Formula.** Circular block bootstrap, 10 000 iterasi, seed dan panjang blok
  dipublikasikan. Interval persentil 2.5%–97.5%.
- **Kapan metrik ini berbohong.** Bootstrap hanya mengacak ulang sejarah yang sama. Rezim
  yang tidak ada di data tidak akan muncul di interval. Panjang blok yang terlalu pendek
  memecah autokorelasi dan mempersempit interval.

### `advisory_comparison` ("With LLM" vs "Without LLM")

- **Formula** (`crates/api/src/advisory.rs`). Order **identik** di kedua varian.
  `without_llm_net = net`. `with_llm_net = net - biaya_token / modal`. Return bruto
  kedua varian sama persis.
- **Peringatan penting.** Tabel ini **tidak mengukur kontribusi LLM terhadap keputusan**.
  Ia hanya mengukur biaya token. Secara konstruksi, "With LLM" tidak akan pernah lebih
  baik daripada "Without LLM". Judul UI "Advisory contribution" menyesatkan. Lihat RT-02.

### Gate validasi (`gate`)

Delapan syarat, semua harus lulus: 5 rezim pasar, ≥ 12 jendela walk-forward,
sensitivitas parameter ±20% bertahan di ≥ 70% jendela, DSR ≥ 0.95, net Sharpe > 0.8,
DD < 0.25 dan durasi < 60 hari, edge net masih positif dengan slippage 2×, dan setiap
jendela OOS punya lock terverifikasi eksternal.

**Kapan gate ini berbohong.** Label rezim (`bull`, `bear`, ...) diisi di data input, bukan
dideteksi oleh kode. Satu bar berlabel `vol_shock` sudah memenuhi syarat rezim.

## Temuan red team (2026-11-13)

Hasil membaca kode metrik dengan niat mencari celah. Belum ada data live, jadi bukti
di sini berasal dari aljabar dan kode, bukan dari angka produksi.

| ID | Metrik | Serangan | Bukti | Perbaikan | Tingkat |
| --- | --- | --- | --- | --- | --- |
| RT-01 | `beta` (SPY/QQQ) | Label "beta" padahal nilainya korelasi | `cov(r, b·σr/σb)/var(b·σr/σb) = ρ`; leverage 3× tampil 1.0 | Ganti label UI menjadi "korelasi", atau publikasikan beta OLS mentah di sebelahnya | KRITIS |
| RT-02 | `advisory_comparison` | Tabel "kontribusi" yang tidak bisa menunjukkan kontribusi | `advisory.rs:40`: order identik, bruto sama, net hanya dikurangi biaya token | Ganti judul jadi "Biaya advisory", dan jalankan ablation dengan order berbeda sebelum klaim kontribusi | KRITIS |
| RT-03 | `dsr_probability` | Percobaan tidak dicatat → DSR lulus | Input `trials` dari operator; tidak ada log percobaan yang append-only | Catat setiap run `study` ke ledger, dan hitung `trials` dari ledger | KRITIS |
| RT-04 | `alpha_annual` | Jam bursa tutup → return benchmark 0 → korelasi turun → alpha net naik | Benchmark 0 di bar tutup bursa; aset 24/7 tetap bergerak | Hitung alpha hanya di bar ketika bursa buka, atau tandai di UI | SEDANG |
| RT-05 | `calmar`, `sortino` | Run pendek menghasilkan angka ekstrem | Calmar mengannualisasi geometrik dari jumlah bar; Sortino tanpa batas bawah | Sembunyikan jika run < 365 hari atau bar negatif < 30 | SEDANG |
| RT-06 | `max_drawdown` | Intrabar tidak terlihat | Hanya `net_equity` di penutupan bar | Tambahkan DD berbasis low bar, atau label "DD penutupan bar" | SEDANG |
| RT-07 | gate `regimes` | Satu bar berlabel cukup | `regimes.iter().any(...)` tanpa jumlah minimum | Syarat minimum bar per rezim | SEDANG |
| RT-08 | `brier` | Tanpa baseline | Base rate saja menghasilkan Brier < 0.25 | Tampilkan Brier skill score vs base rate | RINGAN |

Aturan: tidak ada temuan KRITIS yang ditutup tanpa perubahan label UI atau perbaikan
hitungan, plus test regresi.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menolak "beta" dan "alpha" kami sebagai angka beta/alpha standar, karena
"beta" yang ditampilkan sebenarnya korelasi. Pembaca bisa menolak tabel "Advisory
contribution" sebagai bukti bahwa LLM menambah nilai, karena kode menjalankan order
identik. Pembaca bisa menolak Sharpe, Calmar, atau Sortino dari run pendek, dan menuntut
interval bootstrap-nya. Pembaca bisa menolak DSR yang lulus selama jumlah percobaan masih
dilaporkan sendiri. Setiap bantahan ini bisa diperiksa langsung di file sumber yang
disebut di frontmatter.
