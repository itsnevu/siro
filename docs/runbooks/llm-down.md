---
status: TESTING
last_reviewed: 2026-11-13
---

# Runbook: LLM down

**Dampak.** Kecil, dan memang dirancang begitu. LLM hanya advisory (ADR 0004). Service
advisory memakai total timeout 4 detik, satu retry, cache, lalu fallback. Order tetap
berjalan dari model deterministik.

**Langkah.**
1. **Jangan** aktifkan kill switch hanya karena LLM down.
2. Periksa `llm_calls` di `SIRO_ADVISORY_DB` untuk rasio fallback.
3. Kalau penyedia mengembalikan konten aneh (bukan error), curigai injection (THREAT_MODEL T4).
   Matikan advisory dengan mengosongkan `SIRO_LLM_PROVIDER_URL` dan restart service.
4. Kalau `SIRO_LLM_API_KEY` diduga bocor, rotasi di penyedia.

**Latihan.** Belum pernah. `tests/advisory.test.mjs` menguji timeout dan fallback.

## Apa yang bisa dibantah pembaca setelah membaca ini

Kalau order berhenti saat LLM down, berarti LLM ternyata ada di jalur keputusan, dan
ADR 0004 dilanggar. Pembaca bisa memeriksanya dari jeda di decision record.
