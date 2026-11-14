---
status: TESTING
last_reviewed: 2026-11-14
---

# Fase 4 — risk veto

Kode: `crates/riskengine`, adapter `crates/exec`, dan state machine `crates/engine`.
Proses risk persisten memakai kanal private stdin/stdout; exception/timeout menolak
izin. Permit HMAC terikat request/order, waktu, ukuran dan hasil veto. Secret tidak
boleh diberikan kepada proses yang tidak perlu dalam deployment dengan akun OS terpisah.

Governor, manual/automatic kill, freshness, spread, funding, gap, risk units, sector,
correlation, trade count dan turnover memiliki validator. Tes unit dan property-based
memeriksa max weight/risk budget/veto; adapter menolak permit palsu, fill sebelum open
eligible dan kill. Tidak ada migrasi database; risk assessment ditulis sebagai event baru.

Batasan: telemetry portfolio produksi tetap harus benar. Runner satu aset tidak
mengarang matriks korelasi antar aset. Run yang interrupted pada tengah tick berhenti
secara konservatif jika record tidak dapat dilanjutkan dengan identitas yang sama;
operator harus merekonsiliasi, bukan menulis ulang log. Lihat runbook utama.
