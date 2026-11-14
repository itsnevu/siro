---
status: LIVE
last_reviewed: 2026-11-13
date: 2026-11-13
---

# ADR 0002: Inti engine di Rust, proses risk terpisah

**Konteks.** Engine harus deterministik untuk replay, menolak input tidak valid alih-alih
menebak, dan memisahkan pengambil keputusan dari pemberi izin risiko.

**Opsi.**
1. Satu service Node/TypeScript bersama web.
2. Rust workspace (tickstore, features, engine, riskengine, exec, ledger, replay, api).
3. Python dengan pandas untuk riset dan produksi.

**Pilihan.** Opsi 2. Risk engine berjalan sebagai proses persisten terpisah, dan eksekutor
hanya menerima order dengan permit HMAC yang terikat ke hash request.

**Konsekuensi.**
- Struct dengan `deny_unknown_fields` menolak konfigurasi salah ketik.
- Dua bahasa (Rust untuk engine, TS untuk web dan verifier) berarti dua implementasi
  canonical JSON yang harus tetap identik.
- Kunci HMAC dibagi antara risk engine dan execution worker. Kalau worker eksekusi
  disusupi, kunci itu ikut bocor.
- Waktu kompilasi pertama lama, dan Windows butuh toolchain khusus.

**Tanggal.** 2026-11-13 (dicatat sesudah implementasi).
