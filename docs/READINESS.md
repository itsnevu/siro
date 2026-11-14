---
status: TESTING
last_reviewed: 2026-11-14
---

# Audit kesiapan Siro (Robinhood Chain mainnet)

> **Sejak 2026-11-14 Siro hanya berjalan di Robinhood Chain mainnet (4663).** Tidak ada testnet maupun
> chain lokal. Semua rujukan testnet di bawah adalah bagian dari snapshot historis dan tidak berlaku lagi.

> Catatan 13 November 2026: laporan di bawah adalah snapshot historis. Jalur deploy, ABI, dan dashboard telah dipindah ke GuardedVault; sebagian temuan integrasi dan tampilan sudah ditangani. Lihat `STATUS.md` dan `docs/GUARDED_VAULT_RUNBOOK.md` untuk keadaan terbaru. Adapter DEX, deployment publik, keeper/indexer, audit independen, dan uji wallet testnet tetap belum selesai.

Tanggal: 8 November 2026. Target browser: http://localhost:3001/.

**Keputusan: belum siap untuk testnet publik dengan deposit dan copy trading aktif.** Frontend bisa dibangun untuk preview, tetapi integrasi kontrak dan beberapa batas keamanan masih menghalangi peluncuran. Kontrak produksi tidak diubah atau dideploy dalam pemeriksaan ini.

## Hasil pemeriksaan

| Pemeriksaan | Hasil | Batas verifikasi |
|---|---|---|
| `npm run build` | Lulus; 57 halaman diprerender | Tidak membuktikan transaksi blockchain berhasil |
| `npm run lint` | Lulus, tanpa warning | Satu komentar eslint yang tidak terpakai dibersihkan |
| TypeScript | Lulus, termasuk tahap production build | ABI yang salah tetap bisa lolos karena frontend memakai ABI yang berbeda dari source Solidity |
| Suite Foundry awal | 62 tes lulus | Cakupan awal belum mendeteksi masalah di bawah |
| Tes reproduksi tambahan | 5 tes lulus | **Lulus berarti berhasil mereproduksi perilaku tidak aman, bukan berarti kontrak aman** |
| Halaman browser | 46 URL diperiksa | 43 URL utama + 3 contoh detail; tidak mencakup setiap kombinasi state dan setiap artikel |
| Mobile | 7 halaman utama, lebar 390px | Tidak ditemukan horizontal overflow pada sampel |
| Login wallet | Connect → `/app` → disconnect berhasil dengan provider EIP-1193 simulasi | Belum diuji dengan extension wallet nyata, hardware wallet, atau transaksi testnet |
| Tanpa wallet | Empty state tampil dengan benar | Hanya injected wallet; tidak ada integrasi WalletConnect/Privy dalam konfigurasi saat ini |

Tidak ditemukan runtime exception pada penelusuran browser. `/brand` masih memuat dua gambar logo yang gagal karena menunjuk ke `/brand/S-transparent.png` yang sudah tidak tersedia. Halaman detail yang diperiksa: `/markets/tAAPL`, `/strategies/alpha-momentum`, dan `/blog/every-hole-you-can-poke-in-siro`.

## Kontrak: penghalang peluncuran

### SC-01 — Posisi token antar pengguna tidak terisolasi — kritis

Sumber: `contracts/src/SiroCopyVault.sol`, `executeSwap`, `_doSwap`, `_updateBalance`; `contracts/src/SiroRiskGuard.sol`, `recordTrade`.

Semua aset disimpan dalam satu kontrak. Penjualan token non-USDC tidak memastikan bahwa vault pengguna tersebut memiliki jumlah token yang dijual. RiskGuard mengurangi posisi yang tidak cukup menjadi nol, bukan menolak transaksi.

Reproduksi: Alice membeli 500 unit ASSET. Keeper kemudian menjual 500 ASSET yang sama atas nama Bob, yang tidak pernah membeli ASSET. Saldo USDC Bob bertambah; Bob bisa menarik keuntungan tersebut, sementara posisi tercatat Alice tetap ada meski token fisiknya habis.

Prasyarat: keeper menjalankan swap melalui router dan selector yang telah diizinkan admin. Ini bukan serangan langsung oleh sembarang wallet; dampaknya membuat keeper yang salah atau dikompromikan mampu melanggar pemisahan dana pengguna.

Tes: `test_audit_anotherVaultCanSellUsersPosition`.

Perbaikan yang diperlukan: ledger kepemilikan per pengguna per token, pemeriksaan posisi sebelum pengeluaran, rekonsiliasi perubahan saldo input/output aktual, serta invariant bahwa total kewajiban pengguna dan fee selalu ditopang saldo kontrak.

