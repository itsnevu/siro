---
status: TESTING
last_reviewed: 2026-11-14
---

# GuardedVault: persiapan deploy (13 November 2026)

Belum ada deploy testnet/mainnet dalam pekerjaan ini. Deployment ke Anvil lokal telah diuji, termasuk verifikasi receipt, bytecode, dan wiring factory/registry. Alamat Anvil sementara tidak dipakai sebagai deployment jaringan publik.

## Environment

`contracts/.env` tetap privat dan tidak perlu dicetak atau dimasukkan ke git. Penghapusan `.env.example` yang sudah ada sebelum pekerjaan ini tidak dibatalkan. Gunakan contoh berikut untuk konfigurasi baru; isi alamat dari jaringan target yang benar.

```dotenv
# contracts/.env atau environment shell
RPC_URL=https://YOUR_VERIFIED_TESTNET_RPC
PRIVATE_KEY=YOUR_DEDICATED_DEPLOYER_PRIVATE_KEY
USDG_ADDRESS=0xYOUR_TESTNET_USDG
USDG_USD_FEED=0xYOUR_TESTNET_USDG_USD_FEED
```

`USDG_ADDRESS` wajib memiliki 6 decimals. Token dan feed harus memiliki bytecode; harga harus positif, tidak berada di masa depan, dan diperbarui dalam 24 jam. Tidak ada fallback token/native di jaringan publik. Key default Anvil ditolak di jaringan publik. Mainnet juga membutuhkan `ALLOW_MAINNET_DEPLOY=true`.

```dotenv
# .env.local, lalu restart/rebuild frontend
NEXT_PUBLIC_CHAINS=46630
NEXT_PUBLIC_DEFAULT_CHAIN_ID=46630
NEXT_PUBLIC_RPC_URL_46630=https://YOUR_VERIFIED_TESTNET_RPC
NEXT_PUBLIC_EXPLORER_URL_46630=https://YOUR_VERIFIED_TESTNET_EXPLORER
```

Chain 46630 hanya dapat diaktifkan dengan RPC eksplisit. Tidak ada alamat router/pool/feed testnet yang ditebak. Override RPC juga dipakai upstream relay server.

## Perintah

Foundry harus terpasang. Runner mencari executable di `~/.foundry/bin`, PATH, atau `FORGE_BIN`. Perintah dapat dipakai dari PowerShell tanpa sintaks environment POSIX.

```powershell
npm run contracts:build
npm run deploy:testnet
# Perintah di atas hanya simulasi. Setelah konfigurasi dan dana siap:
npm run deploy:testnet -- --broadcast
```

Runner memeriksa chain ID sebelum menjalankan script. Script men-deploy `ChainlinkOracle`, `AgentRegistry`, dan `GuardedVaultFactory`, lalu menetapkan factory pada registry. Belum membuat agent atau memberi izin trading.

Simulasi tidak menghasilkan deployment frontend. Saat broadcast, script menulis kandidat `contracts/deployments/<chainId>.pending.json`; runner memeriksa receipt, bytecode dan wiring sebelum mempromosikannya menjadi `<chainId>.json` dan menjalankan ABI sync. File `.pending.json` diabaikan ABI sync. Jika broadcast atau verifikasi gagal, periksa receipt sebelum mencoba kembali agar tidak melakukan deploy ganda. Record kandidat dapat dipakai untuk investigasi; jangan mempromosikannya tanpa verifikasi.

Untuk lokal, jalankan Anvil chain 31337, lalu `npm run deploy:local -- --broadcast`. Token USDG mock akan dibuat dan 100.000 token dikirim ke deployer. Oracle lokal tidak diberi feed, sehingga hanya alur USDG tanpa trading yang siap diuji. Aktifkan chain 31337 melalui `NEXT_PUBLIC_CHAINS` dan gunakan RPC lokal yang sama untuk frontend dan runner.

## Alur frontend

1. Hubungkan injected wallet dan pilih jaringan yang sesuai.
2. Dashboard: create agent. Vault baru dimiliki pembuatnya, dengan timelock policy 1 hari dan tanpa izin trading.
3. Pilih vault. Daftar membaca 100 agent terbaru langsung dari registry, tanpa indexer.
4. Approve USDG ke vault tersebut, tunggu receipt, lalu deposit. UI memeriksa membership factory dan asset sebelum approval.
5. Withdraw USDG ketika likuiditas tersedia, atau redeem semua share in kind untuk menerima bagian proporsional seluruh aset. In-kind redemption tidak memerlukan oracle dan tetap tersedia saat trading dipause.
6. Pemilik dapat queue policy dan mengaktifkannya setelah timelock, serta pause/unpause trading. Tombol sukses hanya muncul setelah receipt berhasil.

UI tidak menampilkan PnL atau trade history palsu pada dashboard. Halaman portfolio, strategi, Studio, Agent, approvals, token, buyback dan statistik yang belum tersambung diberi label Demo. Tombol backtest dinonaktifkan; respons Agent dijelaskan sebagai contoh tetap. Settings menampilkan wallet aktual; layanan akun lain belum tersedia.

## Masih menghalangi trading

- Keputusan V3/V4 dan bukti router/pool/liquidity pada jaringan target; adapter DEX belum diimplementasikan.
- Feed setiap token, router, token dan executor permissions harus dikonfigurasi. Perubahan izin GuardedVault memakai queue/activate dengan timelock; belum ada UI pengelolaan permissions.
- Keeper, indexer dan pemantauan uptime belum terhubung.
- Audit independen dan transaksi end-to-end dengan extension wallet sungguhan belum dilakukan.

Review internal dan tes lokal bukan audit independen. Dana gas saja belum membuat trading siap; adapter dan konfigurasi di atas tetap diperlukan.

## Hasil verifikasi

- `npm run build`: lolos, 59 halaman statis diproses. Referensi artikel blog yang belum tersedia kini tidak menghasilkan route artikel atau menggagalkan build.
- `npx tsc --noEmit`: lolos. Proyek terpisah `vaulta` dan `siro-video` dikecualikan dari pemeriksaan aplikasi utama.
- `npm run lint`: tanpa error; satu warning `<img>` yang sudah ada pada halaman launch.
- `forge test --root contracts --no-match-path 'test/fork/*'`: 99 tes lokal lolos. Termasuk pengujian guard deploy dan create/deposit/withdraw/redeem saat pause. Sebagian tes legacy memang mereproduksi kelemahan CopyVault lama; kelulusan suite bukan sertifikasi keamanan.
- Dry run dan broadcast Anvil chain 31337: lolos, termasuk promosi deployment oleh runner dan ABI sync. Record lokal sementara telah dibersihkan dan node pengujian dihentikan.
- Dua suite fork belum dijalankan sampai berhasil karena `RH_RPC_URL` tidak tersedia. Browser dan extension wallet sungguhan belum diuji dalam pekerjaan ini.
