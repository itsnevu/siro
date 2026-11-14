---
status: LIVE
last_reviewed: 2026-11-13
---

# Architecture Decision Records

Satu file per keputusan besar. Format: konteks, opsi, pilihan, konsekuensi, tanggal.
ADR tidak pernah dihapus. Kalau keputusan berubah, tulis ADR baru dengan
`supersedes: NNNN`, dan ubah status ADR lama menjadi `superseded_by: MMMM`.

| No | Judul | Status |
| --- | --- | --- |
| [0001](0001-commit-reveal-jcs-sha256.md) | Commit–reveal dengan RFC 8785 + SHA-256 | diterima |
| [0002](0002-rust-causal-core.md) | Inti engine di Rust, proses risk terpisah | diterima |
| [0003](0003-daily-onchain-anchor.md) | Anchor onchain harian, bukan per jam | digantikan sebagian oleh 0005 |
| [0004](0004-llm-advisory-only.md) | LLM hanya advisory, tidak memutuskan order | diterima |
| [0005](0005-per-commit-chain-witness.md) | Witness on-chain per batch commit | diterima, TESTING |
| [0006](0006-tick-id-per-leg.md) | `tick_id` memasukkan hash strategi leg | diterima |

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa membandingkan setiap ADR dengan kode saat ini. ADR yang tidak lagi cocok
dengan kode tanpa ADR pengganti adalah keputusan yang diubah diam-diam.
