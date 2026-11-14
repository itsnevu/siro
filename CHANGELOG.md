# Changelog

Per versi: hash commit, ringkasan perubahan, dan **perubahan metrik**. Perubahan metrik
mencakup formula, label, atau data yang mengubah angka publik. Setiap perubahan metrik
juga dicatat di [docs/honesty-log.md](docs/honesty-log.md).

## Unreleased (branch `feat/phase-0-harness`, belum di-commit)

- **Deploy mainnet 2026-11-14 (Robinhood Chain, 4663):** `Anchor` `0xbf9f13791c1c5bcd6e342fb500c711e574fb04e0`,
  `SessionExecutor` `0x3933768da40ead71fcf1104e45483d13112287e8`, owner `0xB4c47187dc00fA2991460FE57F9dBB0521AFa9a4`.
  Belum diaudit pihak ketiga. Rincian di `contracts/deployments/4663-evidence.json`.

- Engine Rust (tickstore, features, costmodel, metrics, ledger, riskengine, engine, exec,
  replay, api), kontrak `Anchor` dan `SessionExecutor`, service advisory dan anchor.
- Dokumentasi skeptis: `docs/metrics.md`, `docs/falsification.md`, `docs/limitations.md`,
  runbook, ADR, linter dokumentasi `scripts/docs-lint.ts`, dan test formula `tests/metrics/`.
- Witness on-chain per batch commit: `Anchor.witness`/`verifyWitness`, `services/anchor/witness.mjs`,
  dan putusan `publication` di `/verify` serta di verifier browser (ADR 0005).
- Pemulihan live otomatis: `services/execution/resolve.mjs`, event `execution_resolution`,
  dan exit code 3 "pasti tidak tereksekusi" yang membuat runner membatalkan order, bukan halt.
- Scheduler engine: `services/scheduler/`, `/api/scheduler`, dan aktivasi schedule yang terikat
  ke job engine dan pemilik vault on-chain.
- Portofolio lintas aset: `replay portfolio`, `PortfolioConfig`, telemetry korelasi/sektor, dan
  token/oracle per aset di bridge live.
- Fase 9, data nyata: `services/ingest/` membaca pool Uniswap v3 USDG di Robinhood Chain (primer),
  Chainlink pada blok yang sama (pembanding), dan Yahoo (sekunder), lewat RPC berkuorum dengan
  raw store sekali tulis. Flag `disputed`, `stale_ticks`, dan `filled` sampai ke runner. Data
  `disputed` memveto entry.
- Fase 10: universe versi immutable dari allowlist token resmi (`config/universe/`), dengan
  aturan likuiditas yang dipublikasikan, larangan back-dating, dan badge `hand-picked`.
- Fase 11: `late_tick` saat jendela commit terlewat; pemeriksaan drift jam via SNTP.
- Fase 12: skema Postgres (partisi bulanan, append-only lewat REVOKE dan trigger, event store),
  migrasi up/down, dan script verifikasi lewat `DATABASE_URL` (tanpa Docker). Belum dijalankan ke database sungguhan.
- Fase 13: `SessionExecutor.revokeAll()` dan tombolnya di UI; peran viewer/operator/admin;
  satu wallet satu akun dengan penautan lewat signed message; API admin parameter risiko
  dengan audit append-only.
- Fase 14: trace id, log JSON tanpa PII, metrik, aturan alert, dan SLO.
- Fase 15: sanitasi input/output LLM dan clamp angka dari LLM.
- Fase 16: deteksi decay dan kill otomatis. Fase 17: rekonsiliasi harian dan filter papan.
  Job harian `services/ops/daily.mjs`.
- Fase 18: geo-gating di Proxy Next 16, disclaimer di setiap segmen berangka, onboarding default
  aman dalam dua bahasa, format angka per locale, dan stop loss per posisi di engine.
- **Perubahan metrik.** Bug turnover harian di runner diperbaiki (lihat honesty-log). Pada
  fixture uji, jumlah fill berubah dari 0 menjadi 31. Belum ada angka live, jadi tidak ada angka
  publik yang berubah.
  Ditemukan dua masalah label (RT-01 beta = korelasi, RT-02 advisory contribution),
  tercatat di honesty-log dan belum diperbaiki.

## Riwayat sebelum changelog ini

Belum ada versi rilis. Commit di `main`:

| Commit | Ringkasan | Perubahan metrik |
| --- | --- | --- |
| `3e7367b` | laptop dan wallet 3D, market live, konfigurasi mainnet, guarded vault | tidak diketahui; changelog belum ada |
| `6f8367a` | komponen mockup laptop, isi halaman token | tidak diketahui |
| `bbd6104` | visual hero 3D, halaman token, aset video | tidak diketahui |
| `6d4e52f` | smart contract | tidak diketahui |
| `aa3a65d` | platform agent terlindungi, redesain | tidak diketahui |
