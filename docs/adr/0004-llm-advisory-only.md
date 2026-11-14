---
status: LIVE
last_reviewed: 2026-11-13
date: 2026-11-13
---

# ADR 0004: LLM hanya advisory, tidak memutuskan order

**Konteks.** Output LLM tidak deterministik, bisa disuntik lewat teks berita, dan sulit
di-replay. Keputusan trading harus bisa diulang persis.

**Opsi.**
1. LLM memutuskan bobot target.
2. LLM memberi skor yang menjadi fitur model.
3. LLM hanya menulis penjelasan, dengan timeout dan fallback; order dari model deterministik.

**Pilihan.** Opsi 3. Total timeout 4 detik, satu retry, cache, fallback, dan setiap
panggilan dicatat di `llm_calls`.

**Konsekuensi.**
- Replay deterministik tetap mungkin.
- LLM tidak bisa menambah edge, sehingga materi pemasaran tidak boleh menyiratkan LLM
  sebagai sumber keputusan.
- Tabel "With/Without LLM" saat ini hanya mengukur biaya token (RT-02).

**Tanggal.** 2026-11-13.
