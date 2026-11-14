---
status: TESTING
last_reviewed: 2026-11-14
---

# Engine trading — operasi dan bukti

Tidak ada seed data, agent fiktif, hasil contoh, atau fallback angka harga di runtime.
Data yang belum diimpor atau layanan yang belum dikonfigurasi menghasilkan status
tidak tersedia atau error. Fixture hanya berada dalam tes dan direktori temporer tes.

## Komponen dan perintah

| Komponen | Implementasi |
| --- | --- |
| tickstore / features | Parquet create-only, OHLCV tertutup, lookback 48 bar, versi fitur eksplisit |
| costmodel / metrics | Slippage nonlinear, fee venue, gas/priority, carry; statistik gross/net berpasangan |
| ledger | RFC 8785 JCS + SHA-256, event append-only dengan fsync, writer lock, replay state, commit–reveal |
| anchor | Root hourly dan daily, kontrak SHA-256 ordered Merkle, worker transaksi/receipt/reorg |
| riskengine | Proses persisten terpisah, HMAC permit terikat request, TTL, veto, governor, kill file |
| engine / exec | Sinyal logistic terkalibrasi dan rule, accounting; adapter paper, sim-queue dan live |
| replay | Ingest, replay, training bounded, walk-forward kalender, sensitivitas, DSR, bootstrap 10.000 |
| advisory | Service async, total timeout 4s, satu retry, cache, fallback, SQLite llm_calls |
| API / web | REST read-only, WebSocket commit/reveal, `/evidence`, `/leaderboard`, `/verify` |
| session | SessionExecutor user-owned, scope vault/router/token, atomic-unit caps, expiry/revoke/kill |

```powershell
cargo build --workspace --locked
cargo run -p replay -- ingest BARS.jsonl NEW.parquet
cargo run -p replay -- calibrate OBSERVED_FILLS.json ASSET AS_OF_MS
cargo run -p replay -- features DATA.parquet ASSET FROM_MS THROUGH_MS features-v2-z48-pop-rsi14-bounded-atr14-simple
cargo run -p replay -- run CONFIG.json
cargo run -p replay -- portfolio PORTFOLIO.json      # replay::runtime::PortfolioConfig, maks 16 aset
node services/anchor/witness.mjs                     # witness batch commit (ADR 0005)
node services/scheduler/worker.mjs                   # runner per tick untuk job yang diaktifkan
node services/scheduler/worker.mjs --reset JOB_ID    # operator: pulihkan job halted/gate_failed
cargo run -p replay -- batch RUNS.json
cargo run -p replay -- windows FROM_MS THROUGH_MS TRAIN_MONTHS
cargo run -p replay -- study STUDY.json
cargo run -p api
node services/advisory/server.mjs
node services/anchor/worker.mjs --once
```

Windows tanpa MSVC: tambahkan `+1.92.0-x86_64-pc-windows-gnullvm` sesudah `cargo`,
dan folder `bin` LLVM-MinGW UCRT ke PATH. `scripts/test-core.ps1` menemukan instalasi WinGet.
Tidak ada perubahan default toolchain global yang diperlukan.

`RUNS.json` adalah array `{ "family": "nama-keluarga", "config": <replay::runtime::Config> }`.
Batch menerima hanya mode `backtest` atau `sim-queue`, mensyaratkan journal berbeda
per run, dan menjalankan maksimum delapan run bersamaan. Report memuat waktu aktual,
kegagalan, jumlah aset/keluarga, serta `runtime_target_met`. Flag itu hanya bisa benar
untuk 400 run baru dari 40 aset dan 10 keluarga dengan rentang minimal 36 bulan,
host maksimal delapan logical CPU, tanpa kegagalan, dan selesai di bawah 300 detik.
Belum ada dataset nyata untuk mengukur target tersebut.

## Data dan konfigurasi

