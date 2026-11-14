---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 3 — commit–reveal dan anchor

Kode: `crates/ledger`, `crates/api`, `contracts/src/Anchor.sol`, `services/anchor`,
`/verify`, dan `src/lib/decision-proof.ts`. Journal JSONL v1 baru, tanpa mengubah
record historis. Koreksi menggunakan `supersedes`. JCS RFC 8785 dan SHA-256 identik
di Rust serta browser; ordered Merkle memakai SHA-256 bytes, bukan keccak.

Verifikasi: tes ledger tamper/torn write/recovery/idempotensi, proof semua leaf pada
tree ukuran 1–17, tes Anchor append-only, serta tes hash browser. API nyata diuji oleh
`scripts/test-trading-integration.mjs`. Tidak ada deployment atau tx anchor yang dipalsukan.

Batasan: polling WebSocket 250ms; public publication tidak dibuktikan oleh timestamp
lokal. Root belum di-anchor sampai worker mendapat receipt chain sebenarnya. Operasi
dan konfigurasi ada di [TRADING_ENGINE.md](TRADING_ENGINE.md).
