# docs/swap-brief.md — SIRO Swap + Zap

Sumber kebenaran untuk halaman swap/zap. Kalau repo bertentangan dengan dokumen ini,
laporkan dulu, jangan sesuaikan sendiri diam-diam.

## Konteks

SIRO adalah produk vault di Robinhood Chain (Arbitrum Orbit L2, chainId 4663, gas ETH).
Vault dibuat per-agent lewat GuardedVaultFactory dan menerima satu aset deposit yang
dikunci factory (saat ini USDG). Swap adalah fitur sekunder: satu-satunya tugasnya
meng-zap token apa pun menjadi aset vault lalu mendepositkannya.

Ikuti versi terpasang di repo: Next 16.4.3, wagmi 3.7, Tailwind v4. Baca dokumentasi
framework di node_modules/next/dist/docs/ sebelum menulis kode Next. Kode di bawah src/.

## Alamat — semua di src/lib/config/swap.ts, tidak ada di tempat lain

```
SwapRouter02:        0xcaf681a66d020601342297493863e78c959e5cb2
QuoterV2:            0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7
V3Factory:           0x1f7d7550b1b028f7571e69a784071f0205fd2efa
Permit2:             0x000000000022D473030F116dDEE9F6B43aC78BA3
WETH9:               0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73
USDG:                0x5fc5360d0400a0fd4f2af552add042d716f1d168
Chainlink ETH/USD:   0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9
GuardedVaultFactory: dari config repo
SIRO_ZAP:            env NEXT_PUBLIC_SIRO_ZAP
```

Assert checksum dan non-zero saat startup. Pakai chains.ts yang ada untuk 4663 dan RPC
relay /api/rpc/4663, jangan buat config chain kedua.

Kontrak memakai SwapRouter02, bukan UniversalRouter. UniversalRouter di-redeploy
2026-07-06 sehingga alamat di docs lama basi — kalau entri di config tidak cocok dengan
deployments.json resmi, hapus saja.

Jangan sentuh UniswapV3Adapter di 0x8E66…fdd2. Itu jalur executor internal vault, tidak
menegakkan kebijakan dan tidak memungut fee, jadi dua jalur ini tidak bentrok. Dokumentasikan
keduanya di README supaya jelas mana yang kanonik.

## Kontrak

`swapAndDeposit(vault, tokenIn, amountIn, poolFee, minOut, minSharesOut, deadline, receiver)`

tokenOut tidak pernah jadi parameter — diturunkan dari vault.asset(). Vault divalidasi
lewat factory.isVault().

## Tier fee

Pool WETH/USDG: 0.01% `0x52e6…71Ca`, 0.05% `0x69Bf…8d9a`, 0.3% `0xa918…0334`,
1% `0x5f00…680D`.

Tier dipilih dari output terbaik. **Tier 1% di-exclude permanen** (terukur −2,54% dari
Chainlink); kalau suatu saat ia menang, cukup di-log. poolFee tidak dipilih user.

## Token

src/lib/config/tokens.ts, daftar terkurasi. WETH dan ETH native enabled. Sisanya disabled
dengan tooltip "pool not ready". tokenOut read-only, diturunkan dari vault.asset().

## Dependency

Radix hanya tiga: @radix-ui/react-dialog, @radix-ui/react-popover, @radix-ui/react-tooltip.
Tanpa shadcn CLI. Styling sendiri dengan Tailwind.

DevDependency: vitest, playwright, msw. Transport viem wajib fetch-based http(), bukan
websocket, atau intersepsi MSW tidak kena. Buktikan intersepsi dengan satu test sekali pakai
sebelum menulis spek apa pun.

## Lib

- minOut.ts — floor, tidak pernah dibulatkan ke atas.
- priceImpact.ts — spot dari slot0 via TickMath, bandingkan dengan rate terkutip. Ambang:
  <0,5 netral, 0,5–2 muted, 2–5 banner oranye, >5 banner merah + ConfirmHighImpactDialog,
  >15 blokir submit dengan jalan keluar.
- format.ts — angka tabular, pemotongan alamat, presisi USDG/WETH.
- errors.ts — decode revert router DAN vault. StaleOracle dari _requireFreshHoldings punya
  copy sendiri: "Harga oracle vault sedang tidak segar. Coba lagi sebentar." dengan retry
  yang memicu quote ulang.

Unit test Vitest untuk minOut, priceImpact, format, termasuk tepi pembulatan dan slippage 0.

## Hook

useQuote (debounce 300ms, AbortController, semua tier, output terbaik), useTokenBalance,
useAllowance, useSwapExecution, useSlippageSettings (localStorage).

Quote butuh amount > 0 dan kedua token terisi. Wajib quote ulang setelah error StaleOracle —
jangan biarkan user menekan tombol yang sama dengan angka basi.

## Halaman & komponen

