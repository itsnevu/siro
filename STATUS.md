# Siro: catatan status (13 Nov 2026)

## Jaringan
- Robinhood Chain mainnet 4663 dan testnet 46630, gas ETH, deposit USDG. Registry `src/lib/chains.ts`.
- Relay RPC `/api/rpc/<chainId>` dengan upstream cadangan (publicnode, globalstake, Pinax, dRPC), karena domain robinhood.com diblokir ISP Indonesia.
- Belum ada kontrak Siro yang di-deploy. Produk escrow "Pact" lama sudah dihapus dari repo; kontraknya yang dulu di-deploy (`0xf7c81a882594b3f3ddd969ebfa750e30eedaead3` di 4663) masih ada onchain tapi tidak dipakai.

## Kontrak
- `forge test`: 73/73 lolos (fork test butuh `RH_RPC_URL`).
- `test/ReadinessAudit.t.sol` mereproduksi 5 celah di `SiroCopyVault` yang harus ditutup sebelum deploy dengan dana asli:
  1. vault lain bisa menjual posisi milik user lain (posisi token dikumpulkan bersama);
  2. keeper bisa mengalihkan output swap dengan minimum output nol;
  3. kill switch terbaca mati sebelum user mengisi risk config;
  4. owner tidak bisa menarik posisi yang sudah diinvestasikan;
  5. deposit baru menghapus profit yang belum kena fee.
- Arah baru: `GuardedVault` (ERC-4626 per agent) menggantikan `SiroCopyVault`. `test/GuardedVault.t.sol` (13 test) mengunci perilakunya: celah 1–3 tertutup by design, celah 5 tidak relevan (tanpa fee).
- Celah 4 ditutup dengan `redeemInKind`: user menebus share untuk porsi pro-rata setiap aset yang dipegang vault, tanpa oracle, tanpa terhalang kill switch.
- `ChainlinkOracle` (adapter `ITwapOracle`): harga lewat feed USD Chainlink untuk kedua sisi (USDG punya feed sendiri), feed write-once, menolak harga ≤ 0 dan token yang `oraclePaused()`. 8 unit test + fork test ke feed asli (1 NVDA ≈ 164,74 USDG).
- `UniswapV3Adapter` (single-hop SwapRouter02, route write-once) sudah ada dan teruji. Dashboard memakai `GuardedVault`/factory; transaksi dengan wallet testnet sungguhan masih perlu diuji setelah deploy.
- `GuardedVaultFactory`: satu vault per agent, aset/oracle/timelock (min 1 hari) ditetapkan protokol. `AgentRegistry` sekarang hanya menerima pendaftaran dari factory, satu agent per vault (sebelumnya siapa pun bisa mendaftarkan vault orang lain).
- Diperbaiki di `GuardedVault` (review internal, masing-masing ada test): token yang di-disable tetap dihitung di `totalAssets`; deposit/redeem terkunci selama trade (anti-reentrancy router); offset share 1e6 terhadap inflation attack deposit pertama.
- `forge test` dengan `RH_RPC_URL`: 104/104 lolos.
- Review internal 2026-11-13 (masing-masing ada test regresi):
  - KRITIS: disable lalu enable ulang token membuat token tercatat dua kali di `trackedAssets`, sehingga NAV terhitung ganda dan `redeemInKind` membayar lebih. Ditutup dengan `isTracked`.
  - TINGGI: deposit/withdraw memakai harga oracle tanpa cek umur, sehingga orang bisa masuk/keluar di harga basi. Sekarang keduanya revert `StaleOracle`; `redeemInKind` tetap jalan tanpa oracle.
  - SEDANG: `ChainlinkOracle` belum cek sequencer L2. Ditambah `setSequencerFeed` (write-once, grace 1 jam); deploy mainnet mewajibkan `SEQUENCER_UPTIME_FEED`.
  - `/api/session` 500 untuk signature non-EOA. Kini smart wallet diverifikasi on-chain (ERC-1271/6492), signature rusak dibalas 401.
- Review di atas bukan audit independen.
- Belum diaudit.

## Frontend
- `/markets` memakai harga live: Robinhood Stock Token API, dengan cadangan feed Chainlink onchain.
- `src/lib/hooks.ts` sudah disesuaikan ke ABI kontrak asli (sebelumnya memanggil fungsi yang tidak ada).
- Data dummy masih ada di `/strategies`, `/buyback`, dan statistik platform sampai vault berjalan.

## Persiapan tanpa deploy publik (13 Nov)
- Jalur `DeploySiro` diganti ke `ChainlinkOracle` + `AgentRegistry` + `GuardedVaultFactory`. Tidak lagi men-deploy CopyVault lama. Jaringan publik wajib key, USDG 6 decimals dan feed valid; key default Anvil ditolak, mainnet perlu opt-in.
- Runner deploy lintas platform menjalankan simulasi secara default. Saat broadcast, receipt, bytecode dan wiring diverifikasi sebelum record dipublikasikan dan ABI disinkronkan. Dry run dan kandidat `.pending.json` tidak menjadi deployment frontend.
- Dashboard: create agent, pilih vault dari 100 agent terbaru, approve/deposit USDG, withdraw, redeem semua share in kind, kill switch, serta queue/activate policy onchain. Hooks dan ABI legacy CopyVault dihentikan.
- Chain 46630 dapat diaktifkan dengan RPC eksplisit; konfigurasi token kosong tidak lagi menjadi native mode. Belum ada deployment publik yang dicatat.
- Halaman mock utama diberi label Demo. Backtest dinonaktifkan, respons Agent diberi keterangan contoh tetap, dismiss approvals tidak diklaim sebagai approval onchain. Policies mengarah ke kontrol vault aktual. Settings menggunakan wallet terhubung; klaim Privy dan uptime palsu dihapus dari halaman terkait.
- Delapan direktori root dengan path rusak diperiksa kosong lalu dihapus. Penghapusan `.env.example` yang sudah ada sebelumnya tetap dipertahankan; `contracts/.env` tidak diedit.
- Uji lokal mencakup deployment Anvil dengan verifikasi runner, serta siklus create/deposit/withdraw/redeem saat pause. 99 tes kontrak non-fork lolos; dua suite fork tidak dapat dijalankan tanpa `RH_RPC_URL`. Belum ada uji extension wallet atau transaksi publik dalam pekerjaan ini.
- Panduan konfigurasi dan langkah berikutnya: `docs/GUARDED_VAULT_RUNBOOK.md`.
