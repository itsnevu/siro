---
status: TESTING
last_reviewed: 2026-11-13
---

# Arsitektur

## Proses

```
                         ┌──────────────── batas kepercayaan: operator ────────────────┐
 data vendor  ──ingest──▶│ tickstore (Parquet, create-only)                            │
 (OHLCV, depth,          │      │                                                      │
  funding, gas)          │      ▼                                                      │
                         │ features ──▶ engine (logistic + rule) ──▶ Decision          │
 LLM API ◀──── advisory ─┤                          │   (timeout 4s, fallback)          │
 (tidak tepercaya)       │                          ▼                                   │
                         │ riskengine (proses terpisah) ──HMAC permit, TTL ≤5s──┐       │
                         │                          │                            ▼       │
                         │ ledger (journal append-only, JCS+SHA-256, prev_hash)  exec   │
                         │      │                                                │      │
                         │      ├──▶ api (REST read-only, WebSocket commit/reveal)│      │
                         │      ├──▶ witness worker ──batch root tiap ±10 s──┐   │      │
                         │      └──▶ anchor worker ──daily root──┐           │   │      │
                         └───────────────────────────────────────┼───────────────┼──────┘
                                                                 ▼               ▼
                                                     kontrak Anchor     SessionExecutor → router DEX
                                                     (onchain, publik)  (onchain, dana milik user)
```

## Alur satu tick

1. Bar jam ditutup. Fitur dihitung hanya dari bar dengan `close_ts ≤ tick`.
2. Engine menghasilkan probabilitas naik dan bobot target. Advisory LLM, kalau aktif, hanya
   menambah teks `rationale_text`. Ia tidak mengubah order (lihat RT-02).
3. Risk engine mengevaluasi request dan mengembalikan permit bertanda tangan, dengan
   veto dan penyesuaian (lihat [risk.md](risk.md)).
4. Decision di-seal: `commit_hash = sha256(JCS(decision tanpa commit_hash))`, ditautkan ke
   `prev_hash`, lalu ditulis ke journal dengan fsync. Hanya hash yang dipublikasikan.
5. Setelah `reveal_ts`, isi decision tampil di API dan WebSocket.
6. Eksekutor memeriksa permit, lalu mengirim order lewat `SessionExecutor` milik user.
7. Root per jam dan per hari dihitung. Worker anchor mengirim root harian ke kontrak
   `Anchor` dan menunggu minimal 2 konfirmasi.

## Batas kepercayaan

| Komponen | Siapa yang harus dipercaya | Bisa diperiksa orang luar? |
| --- | --- | --- |
| Data vendor | vendor + operator | tidak, sampai fase 9 (pembanding Chainlink) |
| Engine, fitur | operator | sebagian: hash strategi di-lock di chain per jendela OOS |
| Advisory LLM | penyedia LLM | tidak; dianggap input tidak tepercaya |
| Risk engine | operator (kunci HMAC) | veto tercatat di decision, bisa diaudit sesudahnya |
| Ledger dan root jam | operator | ya, setelah witness batch (ADR 0005); keputusan tanpa witness tampil `proven: false` |
| Scheduler | operator + pemilik vault | job jalan hanya jika pemilik vault on-chain mengaktifkannya |
| Root harian | kontrak `Anchor` + kunci owner | ya, siapa pun dengan RPC |
| Dana | kontrak `SessionExecutor` + user | ya; cap, expiry, dan revoke dikontrol user |

Bagian paling lemah: **jendela antara tick dan witness**, paling lama `max_lag` (default 300
detik). Di dalam jendela itu, operator adalah satu-satunya saksi. Sebelum witness di-deploy,
jendela ini sama dengan jendela anchor harian. Lihat [limitations.md](limitations.md) butir 5–7.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menunjuk setiap kotak di diagram yang hanya bisa dipercaya, bukan diperiksa:
data vendor, engine, root per jam, dan kunci anchor. Klaim "trustless" untuk Siro secara
keseluruhan bisa dibantah dengan tabel di atas.