### SC-02 — Output swap dapat diarahkan ke keeper; batas slippage pengguna tidak ditegakkan — kritis

Sumber: `SiroCopyVault.executeSwap` dan `_doSwap`; `SiroRiskGuard.getSlippageTolerance`.

Kontrak hanya memeriksa selector calldata, lalu meneruskan calldata ke router. Recipient, token, dan amount dalam calldata tidak diikat ke parameter yang diperiksa. Keeper juga memilih `minAmountOut` sendiri. Nilai slippage milik pengguna disimpan tetapi tidak digunakan untuk menghitung minimum output.

Reproduksi: pengguna mengatur slippage 1 bps. Keeper mengirim swap dengan recipient keeper dan `minAmountOut = 0`. Aset hasil masuk ke keeper; kontrak menerima nol output dan tetap menerima transaksi.

Prasyarat: keeper dan router/selector yang diizinkan, seperti SC-01. Router tes melakukan `transferFrom` normal untuk input; tidak memerlukan ERC-20 dengan perilaku transfer tidak standar.

Tes: `test_audit_keeperCanRedirectOutputWithZeroMinimum`.

Perbaikan yang diperlukan: adapter router yang membangun calldata tervalidasi, recipient tetap kontrak, token/amount sesuai posisi pengguna, dan batas minimum berbasis quote/oracle yang tidak sepenuhnya ditentukan keeper.

### SC-03 — Pemilik tidak dapat menarik posisi yang telah diinvestasikan secara mandiri — tinggi

`vaultBalance` hanya melacak saldo settlement token. Sesudah USDC ditukar menjadi aset lain, nilai tersebut berkurang, tetapi tidak ada jalur penarikan aset per pengguna atau exit yang bisa dilakukan pemilik tanpa keeper.

Reproduksi: konfigurasi mengizinkan investasi seluruh saldo. Setelah seluruh USDC menjadi ASSET, `withdraw(max)` revert `InvalidAmount` meskipun ASSET masih berada dalam kontrak. Pemilik bergantung pada keeper untuk menjual kembali; ini bertentangan dengan klaim dapat menarik aset kapan saja tanpa izin.

Tes: `test_audit_ownerCannotWithdrawInvestedPosition`.

Perbaikan yang diperlukan: penarikan posisi aset secara langsung atau jalur exit oleh pemilik yang tetap terisolasi dan aman, dengan definisi NAV dan fee yang jelas.

### SC-04 — Deposit dapat menghapus profit yang belum dikenai performance fee — tinggi

`deposit` menaikkan high-water mark ke seluruh saldo baru, termasuk profit yang sudah ada, sebelum profit tersebut dikenai fee.

Reproduksi: modal 10.000 USDC menghasilkan profit 200 USDC melalui rangkaian beli/jual. Pengguna menambah deposit 100 USDC lalu menarik seluruh saldo. Profit 200 USDC diterima utuh; fee protocol dan leader sama-sama nol.

Tes: `test_audit_depositErasesUnchargedProfit`.

Perbaikan yang diperlukan: accounting share/NAV atau pengelolaan high-water mark yang membedakan arus modal dari profit; tambah pengujian fee positif, deposit, partial withdraw, loss recovery, dan pembukaan ulang vault.

### SC-05 — Pembacaan kill switch dapat melaporkan false saat trading sebenarnya dibekukan — sedang

`setKillSwitch(true)` bisa dipanggil sebelum konfigurasi risk pertama. `getRiskConfig` mengembalikan `false` untuk kill switch jika `initialized` belum true, sementara `validateTrade` menggunakan nilai tersimpan dan memblokir trade.

Tes: `test_audit_killSwitchReadIsFalseBeforeRiskConfig`.

Perbaikan: kembalikan status kill switch yang tersimpan sekalipun parameter lainnya memakai default.

### SC-06 — Risk metrics belum sesuai label produk — tinggi, review source

- `dailyLoss += amountIn` menghitung volume pengeluaran, bukan kerugian. Trade tanpa kerugian pun menghabiskan batas daily loss.
- Batas posisi membandingkan `currentPosition` dalam unit token output dengan `amountIn`/saldo USDC. Token dengan harga atau decimals berbeda menghasilkan perbandingan yang tidak setara.
- `vaultBalance` bukan NAV portofolio; unrealized PnL dan nilai token non-USDC tidak dihitung.
- Admin dapat mengganti atau mengosongkan RiskGuard. Pernyataan bahwa pembatas risiko tidak bisa dilewati perlu mencerminkan hak admin ini.

