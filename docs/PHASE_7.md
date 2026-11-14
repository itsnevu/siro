---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 7 — session dan live

Kode: `SessionExecutor.sol`, `DeployEvidence.s.sol`, adapter `Live`, bridge
`services/execution/live.mjs`, dan kontrol session di halaman izin vault. Dana berada
di vault pengguna. Session punya scope vault/router/token, cap per trade/harian,
expiry, revoke, kill dan idempotency ID fill. Receipt aktual menjadi fill; tidak ada
fallback fill sintetis untuk transaksi nyata.

SQLite execution_outbox baru menyimpan signed transaction sebelum broadcast. Private
relay wajib dikonfigurasi. Rekonsiliasi gagal/RPC tidak pasti/reorg menghasilkan halt.
Gas signer dicatat sebagai biaya eksternal, terpisah dari cash vault. Semua cap kontrak
memakai atomic units; laporan analitis memakai f64.

Verifikasi: Foundry scope/expiry/revoke/daily/idempotency/kill dan 256 fuzz cap cases;
tipe web dan build. Batasan: deployment sebenarnya, relay MEV, saldo, oracle dan
receipt live belum tersedia untuk pengujian venue produksi. Jangan menyebut fase ini
telah aktif atau teraudit hanya karena unit test lulus. Konfigurasi: runbook utama.