Gunakan struct `replay::runtime::Config` sebagai kontrak konfigurasi JSON (unknown
fields ditolak). `bars` menunjuk Parquet v1; `market_data` adalah JSONL `runtime::Point`:
market open/depth/funding/borrow/gas/priority bertimestamp, `available_ts`, benchmark
SPY/QQQ, freshness, gap sigma, rasio spread, dan label rezim validasi. Satu run memakai
satu aset dan satu agent; portfolio lintas aset memerlukan orkestrasi dan telemetry
korelasi/sector lengkap. Tidak ada korelasi lintas aset yang ditebak oleh runner ini.

Data fitur dibatasi pada close_ts <= tick. Metadata market harus tersedia pada tick,
tidak lebih tua dari lima detik. Tidak ada forward-fill untuk gap OHLCV. Sumber vendor
harus menyediakan histori point-in-time dan jadwal perdagangan yang benar.

`Strategy` memerlukan koefisien logistic, payoff naik/turun, hash model training,
threshold, max_weight, horizon, dan lineage versi. `study` melatih koefisien hanya pada
training labels yang sudah resolved sebelum akhir training. Bukan panggilan LLM.

Environment wajib untuk runner:

- `SIRO_RISK_POLICY`: path JSON Policy, termasuk max_weight, target_vol_pct,
  risk_units_per_weight dan permit_ttl_ms (maksimum 5000).
- `SIRO_RISK_MAC_KEY`: secret hex minimal 32 byte; hanya risk dan execution worker
  boleh mengaksesnya dalam deployment dengan akun OS terpisah.
- `SIRO_KILL_FILE`: path kill switch; keberadaan file menghentikan order.
- `SIRO_SERVICE_ROOT`: root source service jika binary dipindah dari workspace build.

Config/journal berbeda untuk strategi, versi, modal atau mode berbeda. Journal private
tidak boleh diletakkan di `public/` atau dipublikasikan sebagai file statis: payload
keputusan penuh disimpan lokal, API menyembunyikannya sampai reveal.

## Bukti, API dan web

`SIRO_JOURNAL` menunjuk journal engine yang sudah ada. `SIRO_API_BIND` default
`127.0.0.1:4010`. `SIRO_ENGINE_API` menghubungkan Next.js ke API internal ini.

- `GET /agents`: laporan yang benar-benar dicatat, termasuk badge gagal.
- `GET /decisions?after=N`: maksimal 100 commitment/reveal per halaman.
- `GET /decisions/{id}`, `GET /verify/{id}`: chain status, commitment, record setelah
  reveal, proof keputusan → hourly root → daily root, dan receipt anchor jika tersedia.
- `GET /roots`: roots; `GET /ws`: stream commitment dan reveal.

Merkle leaf adalah commit_hash, parent adalah SHA256(left_bytes || right_bytes), odd
node diduplikasi. Tidak kompatibel dengan sorted-keccak MerkleProof OpenZeppelin.
Browser menghitung ulang JCS commitment serta kedua jalur Merkle menggunakan Web Crypto.
Root lokal belum membuktikan publikasi tepat waktu; receipt anchor dan chain publik
harus diperiksa secara independen. Timestamp replay historis tidak pernah dianggap
bukti bahwa keputusan sudah dipublikasikan sebelum harga bergerak.

Worker anchor memerlukan chain ID, address, RPC, owner key, deployment block,
confirmations >=2, path journal anchor terpisah dan path binary ledger melalui
`SIRO_ANCHOR_*` serta `SIRO_LEDGER_BINARY`. API membaca receipt melalui
`SIRO_ANCHOR_JOURNAL`. Worker menolak root konflik dan block hash yang berubah.

## Validasi dan release gate

`Study` menerima base config, training_months, >=2 kandidat, jumlah trial independen,
output_dir, dan oos_locks opsional keyed by lock hash. Ia memilih kandidat dari training,
mencatat lock, menguji bulan berikutnya, lalu menggeser satu bulan. Parameter diuji
0,8x dan 1,2x; survival mensyaratkan net return positif dan net DD <25%.
Stress memperbesar slippage k dua kali dan menambah 2 bps, sehingga biaya stress
setidaknya setara dua kali slippage termasuk minimum 2 bps.

