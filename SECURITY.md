# Kebijakan keamanan

## Melapor kerentanan

Jangan buka issue publik untuk kerentanan yang bisa memindahkan dana, memalsukan
decision record, atau melewati risk engine.

Laporkan lewat **GitHub Security Advisory** di repo ini (tab Security → Report a vulnerability).
Sertakan langkah reproduksi, commit hash, dan dampak.

## SLA respons

| Tahap | Target |
| --- | --- |
| Konfirmasi laporan diterima | 2 hari kerja |
| Penilaian awal dan tingkat keparahan | 5 hari kerja |
| Perbaikan untuk tingkat kritis (dana atau integritas record) | 14 hari kalender |
| Pengungkapan publik | setelah perbaikan, atau 90 hari sejak laporan, mana yang lebih dulu |

Target ini belum pernah diuji dengan laporan nyata. Per 2026-11-13 belum ada program bug
bounty berbayar.

## Cakupan

Kontrak di `contracts/src/`, crate di `crates/`, layanan di `services/`, dan route API di
`src/app/api/`. Model ancaman: [THREAT_MODEL.md](THREAT_MODEL.md). Ringkasan:
[docs/security.md](docs/security.md).