Temuan ini berdasarkan source; selain skenario pada lima tes di atas, belum dilakukan fuzz/invariant campaign atau review oracle/DEX aktual.

## Integrasi frontend dan deploy

### INT-01 — ABI frontend tidak cocok dengan hasil kompilasi Solidity — blocker

`src/lib/generated/abis.ts` tidak merepresentasikan kontrak saat ini. Perbandingan terhadap `contracts/out` menemukan:

| Kontrak | Fungsi frontend yang tidak ada pada kontrak saat ini |
|---|---|
| CopyVault | `pause`, `unpause`, `getVaultBalance`, `claimFees`, `token`, `vaultCount` |
| RiskGuard | `setRiskParams`, `setTokenWhitelist(address[],bool)`, `killSwitch`, `unkill`, `getRiskParams`, `isKilled` |
| Leaderboard | `registerLeader`, `getTopLeaders`, `leaderCount` |

Output `getVault` dan `getLeaderStats` juga berbeda. `useVault` mengharapkan object struct yang tidak sama dengan multi-output kontrak. Nama field seperti `isPaused`, `leaderCount`, `addr`, dan `totalPnlBps` tidak cocok dengan hasil sebenarnya. Mengganti nama fungsi saja tidak cukup.

`scripts/sync-abi.mjs` masih mencari artifact `PyrisPact` yang sudah dihapus dan hanya menerima deployment JSON dengan field `pyrisPact`. Script tersebut akan gagal atau mengabaikan hasil `DeploySiro`. Jangan menjalankannya dengan asumsi sudah sesuai migrasi.

### INT-02 — Alur pembuatan vault pertama tidak tersambung — blocker

UI dashboard memanggil `deposit`; kontrak mewajibkan vault sudah ada. Tidak ditemukan pemanggilan `createVault` pada frontend aplikasi. Pengguna baru perlu memilih leader terdaftar, approve USDC, lalu `createVault` sebelum dapat deposit tambahan.

### INT-03 — Deployment dan environment belum siap — blocker

- Alamat USDC, CopyVault, RiskGuard, dan Leaderboard pada generated deployment 99801 masih zero address; belum ada bukti deployment Siro testnet yang dapat diverifikasi dari checkout ini.
- `.env.example` masih menjelaskan Arc/Robinhood, default chain 5042, serta domain lama. Registry aplikasi sekarang berisi 99801/99901/31337.
- `deploy:local` menunjuk `DeployPact.s.sol`, sementara script sekarang `DeploySiro.s.sol`.
- `deploy:robinhood` masih mencoba deploy `PyrisPact` pada jaringan lain; bukan jalur deploy Siro Elysium testnet.
- `DeploySiro` memakai private key Anvil publik sebagai fallback, termasuk di jaringan nonlokal, dan membolehkan alamat USDC kosong sehingga masuk native mode. Untuk nonlokal, wajib fail jika key/token belum ditentukan; jangan memakai fallback tersebut.
- Deploy script belum mengonfigurasi router/selector swap, mendaftarkan leader, atau memberi keeper izin updater leaderboard. Tidak ada service keeper/indexer yang diimplementasikan dalam checkout ini.
- `chains.ts` dapat mengubah mode menjadi native ketika deployment ada tetapi USDC kosong. Akibatnya pembacaan native HYPE dapat diformat sebagai USDC 6 decimals. Konfigurasi yang belum lengkap harus menghasilkan status unavailable.
- `chain.serverRpc` tidak memakai override `NEXT_PUBLIC_RPC_URL_*`; jika relay digunakan, override browser tidak memperbaiki upstream relay.

Alamat RPC, chain ID yang benar, token decimals, gas token, dan explorer perlu dicocokkan dengan jaringan target dan diuji read-only sebelum broadcast. Pemeriksaan ini belum memvalidasi endpoint eksternal atau bytecode kontrak testnet.

## Wallet dan halaman aplikasi

