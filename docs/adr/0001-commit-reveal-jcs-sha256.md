---
status: LIVE
last_reviewed: 2026-11-13
date: 2026-11-13
---

# ADR 0001: Commit–reveal dengan RFC 8785 + SHA-256

**Konteks.** Klaim utama Siro adalah keputusan agent tidak diubah setelah harga bergerak.
Orang luar harus bisa menghitung ulang hash dengan alat standar di bahasa apa pun.

**Opsi.**
1. Keccak-256 dengan ABI encoding (murah diverifikasi di EVM, sulit di luar EVM).
2. SHA-256 dengan JSON kanonik RFC 8785 (alat tersedia di semua bahasa).
3. Tanda tangan saja tanpa hash publik.

**Pilihan.** Opsi 2. Merkle tree juga memakai SHA-256 berurutan, bukan sorted keccak
OpenZeppelin, supaya proof bisa dihitung ulang tanpa library Solidity.

**Konsekuensi.**
- Verifikasi bisa dilakukan di browser dengan WebCrypto (`src/lib/decision-proof.ts`).
- Verifikasi onchain lebih mahal gas, tapi hanya dipanggil sebagai `view`.
- Floating point di JSON harus diserialisasi identik di Rust dan JS. Perbedaan representasi
  angka akan merusak hash. Risiko ini belum diuji lintas bahasa secara sistematis.
- Duplikasi daun terakhir pada jumlah ganjil membuat jumlah daun tidak terikat
  (lihat limitations.md #8).

**Tanggal.** 2026-11-13 (dicatat sesudah implementasi; keputusan dibuat lebih awal).
