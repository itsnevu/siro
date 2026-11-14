# Threat model

Ditulis 2026-11-13, sebelum fase 15 dikerjakan. Ringkasan publik ada di
[docs/security.md](docs/security.md).

Aset yang dilindungi, urut dari yang paling penting: dana user di vault, integritas
decision record, kunci anchor, kunci HMAC risk, dan kepercayaan pada angka net.

| # | Ancaman | Jalur | Dampak | Kontrol saat ini | Celah |
| --- | --- | --- | --- | --- | --- |
| T1 | Pencurian session key | key bocor dari klien/server operator | trade sampai `spendCap`/`dailyCap` sampai `expiry` | cap, allowlist router dan token, expiry, revoke di `SessionExecutor` | test kontrak revoke → execute revert ada (`SessionExecutor.t.sol`); test end-to-end lewat UI dan eksekutor belum; satu klik revoke semua: belum ada di UI |
| T2 | RPC berbahaya | RPC memberi harga/saldo/receipt palsu | keputusan dari data palsu; anchor dianggap terkonfirmasi padahal tidak | konfirmasi anchor ≥ 2; satu RPC per worker | tidak ada kuorum 2-dari-3; satu RPC bisa berbohong konsisten |
| T3 | Dependensi jahat | paket npm/cargo/Action disusupi | eksekusi kode di build atau runtime, termasuk akses ke env | lockfile npm dan cargo | Actions pakai tag, bukan hash; belum ada audit supply chain di CI |
| T4 | Injection lewat teks berita ke LLM | teks eksternal masuk ke prompt advisory | teks rationale yang menyesatkan pembaca | LLM tidak bisa mengubah order (ADR 0004); timeout dan fallback | belum ada sanitasi/batas panjang input yang terdokumentasi; rationale tampil di UI apa adanya |
| T5 | Manipulasi pool tipis | lawan menggerakkan harga pool kecil sebelum tick | fitur dan harga palsu, order di harga buruk | veto `spread`, `gap`, `stale_data`; slippage model berbasis depth | tidak ada pembanding Chainlink; MEV tidak dimodelkan |
| T6 | Kunci anchor bocor | `SIRO_ANCHOR_PRIVATE_KEY` di env server | penyerang menulis root harian palsu untuk hari yang belum di-anchor | root yang sudah ada tidak bisa ditimpa (immutable per hari) | kunci di env var, bukan KMS/HSM; owner tunggal tanpa multisig |
| T7 | Kunci HMAC risk bocor | `SIRO_RISK_MAC_KEY` dibagi ke eksekutor | permit palsu, veto risiko dilewati | TTL permit ≤ 5 detik, terikat hash request | kunci simetris dibagi dua proses; tidak ada rotasi |
| T8 | Operator memalsukan keputusan setelah melihat harga | operator menulis journal sebelum saksi luar | track record palsu | rantai `prev_hash`; witness per batch (ADR 0005; kontrak di-deploy 2026-11-14, worker belum berjalan); anchor harian | sampai `max_lag` (default 300 detik) setelah tick; operator bisa tidak mem-witness keputusan buruk |
| T9 | Leaderboard memilih pemenang | banyak agent, tampilkan yang menang | ilusi edge | DSR di gate | jumlah percobaan dilaporkan sendiri (RT-03); graveyard belum terisi otomatis |
| T10 | Pihak lain mengaktifkan job engine untuk vault orang lain | schedule berisi vault milik orang lain | trading tanpa persetujuan pemilik | pemilik on-chain dicek saat schedule disimpan; job juga butuh session key dari pemilik | pemilik hanya dicek saat disimpan |

## Prioritas perbaikan

1. T6: pindahkan kunci anchor ke KMS, owner ke multisig.
2. T8: deploy witness (ADR 0005) dan pantau proporsi keputusan tanpa witness.
3. T2: kuorum RPC.
4. T1: test end-to-end revoke dari UI sampai eksekutor.
5. T3: pin Actions ke hash, audit supply chain di CI.
