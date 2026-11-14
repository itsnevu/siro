---
status: TESTING
last_reviewed: 2026-11-13
---

# Keamanan: ringkasan

Model ancaman lengkap ada di [THREAT_MODEL.md](../THREAT_MODEL.md). Cara melapor dan SLA
ada di [SECURITY.md](../SECURITY.md).

## Yang melindungi dana user

- Dana tetap di vault/`SessionExecutor` milik user. Agent hanya memegang session key.
- Session key dibatasi `spendCap` per trade, `dailyCap`, `expiry`, allowlist router dan token,
  dan bisa dicabut kapan saja oleh user.
- Setiap order butuh permit risk engine, ditandatangani HMAC, berlaku maksimal 5 detik.

## Yang belum aman (per 2026-11-13)

- Kunci anchor ada di env var server, bukan KMS/HSM.
- Kontrak `Anchor` dimiliki satu alamat, tanpa multisig.
- Satu RPC per worker, tanpa kuorum.
- GitHub Actions belum di-pin ke hash commit.
- Belum ada audit pihak ketiga untuk kontrak mana pun.
- Revoke sudah diuji di level kontrak (`contracts/test/SessionExecutor.t.sol`), tapi belum
  ada test end-to-end dari tombol UI sampai eksekutor menolak order.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menolak klaim "non-custodial dan aman" secara umum dengan menunjuk daftar
"belum aman" di atas. Pembaca juga bisa memeriksa langsung di kode bahwa kunci anchor
dibaca dari `process.env` di `services/anchor/worker.mjs`.
