---
status: TESTING
last_reviewed: 2026-11-13
source_of_truth: crates/ledger/src/lib.rs, crates/api/src/main.rs, src/lib/decision-proof.ts, contracts/src/Anchor.sol
---

# Memverifikasi satu keputusan

Panduan ini untuk orang yang tidak punya akun Siro dan tidak percaya pada kami. Kamu akan
memeriksa empat hal:

1. Isi keputusan cocok dengan hash yang di-commit (**komitmen**).
2. Hash itu ada di dalam root jam dan root harian (**inklusi**).
3. Root harian tercatat di blockchain (**anchor**).
4. Hash itu sudah publik di blockchain paling lama `max_lag` setelah tick, dan sebelum isinya
   dibuka (**publikasi tepat waktu**, ADR 0005).

Status `TESTING`: API berjalan di `127.0.0.1:4010` secara default. Belum ada endpoint
publik permanen. Per 2026-11-13, langkah di bawah bisa diikuti di instalasi lokal atau
di deployment uji.

## Yang kamu butuhkan

- Sebuah `decision_id` (36 karakter, UUIDv7). Ada di `/leaderboard` atau `/evidence`.
- Browser. Untuk langkah lanjutan: terminal dengan `curl` dan `node`.

## Cara 1: lewat browser (non-teknis, ±5 menit)

1. Buka halaman `/verify` di situs Siro.
2. Tempel `decision_id`, lalu tekan tombol verifikasi.
3. Halaman menghitung ulang semuanya **di browser kamu**, bukan di server kami. Kodenya ada
   di `src/lib/decision-proof.ts`, dan kamu bisa membacanya.
4. Kamu akan melihat empat hasil: komitmen, root jam, root harian, dan witness publikasi. Tiga
   yang pertama harus cocok. Witness menunjukkan berapa detik setelah tick hash itu publik,
   atau menyatakan bahwa publikasi tepat waktu **tidak** terbukti.
5. Salin `daily_root` dan nomor hari (`day`). Buka block explorer jaringan anchor, cari
   alamat kontrak `Anchor`, buka tab "Read contract", panggil `dailyRoots(day)`. Nilai `value`
   harus sama persis dengan `daily_root`. Kolom `timestamp` adalah waktu anchor.

6. Untuk witness: salin `root` dari bagian `publication`, panggil `witnessedAt(root)` di
   kontrak yang sama. Hasilnya (detik Unix) harus sama dengan `witnessed_at`. Jalan lain:
   panggil `verifyWitness(root, commit_hash, siblings, left)`, yang menghitung ulang proof di
   chain dan mengembalikan timestamp, atau 0.

Kalau salah satu tidak cocok, keputusan itu tidak terverifikasi. Laporkan lewat
[SECURITY.md](../SECURITY.md).

## Cara 2: tanpa kode kami sama sekali

```bash
curl -s https://<host-api>/verify/<decision_id> > proof.json
```

Respons memuat `decision.record`, `decision_proof`, `hour_root`, `hour_proof`, `daily_root`,
dan `anchor`.

**Komitmen.** Buang field `commit_hash` dari `record`. Serialisasikan sisanya dengan
RFC 8785 (JSON Canonicalization Scheme): kunci diurutkan, tanpa spasi. Hitung SHA-256.
Hasilnya harus sama dengan `commit_hash`.

**Rantai hash.** Field `prev_hash` di setiap keputusan menunjuk ke keputusan sebelumnya dari
agent yang sama. Ambil keputusan sebelumnya lewat `/decisions/<id>` dan pastikan
`commit_hash`-nya sama dengan `prev_hash` keputusan ini. Ulangi sejauh yang kamu mau.

**Inklusi.** Mulai dari `current = commit_hash`. Untuk setiap langkah di `decision_proof`:
kalau `left` bernilai `true`, `current = sha256(sibling ‖ current)`, sebaliknya
`current = sha256(current ‖ sibling)`. Gabungkan **byte**, bukan string hex. Hasil akhir
harus sama dengan `hour_root`. Ulangi dengan `hour_proof` mulai dari `hour_root`. Hasilnya
harus `daily_root`.

**Publikasi tepat waktu.** Field `publication` memuat `root`, `proof`, `witnessed_at`, dan
`max_lag_ms`. Hitung root dari `commit_hash` dan `proof` dengan aturan yang sama seperti
inklusi; hasilnya harus `root`. Pastikan `witnessedAt(root)` di chain sama dengan
`witnessed_at`. Terbukti hanya jika `tick_ts ≤ witnessed_at ≤ reveal_ts` dan
`witnessed_at - tick_ts ≤ max_lag_ms`. Jangan percaya flag `proven` dari server; hitung sendiri.

**Anchor.** Panggil `dailyRoots(day)` di kontrak `Anchor` lewat RPC mana pun, atau panggil
`verify(day, leaf, siblings, left)` yang menghitung ulang proof di chain.

## Apa yang verifikasi ini TIDAK buktikan

- **Witness membatasi, tapi tidak menghapus, jendela kepercayaan.** Operator masih bisa melihat
  harga sampai `max_lag_ms` (default 300 detik) setelah tick sebelum hash wajib publik. Untuk
  keputusan tanpa witness, `publication_proven` bernilai `false`, dan klaim "commit sebelum
  harga bergerak" tidak berlaku untuknya.
- Kontrak `Anchor` ada di Robinhood Chain (`0xbf9f13791c1c5bcd6e342fb500c711e574fb04e0`, sejak
  2026-11-14). Sampai worker witness berjalan, semua keputusan tetap bernilai
  `publication_proven: false`.
- Operator bisa memilih untuk tidak mem-witness keputusan tertentu. Hitung proporsi keputusan
  dengan `proven: false`; proporsi yang tinggi adalah tanda bahaya.
- Verifikasi tidak membuktikan keputusan itu dieksekusi, atau dieksekusi di harga berapa.
  Itu butuh rekonsiliasi fill onchain (fase 17, `PLANNED`).
- Verifikasi tidak membuktikan tidak ada keputusan yang **dihilangkan** sebelum anchor.
  Rantai `prev_hash` hanya mendeteksi penghapusan setelah keputusan berikutnya di-commit.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa membuktikan sendiri, tanpa akun dan tanpa kode kami, bahwa satu keputusan
tidak diubah setelah anchor harian. Pembaca juga bisa menolak klaim bahwa keputusan
dibuat "sebelum harga bergerak" untuk pergerakan dalam hari yang sama sebelum anchor,
karena desain saat ini memang tidak membuktikannya.
