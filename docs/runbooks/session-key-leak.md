---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook: session key bocor

**Batas kerugian.** Penyerang bisa trading sampai `maxTrade` per order dan `maxDaily` per
hari, hanya di aset dan venue yang ada di allowlist, sampai `expiry` atau sampai dicabut.
Penyerang tidak bisa menarik dana ke alamat lain lewat session key.

**Langkah (pemilik vault).**
1. Panggil `revoke(key)` di `SessionExecutor` milikmu. Ini langsung menonaktifkan key.
   Fungsi ini hanya bisa dipanggil owner, jadi dompet utamamu yang harus menandatangani.
2. Pastikan event `SessionRevoked` muncul di explorer.
3. Periksa transaksi dari key itu sejak waktu bocor yang diduga.

**Langkah (operator).**
1. Aktifkan kill switch.
2. Kalau key berasal dari `SIRO_SESSION_PRIVATE_KEY` server, anggap env server bocor:
   rotasi juga `SIRO_RISK_MAC_KEY`, `SIRO_ANCHOR_PRIVATE_KEY`, dan `SIRO_LLM_API_KEY`.
3. Beri tahu setiap pemilik vault yang memberi grant ke key itu.

**Celah.** Belum ada tombol "cabut semua" satu klik di UI. Test kontrak untuk revoke ada,
tapi test end-to-end dari UI belum.

**Latihan.** Belum pernah.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa mencari transaksi dari session key setelah event `SessionRevoked`. Satu
transaksi yang berhasil setelah revoke membuktikan revoke tidak efektif.
