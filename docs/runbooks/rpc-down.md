---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook: RPC mati

**Gejala.** Error timeout dari viem di eksekutor (`SIRO_EXECUTION_RPC`) atau anchor worker
(`SIRO_ANCHOR_RPC`). Status agent menjadi stale.

**Kondisi saat ini.** Satu RPC per worker. Kuorum 2-dari-3 dan failover otomatis kurang
dari 500 ms masih `PLANNED` (fase 9). Failover hari ini manual.

**Otomatis (eksekusi live).** Kalau broadcast atau receipt gagal karena RPC, `live.mjs` tidak
langsung halt. Bridge mengirim ulang byte bertanda tangan yang sama, lalu setelah
`SIRO_EXECUTION_RESOLVE_MS` (default 180 detik) mengirim tx pembatalan bernonce sama. Hasilnya
salah satu dari: mined (fill dicatat), pasti tidak tereksekusi (order dibatalkan, runner lanjut),
atau tidak pasti (runner halt dan menulis kill file). Pasang `SIRO_EXECUTION_RPC_SECONDARY`
dari penyedia lain supaya keputusan "pasti tidak tereksekusi" butuh dua RPC yang sepakat.

**Langkah manual (jika runner halt).**
1. Aktifkan kill switch: `touch "$SIRO_KILL_FILE"`.
2. Uji endpoint dari mesin lain: `curl -s -X POST -H 'content-type: application/json'
   --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' <RPC>`.
3. Ganti env RPC ke endpoint cadangan dari penyedia **yang berbeda**, lalu restart worker.
4. Bandingkan `eth_blockNumber` dan saldo vault dari dua endpoint. Kalau berbeda lebih dari
   beberapa blok, curigai RPC berbahaya (THREAT_MODEL T2), bukan sekadar mati.
5. Rekonsiliasi posisi, baru hapus kill file.

**Definition of done fase 9 (belum lulus).** Chaos test RPC mati total → nol order keluar,
semua agent `degraded` dengan alasan tercatat.

**Latihan.** Belum pernah.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa menunjukkan bahwa satu penyedia RPC adalah titik gagal tunggal hari ini.
Klaim ketersediaan tinggi untuk eksekusi bisa dibantah sampai kuorum RPC ada.
