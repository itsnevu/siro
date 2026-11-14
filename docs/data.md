---
status: TESTING
last_reviewed: 2026-11-13
source_of_truth: services/ingest/, services/universe/, config/universe/official-tokens.json
---

# Data pasar (fase 9–10)

Semua data harga berasal dari sumber yang bisa diperiksa ulang. Tidak ada angka yang ditulis tangan.
Setiap respons mentah disimpan **sebelum** diparsing di `<out>/raw/`, sekali tulis, dan tidak
pernah ditimpa. Ulangi parsing dari raw kapan saja untuk memeriksa angka kami.

## Sumber

| Peran | Sumber | Dipakai untuk |
| --- | --- | --- |
| Primer | Pool Uniswap v3 USDG di Robinhood Chain (factory resmi `0x1f7d…2efa`) | OHLC, volume, depth, harga eksekusi |
| Pembanding wajib | Feed Chainlink saham di Robinhood Chain, dibaca **pada blok yang sama** | status `disputed` |
| Sekunder | Yahoo Finance, bar 1 jam (hanya jam bursa) | diagnosis, benchmark SPY/QQQ, rezim |

## Cara angka dibuat

- **OHLC per jam.** Open dan close adalah `slot0` pool pada blok pertama di batas jam. High dan low
  mencakup harga setiap event `Swap` di jam itu. Volume adalah jumlah USDG yang diperdagangkan.
- **Depth.** USDG yang dibutuhkan untuk menaikkan harga sebesar ambang 2%, memakai likuiditas aktif di tick saat
  itu. Aproksimasi ini mengabaikan perubahan likuiditas antar-tick.
- **Gas.** `baseFee` blok × 250.000 gas × harga ETH dari pool WETH/USDG. Priority fee dianggap 0.
- **Spread ratio.** Median depth 48 jam dibagi depth saat ini. Ini proksi, bukan spread order book.
- **Rezim.** Aturan tetap dari close harian SPY sebelum tick (`services/ingest/core.mjs`).
- **Funding dan borrow** bernilai 0, karena posisi spot tanpa leverage. Ini fakta, bukan asumsi.

## Flag validasi

| Flag | Kondisi | Efek |
| --- | --- | --- |
| `disputed` | selisih close pool vs Chainlink di atas ambang 1% (Chainlink masih segar; bukan angka return net/bruto) | entry diveto; pengurangan posisi tetap boleh |
| `stale_ticks` | jumlah jam berturut-turut tanpa swap | entry diveto jika di atas ambang 2 |
| `filled` | tidak ada swap di jam itu; harga adalah state pool yang terbawa | ditampilkan di data, tidak disembunyikan |

## Kuorum RPC

Pembacaan state lampau (`eth_call` archive) harus disepakati **2 endpoint archive**. Pembacaan
header disepakati 2 endpoint. Hasil dikembalikan begitu kuorum tercapai. Endpoint yang menjawab
berbeda dicatat sebagai `dissent`. Kalau semua RPC mati, tidak ada data yang ditulis dan runner
tidak membuat keputusan (test chaos di `tests/rpc-quorum.test.mjs`).

Batas yang diketahui per 2026-11-13:

- Hanya satu endpoint publik (Pinax) yang melayani `eth_getLogs` dalam rentang besar, dan itu
  dengan rate limit free tier. Jadi high, low, dan volume **tidak** dicek kuorum.
- Alchemy free tier membatasi `eth_getLogs` ke 10 blok per request.

## Universe (fase 10)

- **Token yang dipercaya hanya** yang ada di `config/universe/official-tokens.json`, berdasarkan
  alamat. Simbol tidak dipercaya, karena siapa pun bisa membuat token bernama "NVDA". Simbol
  on-chain dicek ulang terhadap allowlist.
- **Versi universe** disimpan sekali tulis di `data/universe/`, dengan hash aturan dan anggota.
- **Waktu berlaku.** Sebuah versi tidak boleh berlaku sebelum data yang memilihnya diamati. Versi
  pertama berlaku mulai 2026-11-13 13:00 UTC, jadi **semua backtest sebelum tanggal itu berstatus
  `hand-picked`**.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa mengambil blok di `provenance.jsonl`, membaca `slot0` pool dan Chainlink di blok itu
lewat RPC mana pun, lalu membandingkannya dengan angka kami. Selisih apa pun membuktikan
pipeline salah. Pembaca juga bisa menolak high, low, dan volume kami sebagai data satu sumber,
dan menolak backtest sebelum 2026-11-13 sebagai pilihan aset yang tidak otomatis.
