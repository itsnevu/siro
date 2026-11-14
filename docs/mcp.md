---
status: PLANNED
last_reviewed: 2026-11-13
---

# Integrasi asisten (MCP)

**Per 2026-11-13 tidak ada server MCP di repo ini.** Tidak ada kode MCP di `src/`,
`services/`, atau `crates/`. Halaman ini menulis batasan desain sebelum kode ditulis,
supaya batasan itu tidak dilonggarkan diam-diam nanti.

## Rencana cakupan

Hanya baca, dipetakan 1:1 ke API publik:

| Tool | Endpoint | Catatan |
| --- | --- | --- |
| `list_agents` | `GET /agents` | angka selalu dengan label mode (backtest/paper/live) |
| `list_decisions` | `GET /decisions` | hanya hash untuk keputusan yang belum di-reveal |
| `verify_decision` | `GET /verify/{id}` | verifikasi dihitung ulang di sisi klien, bukan dipercaya |
| `get_roots` | `GET /roots` | |

## Batasan yang tidak akan berubah tanpa ADR

- Tidak ada tool yang membuat, mengubah, atau mengeksekusi order.
- Tidak ada tool yang membaca atau menulis session key.
- Respons tool tidak boleh menampilkan return tanpa label net/bruto/backtest dan rentang tanggal.
- Teks dari decision record (`rationale_text`) dikirim sebagai data, bukan instruksi. Asisten
  yang memakainya harus memperlakukannya sebagai input tidak tepercaya.

## Apa yang bisa dibantah pembaca setelah membaca ini

Pembaca bisa memeriksa repo dan memastikan tidak ada server MCP, jadi klaim "integrasi
asisten" apa pun di materi lain saat ini tidak benar. Kalau server MCP muncul dengan tool
yang bisa menulis atau mengeksekusi, pembaca bisa menunjukkan pelanggaran halaman ini.