src/app/app/swap/page.tsx menerima ?vault=0x… divalidasi factory.isVault(). Hanya ada satu
vault, jadi fallback ke vault itu alih-alih memaksa vault picker.

src/components/swap/: SwapCard, TokenInput, TokenSelector, FlipButton, QuoteDetails,
RouteDisplay, SettingsPopover, PriceImpactBanner, GasWarning, ConfirmHighImpactDialog,
SwapButton, TxStatusSheet.

Kartu: tengah, maks 480px, rounded-3xl, border 1px, inner highlight, shadow lembut, padding
lega. Mobile full-bleed, rounded-none, safe-area. Urutan: header (judul, gear, badge
slippage), blok bayar (input besar tabular-nums, pill token, saldo + Max), tombol flip bulat
di seam berputar 180° 200ms, blok terima (read-only, skeleton shimmer saat quoting, tidak
pernah basi), QuoteDetails terlipat jadi satu baris rate dan mengembang jadi rate / impact /
minimum diterima / network fee / chip route / cincin refresh 10 detik, banner impact,
GasWarning, tombol full-width 56px rounded-2xl, sheet.

TokenSelector: modal gaya command palette, pencarian fuzzy, logo + simbol + nama + saldo,
Recent di atas, baris disabled abu-abu dengan tooltip. Focus trap, ESC, tombol panah.

Settings: preset slippage 0,1 / 0,3 / 0,5% dan custom, default 0,3%. Deadline 30s / 2m / 10m
dan custom. Peringatkan, jangan blokir, di atas 2% atau 30 menit.

ETH native: Max = saldo dikurangi buffer gas, value diisi persis amountIn.

## Token desain

CSS var, dark-first dengan dukungan light. --bg #0A0B0D, --surface #121418,
--surface-hover #181B21, --border #23262E, --text #F2F4F7, --text-muted #8B93A1,
--accent #4C6FFF, --success #2ED47A, --warning #F5A524, --danger #EF4D5A. Inter untuk UI,
JetBrains Mono untuk angka. Radius 8/12/16/24/32. Motion 150ms mikro, 200ms layout,
cubic-bezier(0.2,0,0,1), hormati prefers-reduced-motion. Focus ring aksen 2px dengan offset.
Target sentuh >= 44px. Aksen SIRO, bukan pink Uniswap — disiplin sama, identitas beda.

## Status tombol, urutan ketat

Connect → Wrong network (CTA switch) → Enter amount → Insufficient balance → Approve →
Preparing → Swap. ETH nol memunculkan peringatan gas terpisah di atas tombol. Approval
adalah tx sendiri dengan spinner sendiri dan label "Approving…", lalu polling allowance dan
maju otomatis.

Setiap submit lewat simulateContract lebih dulu. StaleOracle tampil inline dengan retry,
input tetap utuh.

## Edge case

Wallet terputus, chain salah, tanda tangan ditolak, ganti akun di tengah alur, quote nol,
RPC timeout, desimal 0 atau >18, input max-uint, price impact melonjak antara quote dan
submit (quote ulang dan peringatkan, jangan eksekusi diam-diam).

## Aksesibilitas

Label di setiap input, aria-live polite di panel quote, aria-busy saat quoting, jalur
keyboard penuh, nama token ramah screen reader, impact tidak hanya ditandai warna.

## E2E

Playwright, dua alur saja: happy path connect → quote → approve → swap, dan no-route plus
insufficient balance. Jangan sebar Playwright ke semua state.

## Label mode paper

Trading live tertahan walk-forward validation, jangan diakali. Paper memakai harga dan biaya
asli.

- Badge di header Evidence, bukan catatan kaki. Setiap angka PnL paper membawa penanda yang
  bertahan kalau di-screenshot.
- Tidak ada elemen UI yang boleh terbaca sebagai live: tanpa "connected", tanpa "trading
  aktif", tanpa titik hijau yang menyiratkan eksekusi nyata.
- Halaman swap menyebut mode yang berjalan, supaya jelas swap-nya nyata sementara strateginya
  belum.
- Badge paper hilang di satu tempat saja = bug, bukan kosmetik.

## Definition of done

Tidak ada alamat atau angka ajaib di luar src/lib/config. Zero any, strict TS lulus. Semua
status tombol tercapai, tanpa jalan buntu. Lighthouse a11y >= 95 di route swap. State
loading, kosong, error, sukses semuanya didesain. Jalan di 360, 768, 1440. Foundry dan
Vitest hijau. README memuat setup env, cara menambah token, cara deploy zap, dan dua jalur
swap.

## Non-goals

Tanpa limit order, cross-chain, lebih dari 2 hop, UniswapX, API aggregator, redesain modal
wallet, fork AMM, hook v4, vault picker. Tanpa deploy mainnet tanpa izin eksplisit.
