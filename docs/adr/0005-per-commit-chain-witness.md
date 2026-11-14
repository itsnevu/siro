---
status: TESTING
last_reviewed: 2026-11-13
date: 2026-11-13
supersedes: 0003 (sebagian: klaim waktu publikasi)
---

# ADR 0005: Witness on-chain per batch commit

**Konteks.** ADR 0003 hanya meng-anchor root harian. Akibatnya, operator bisa menyusun
keputusan dengan `commit_ts` buatan sampai sekitar 24 jam sebelum ada saksi luar. API
mengembalikan `publication_proven: false` untuk semua keputusan.

**Opsi.**
1. Anchor root per jam (24 transaksi per hari). Jendela kepercayaan masih bisa sampai 1 jam
   setelah tick.
2. Witness batch commit hash setiap beberapa detik. Jendela kepercayaan menjadi detik-menit.
3. Layanan timestamping off-chain (RFC 3161, OpenTimestamps). Saksinya pihak ketiga, tapi
   verifikasinya butuh alat khusus.

**Pilihan.** Opsi 2. `Anchor.witness(root)` bersifat permissionless dan menyimpan `block.timestamp`
pertama. Worker `services/anchor/witness.mjs` mem-batch commit hash yang belum ter-witness
(default setiap 10 detik), memakai outbox supaya batch yang sudah dikirim selalu diselesaikan
sebelum batch baru dibuat, dan mencatat receipt hanya setelah minimal 2 konfirmasi.
`/verify` menyatakan `publication_proven: true` hanya jika
`tick ≤ witnessed_at ≤ min(reveal, tick + max_lag)`. Default `max_lag` 300 detik
(`SIRO_PUBLICATION_MAX_LAG_MS`). Verifier browser menghitung ulang putusan ini sendiri, dan
tidak memakai flag dari server.

**Konsekuensi.**
- Jendela kepercayaan turun dari sekitar 24 jam ke paling lama `max_lag` setelah tick.
- Gas: satu transaksi per batch, bukan per keputusan.
- Operator masih bisa **tidak** mem-witness keputusan yang buruk. Keputusan itu tampil dengan
  `proven: false`. Penghilangan terlihat, tapi tidak dicegah.
- Anchor harian (ADR 0003) tetap berjalan untuk integritas rantai. Root harian tidak lagi
  dipakai sebagai bukti waktu.
- Kunci witness masih dibaca dari env var (limitations #6).

**Tanggal.** 2026-11-13.