Untuk publikasi OOS yang sah, `Anchor.lockStrategy(hash,start_seconds,end_seconds)`
harus terjadi sebelum start. Hash adalah JCS SHA256([strategy,features_version,start_ms,end_ms]).
Receipt proof berisi RPC HTTPS, chain ID, contract, tx_hash dan confirmations.
`services/anchor/verify-lock.mjs` memeriksa receipt, event, timestamp blok dan confirmations.
Histori yang baru diuji sekarang tidak bisa memperoleh lock tepat waktu secara retroaktif.

Gate melaporkan setiap kegagalan: 5 rezim, >=12 windows, >=70% survival untuk setiap
perturbation, DSR >=0,95 dengan trial history, net Sharpe >0,8, DD <25%, durasi DD <60
hari, edge positif pada stress dan receipt lock OOS per window. Hasil gagal tetap dapat
dibaca sebagai hasil riset; tidak memberikan izin live.

DSR mengikuti [Bailey & López de Prado, persamaan 2–3](https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf).
Sharpe trial memakai skala per periode, bukan skala annual yang tercampur. Total trial mencakup training, OOS, stress dan sensitivitas; DSR secara konservatif menganggap semuanya independen. Trial undefined tidak dibuang untuk mempercantik DSR. Bootstrap
10.000 memakai seed eksplisit dan circular moving blocks; laporkan asumsi block length.

## Live dan session key

`scripts/keeper.mjs --execute` ditolak. Worker lama hanya boleh memonitor read-only;
jalur broadcast langsungnya tidak memenuhi kontrak risk/commit/session engine baru.
Worker lama yang sudah berjalan perlu dihentikan saat melakukan migrasi deployment.
Halaman Schedules hanya menyimpan konfigurasi dalam keadaan paused dan API workspace
menolak `enabled: true` sampai scheduler tervalidasi terhubung ke runner baru.
Kalkulator CSV close-price lama juga tidak dipakai lagi oleh UI. Modulnya disimpan
untuk tes historis; guard build menolak impor ulang kalkulator tersebut ke halaman aplikasi.

Deploy `Anchor` dan `SessionExecutor` dengan owner pengguna yang benar. Pemilik vault
mengizinkan SessionExecutor sebagai executor, lalu memberikan session terbatas dengan
`grant`. Platform tidak menerima transfer dana. Batas on-chain menggunakan atomic
units aset dasar; expiry, allowlist, daily cap dan kill ditegakkan kontrak.

Live menggunakan `services/execution/live.mjs`, bukan fill sintetis. Wajib ada:

- `SIRO_EXECUTION_CONFIG`: chain_id, asset, vault, base, token, oracle, router,
  session_executor, live_cap_usd, confirmations, max_slippage_bps,
  max_oracle_age_seconds, reconciliation_tolerance_units.
- `SIRO_EXECUTION_RPC`, `SIRO_PRIVATE_RELAY_RPC`, `SIRO_MEV_PROTECTED=true`.
- `SIRO_SESSION_PRIVATE_KEY`, `SIRO_EXECUTION_DB`, `SIRO_EXECUTION_JOURNAL`, `SIRO_LEDGER_BINARY`, `SIRO_VALIDATION_JOURNAL`.
- `SIRO_USD_QUOTES`: quote nyata base_usd/native_usd dan timestamp, maksimum umur 30s.

Worker memverifikasi HMAC, decision di journal, gate strategi, chain ID, oracle,
posisi aktual, caps dan kill. Signed transaction di-fsync ke execution event journal; SQLite outbox hanya cache dan dapat direkonstruksi
sebelum broadcast; retry memakai raw transaction yang sama. ID child fill memakai
decision_id + ordinal fill yang sudah dibukukan, sehingga crash tidak membuat order baru.
Permit diperbarui melalui proses risk segera sebelum broadcast. RPC/receipt tidak pasti
menghasilkan halt dan kill; operator harus merekonsiliasi outbox dan chain sebelum restart.

