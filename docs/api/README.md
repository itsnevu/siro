---
status: TESTING
last_reviewed: 2026-11-13
source_of_truth: crates/api/src/main.rs
---

# API

REST read-only plus WebSocket. Spesifikasi: [openapi.yaml](openapi.yaml).

**Status generator.** Spec ini **ditulis tangan** dari `crates/api/src/main.rs` pada
2026-11-13. Spesifikasi menuntut OpenAPI yang di-generate dari kode (mis. dengan `utoipa`).
Itu `PLANNED`. Sampai saat itu, spec bisa tertinggal dari kode. Kalau ada perbedaan, kode
yang benar.

Default bind: `127.0.0.1:4010` (`SIRO_API_BIND`). Belum ada host publik.

## Amplop respons

Setiap respons sukses:

```json
{ "prev_hash": "<hash event journal terakhir>", "verification_url": "/roots", "data": { } }
```

Error: HTTP 503 dengan `{ "error": "...", "prev_hash": "<genesis>", "verification_url": "/roots" }`.
API tidak pernah mengembalikan data parsial saat journal gagal divalidasi.

## Contoh curl

```bash
# Daftar agent dan laporan terakhirnya
curl -s http://127.0.0.1:4010/agents

# Keputusan, 100 per halaman; pakai data.next sebagai ?after=
curl -s "http://127.0.0.1:4010/decisions?after=0"

# Satu keputusan beserta proof Merkle dan anchor
curl -s http://127.0.0.1:4010/verify/<decision_id>

# Root jam dan root harian
curl -s http://127.0.0.1:4010/roots

# Stream commit lalu reveal (butuh websocat)
websocat ws://127.0.0.1:4010/ws
```

`/verify/{id}` juga mengembalikan `publication`: putusan publikasi tepat waktu dari witness
on-chain (`proven`, `reason`, `witnessed_at`, `lag_from_tick_ms`, `max_lag_ms`, `root`, `proof`,
`tx_hash`). `publication_proven` sama dengan `publication.proven`.

Sebelum `reveal_ts`, keputusan hanya tampil dengan `status: "committed"`, berisi
`commit_hash`, `commit_ts`, `reveal_ts`, `prev_hash`. Sesudahnya, `status: "revealed"`
dengan `record` lengkap.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa memanggil setiap endpoint dan membandingkan bentuk responsnya dengan
`openapi.yaml`. Perbedaan apa pun membuktikan spec ini sudah usang. Pembaca juga bisa
memeriksa bahwa keputusan berstatus `committed` tidak membocorkan isi apa pun selain hash.
