---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 8 — advisory async

Kode: `services/advisory/server.mjs`, `client.mjs`, `worker.mjs`. Service memiliki
cache (agent,tick), total timeout 4s, satu retry, validasi schema dan fallback rule.
Worker membaca fitur private yang sudah di-commit dan menulis journal advisory
terpisah; tidak mengubah record atau order. Proposal strategi hanyalah data sampai
melewati training dan gate. SQLite llm_calls mengaudit token cost setiap attempt.

API dapat menampilkan perbandingan paired gross/net untuk urutan order deterministik
yang identik, dikurangi biaya token aktual. Data harus contemporaneous dan biaya
setiap call lengkap. Jika biaya tidak diketahui atau advisory baru dijalankan sesudah
periode historis, perbandingan tetap unavailable. Tidak mengklaim alpha narasi.

Tes: provider timeout, malformed output dan fallback service tidak membuat order
bergantung pada LLM. Batasan: p99 <3s memerlukan observasi provider produksi; tidak
ada angka latency atau token cost yang ditebak. Detail kontrak provider pada runbook.