Gas dibukukan sebagai biaya eksternal jika dibayar session signer; tidak didebit dua
kali dari cash vault. Sinyal di-commit sebelum menunggu receipt. Fill replay memakai
open eligible berikutnya secara konservatif satu jam setelah tick commitment.

## Advisory

`SIRO_LLM_PROVIDER_URL` menerima JSON task/input/schema dan mengembalikan
`{output,usage:{input_tokens,output_tokens}}`. Token price wajib disuplai dalam
`SIRO_LLM_INPUT_USD_PER_MILLION` dan `SIRO_LLM_OUTPUT_USD_PER_MILLION`.
`SIRO_LLM_API_KEY` opsional sesuai provider. Service mengaudit semua attempt pada
`SIRO_ADVISORY_DB` SQLite. Tidak ada provider/model palsu atau paid fallback tersembunyi.

Worker `services/advisory/worker.mjs` membaca commitment private dan menulis journal terpisah melalui binary ledger. Gunakan `SIRO_ADVISORY_URL`, `SIRO_ADVISORY_JOURNAL` dan `SIRO_LEDGER_BINARY`; API membaca journal advisory tersebut.

Client `services/advisory/client.mjs` mengembalikan rule advisory bila service gagal,
timeout, atau schema invalid. Advisory belum boleh mengubah jalur order deterministik.
Perbandingan alpha LLM di UI tetap unavailable sampai evaluasi pasangan dan biaya
token aktual benar-benar dipublikasikan; tidak menganggap narasi menambah alpha.

## Migrasi dan pengujian

Parquet baru tidak menimpa dataset lama. Event JSONL v1 baru bersifat append-only;
torn write/tamper menyebabkan penolakan, bukan truncation diam-diam. SQLite advisory
membuat llm_calls; execution membuat execution_outbox. Backup database, WAL, journal,
dan konfigurasi immutable bersama-sama; snapshot bukan sumber kebenaran.

```powershell
powershell -File scripts/test-core.ps1
cargo build --workspace --locked
npm run test:trading
node scripts/check-performance.mjs
node scripts/test-contracts.mjs
npm run build
```

Verifikasi lokal terakhir (13 November 2026): `cargo fmt --check` dan Clippy
workspace bersih; 21 tes Rust, 6 tes Node, 50 cutoff anti look-ahead dalam
integrasi replay, 115 tes Foundry non-fork, dan build produksi Next lulus.
Pengujian Node yang menjalankan binary Rust di Windows dengan toolchain gnullvm
memerlukan folder `bin` LLVM-MinGW UCRT dalam PATH proses. Verifikasi ini memakai
fixture tes terisolasi, bukan data pasar produksi atau transaksi live.

## Batasan yang belum dapat diklaim lulus

- Tidak ada histori produksi, deployment anchor/session, atau jendela OOS eksternal
  yang diberikan dalam permintaan ini. Tidak ada hasil profit, gate pass, atau tx live
  yang dibuat-buat untuk menutup kekosongan tersebut.
- Target benchmark 3 tahun × 40 aset × 10 agent <5 menit belum diukur. Journal fsync
  per event mengutamakan durability; optimasi batch replay belum membuktikan target itu.
- Runner saat ini long-only satu aset per run. Risk library mendukung input sector,
  correlation dan risk budget, tetapi orkestrasi portfolio bersama lintas aset serta
  benchmark risk-equivalent portfolio membutuhkan telemetry produksi yang lengkap.
- State analitis memakai f64; saldo authoritative, caps dan transfer live tetap atomic
  on-chain. Floating roundoff pada posisi nol ditangani eksplisit; jangan gunakan state
  analitis sebagai sumber saldo untuk withdrawal atau perubahan allowance.
- Kelayakan live lintas provider, proteksi MEV relay, reorg lanjutan dan kalibrasi k
  memerlukan pengujian integrasi pada konfigurasi chain/venue sebenarnya.
- API memindai journal saat membaca dan stream memakai polling 250ms. Uji beban dan
  p99 advisory <3s belum tersedia; timeout keras sudah diberlakukan.