| Area | Kondisi saat ini |
|---|---|
| `/launch` | Deteksi injected provider dan simulasi connect/disconnect berhasil. Tidak ada email login/Privy/WalletConnect. |
| Wallet identity | Connect meminta alamat wallet; bukan signed authentication/session backend. Dapp publik dapat bekerja demikian, tetapi fitur akun privat memerlukan autentikasi tersendiri. |
| Dashboard `/app` | Hook kontrak ada tetapi terhalang ABI, deployment, dan create-vault flow. Status default menampilkan Active/copying meskipun tidak ada vault. Sample trades statis. |
| Portfolio | Holdings, nilai portofolio, dan riwayat transaksi hardcoded; bukan saldo wallet terhubung. |
| My Strategies | Daftar hardcoded termasuk status Live; belum ada penyimpanan atau eksekusi strategi. |
| Studio | Input UI berfungsi; Run Backtest belum memiliki handler/engine. |
| Agent | Jawaban dan proposal tetap untuk setiap prompt; tidak ada engine AI/keeper dalam alur ini. Label Online belum membuktikan service tersedia. |
| Approvals | Approve dan Reject sama-sama menghapus kartu lokal; tidak ada transaksi atau persetujuan yang tersimpan. Diverifikasi lewat browser: 3 proposal menjadi 2. |
| Policies | Save hanya `setSaved(true)` dan menampilkan Saved successfully. Tidak menulis risk config onchain atau persistensi backend. |
| Schedules | Per 2026-11-13: hanya schedule yang di-link ke job engine terdaftar yang bisa di-enable, dan hanya oleh pemilik vault on-chain. Worker `services/scheduler/worker.mjs` menjalankan runner tervalidasi per tick. Konfigurasi rebalance alokasi tetap tidak otomatis. |
| Token | Per 2026-11-13: tidak ada angka saldo, stake, atau imbal hasil tertanam. Halaman menyatakan kontrak staking belum dikonfigurasi. Tidak ada kontrak token SIRO (lihat `docs/token.md`). |
| Settings | Wallet, API key, dan tanggal contoh; notifikasi hanya state lokal. Generate Key/Copy/Disconnect di daftar belum memiliki handler. Tombol Disconnect header menggunakan wagmi dan bekerja pada simulasi. |
| Onboarding | Menyebut Privy meski SDK/integrasinya tidak tersedia; hanya tur langkah, bukan create-vault onboarding. |
| Markets/strategies/statistics | Menggunakan data mock; perlu label demo, terutama nilai finansial dan status Live. |
| Status/changelog | Uptime dan operational hardcoded; changelog mengklaim kontrak sudah deployed dan Privy tersedia tanpa bukti pada implementasi ini. |
| Brand | Dua logo 404; referensi asset lama perlu diganti ke mark yang tersedia. |

## Urutan menuju testnet

1. Perbaiki isolasi aset, calldata/recipient/slippage, exit oleh pemilik, fee, dan risk accounting. Lima tes reproduksi harus diganti menjadi assertion yang menolak perilaku tersebut setelah kontrak diperbaiki.
2. Tambah invariant solvency dan isolasi multi-user, test adversarial router, perbedaan decimals, withdrawal saat posisi terbuka, serta fee dan risk lifecycle.
3. Sinkronkan ABI dari artifact aktual, deployment records, hooks, field mapping, dan onboarding `createVault`. Konfigurasi yang kosong harus gagal secara jelas.
4. Perbarui environment dan script deploy khusus jaringan testnet yang terverifikasi; gunakan token uji dan wallet deployment khusus. Konfigurasi wiring, leader, router, selector, dan keeper secara eksplisit.
5. Hubungkan fitur yang akan diluncurkan; sisanya beri label Demo/Coming Soon dan hilangkan indikator keberhasilan palsu.
6. Lakukan transaksi testnet dengan wallet nyata: create vault, deposit, withdraw, pause/resume, kill switch, whitelist, swap yang sah, swap yang ditolak, pergantian akun/jaringan, reject di wallet, serta refresh setelah receipt. Baru nilai ulang kesiapan publik.

## Bukti dan pengulangan

- Tes tambahan: `contracts/test/ReadinessAudit.t.sol`.
- Hasil Foundry: `.preview/testnet-contract-results.txt`.
- Browser: `.preview/testnet-browser-results.json`, `.preview/testnet-extra-results.json`.
- Perbandingan ABI: `.preview/abi-readiness.json`.
- Screenshot: `.preview/audit-no-wallet.png`, `.preview/audit-connected.png`.

```powershell
npm run build
npm run lint
& "$env:USERPROFILE/.foundry/bin/forge.exe" test --root contracts -vv
& "$env:USERPROFILE/.foundry/bin/forge.exe" test --root contracts --match-path test/ReadinessAudit.t.sol -vv
```

Foundry tersedia di `.foundry/bin` tetapi belum ada di PATH shell ini. Warning penulisan cache signature di home berasal dari batas sandbox; kompilasi dan eksekusi tes selesai. Tidak ada transaksi, deploy, penggunaan private key, atau perubahan kontrak produksi dalam audit ini. Ini adalah review source dan pengujian lokal terarah, bukan sertifikasi keamanan atau audit independen menyeluruh.
