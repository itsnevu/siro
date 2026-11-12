# Prompt utama — SIRO Sculpted Product Motion

Salin bagian di antara `MULAI PROMPT` dan `AKHIR PROMPT` untuk proyek baru. Nama gaya di dokumen ini adalah label praktis untuk dipakai ulang, bukan nama standar industri. Nilai teknis merupakan acuan pengarahan; sesuaikan terhadap layout dan durasi produk baru.

## MULAI PROMPT

Kamu bertindak sebagai motion designer, art director, dan sound designer untuk sebuah film produk. Buat satu video lengkap dengan gaya **SIRO Sculpted Product Motion**: perpaduan editorial serif, perangkat 3D berwarna gelap, material satin, palet lavender–pink–peach, tipografi kinetik, dan sound design yang mengikuti setiap gerakan.

Hasil harus terasa sebagai film produk yang diarahkan, dengan objek yang memiliki massa dan kedalaman. Bangun rangkaian komposisi yang saling terhubung. Prioritaskan kontinuitas objek, keterbacaan, kualitas material, serta timing visual dan audio.

### 1. Brief yang harus diisi

- Brand / produk: [NAMA BRAND].
- Produk dan manfaat utama: [DESKRIPSI SINGKAT].
- Logo dan aset resmi: [PATH / LAMPIRAN].
- Copy utama: [DAFTAR HEADLINE PENDEK].
- Tampilan produk / data: [UI DAN DATA YANG BOLEH DIPAKAI].
- CTA: [PESAN PENUTUP].
- Durasi: [DEFAULT 29–32 DETIK].
- Format: [DEFAULT 1920 × 1080, 16:9, 30 FPS].
- Referensi tambahan: [OPSIONAL].

Jika brief belum lengkap, gunakan placeholder yang jelas dan buat keputusan desain yang masuk akal. Lanjutkan implementasi sampai preview bisa ditonton. Gunakan bahasa copy dari brief. Jangan membuat klaim performa atau hasil investasi yang tidak diberikan.

### 2. Identitas visual

Tema: produk teknologi dengan nuansa editorial yang hangat, tenang, taktil, dan memiliki kedalaman. Hindari estetika dashboard neon yang penuh efek tanpa hierarki.

Palet acuan:

| Fungsi | Warna |
| --- | --- |
| Background charcoal | `#0A0B12` |
| Permukaan gelap | `#191B27` |
| Warm white | `#F4F2EE` |
| Cream | `#E9E1D6` |
| Ink untuk teks gelap | `#1B1620` |
| Lavender | `#A597FF` |
| Pink | `#EEB2CB` |
| Peach | `#F3CDB0` |
| Mint untuk status berhasil | `#8FE3B0` |

Gradient khas: arah sekitar 100°, lavender 0%, pink 70%, peach 100%. Gunakan pada koin, kartu utama, atau aksen tertentu. Pergantian background charcoal, cream, dan lavender membentuk ritme antarscene.

Typography:

- Headline: **Hedvig Letters Serif**.
- Kata aksen / kalimat emosional: **Instrument Serif Italic**.
- UI, angka, label, dan deskripsi: **Instrument Sans**.
- Gunakan font resmi brand jika brief meminta, sambil mempertahankan hierarki serif editorial dan UI sans jika cocok.
- Headline 84–170 px pada kanvas 1920 × 1080; UI utama 20–44 px. Sesuaikan berdasarkan framing, bukan mengecilkan seluruh isi supaya muat.
- Tracking headline rapat secukupnya, sekitar -2 sampai -7 px. Teks italic harus terasa sebagai aksen yang disengaja.
- Headline pendek, idealnya 2–6 kata. Hindari watermark, label mesin produksi, dan dekorasi teks yang tidak membantu cerita.

### 3. Ciri khas 3D yang wajib terasa

**A. Koin / medallion brand**

- Bentuk bundar dengan muka, sisi, dan belakang yang jelas.
- Muka satin menggunakan gradient lavender–pink–peach.
- Logo di tengah berwarna ink atau warna resmi yang kontras.
- Bangun ketebalan dengan lapisan nyata: acuan offset Z 0, -4, -8, -12 px; sisi lebih gelap daripada muka.
- Tambahkan bevel halus, highlight dari kiri atas, dan shading lembut pada sisi kanan bawah.
- Gunakan `preserve-3d`, backface yang benar, dan muka belakang jika objek memperlihatkan bagian belakangnya.
- Koin berperilaku seperti benda padat. Gerakan mendekat ke kamera harus terhubung dengan gerakan mengecil menuju titik tujuan.
- Hindari berhenti dengan posisi edge-on sehingga koin terlihat hilang.

**B. Ponsel**

- Proporsi perangkat konsisten; acuan ukuran lokal 480 × 930 px.
- Chassis charcoal dengan sisi metal gelap, bevel, tepi layar, dan ketebalan belakang sekitar 10–14 px.
- Radius luar sekitar 68 px, radius layar sekitar 55 px pada ukuran acuan.
- Kamera island berada di tengah atas layar dan mengikuti transformasi perangkat.
- Layar memiliki clipping yang benar. Grafik, teks, dan logo melekat pada bidang layar.
- Ketika logo/koin masuk ke grafik, gunakan anchor yang sama di pusat grafik. Semua elemen mengikuti transformasi parent perangkat yang sama.
- Tampilkan ponsel penuh pada satu shot dan close-up sebagian perangkat pada shot lain. Jangan memakai framing ponsel penuh sepanjang video.

**C. Laptop / MacBook-style product shot**

- Gunakan minimal satu shot laptop untuk variasi skala dan konteks produk.
- Buat layar, bezel, notch, base aluminium, dan bibir depan. Laptop harus punya siluet dan ketebalan yang terbaca.
- Acuan layar 1000 × 640 px; base sekitar 1130 px. Ini ukuran lokal, bukan kewajiban layout akhir.
- Isi layar dirancang sebagai dashboard desktop, bukan UI ponsel yang dilebarkan.
- Kamera tiga perempat ringan dengan rotasi masuk yang melambat. Pastikan layar tetap bisa dibaca.

**D. Kartu dan badge**

- Kartu utama memiliki permukaan yang jelas, bevel tipis, dan sisi yang lebih gelap.
- Gunakan 2–3 lapisan backing dengan offset posisi/Z untuk kartu verifikasi atau policy.
- Lapisan belakang harus mendukung kedalaman, bukan membuat kartu terlihat seperti banyak stiker yang tidak rapi.
- Badge kecil lebih tenang daripada kartu utama. Stagger badge sesuai urutan informasi.
- Hubungkan badge ke kartu dengan garis Bezier melengkung yang rapi, bukan garis horizontal dekoratif di bawah headline.
- Garis dapat digambar dari 0 ke 100%, dengan aksen cahaya kecil yang mengalir. Glow tipis, tidak mengalahkan teks.

### 4. Material, lighting, dan shadow

Gunakan satu arah cahaya yang konsisten, umumnya kiri atas. Setiap objek penting harus memiliki pemisahan visual berikut:

1. Highlight tipis di sisi yang menghadap cahaya.
2. Ketebalan / sidewall dengan warna lebih gelap.
3. Contact shadow yang dekat, sempit, dan lebih tegas.
4. Cast shadow yang jauh, lebar, lebih lembut, dan lebih transparan.

Contoh resep shadow kartu pada skala 1920 × 1080, untuk disesuaikan:

```css
box-shadow:
  inset 1px 2px 1px rgba(255,255,255,.5),
  4px 5px 0 #9b80b4,
  8px 10px 0 #79618e,
  0 14px 20px rgba(0,0,0,.25),
  0 42px 70px rgba(0,0,0,.20);
```

Pada cream, gunakan bayangan berwarna ink dengan opacity moderat. Pada charcoal, gunakan highlight tepi dan sisi objek agar kedalamannya tetap terlihat. Jangan mengandalkan shadow hitam pekat yang tidak terbaca di background gelap. Hindari glow putih besar di seluruh objek.

Shadow ikut memberi petunjuk tinggi dan jarak objek dari background. Jika memakai CSS 2.5D, susun lapisan dengan rapi dan jangan mengklaimnya sebagai simulasi lighting fisik. Gunakan mesh 3D jika brief membutuhkan sudut atau pencahayaan yang tidak bisa dicapai dengan lapisan CSS.

### 5. Bahasa gerak dan kamera

Setiap shot harus memiliki gerakan masuk, pengembangan informasi, dan gerakan lanjutan yang menuju transisi berikutnya.

- Tetapkan satu gerakan utama per shot: dolly-in, dolly-out, turn, lift, atau perpindahan fokus.
- Kombinasikan gerakan objek dan kamera secara terkendali. Gerakan kecil tidak perlu terjadi di semua sumbu sekaligus.
- Acuan perspective 1400–1800 px pada ukuran kanvas ini.
- Untuk ponsel, rotasi yang sudah menetap sekitar ±3–8° pada Y dan 0–3° pada X. Z sekitar 0–1° kecuali pose khusus.
- Rotasi masuk boleh lebih besar pada kartu/laptop, sekitar 15–30°, lalu melambat ke sudut baca yang nyaman. Sesuaikan sampai teks tidak terdistorsi.
- Badge dapat masuk dengan sudut lebih besar karena ukurannya kecil, lalu segera menetap.
- Zoom objek selama bagian baca sekitar 1–4%. Judul hero boleh memakai zoom lebih besar yang terarah.
- Gerakan lanjutan harus terasa seperti kamera berjalan perlahan, bukan perangkat bergoyang seperti perahu.
- Hindari rotasi sinus berulang pada ponsel, tilt yang berubah arah terus-menerus, dan overshoot spring berlebihan.
- Jangan membuat semua elemen berhenti mendadak setelah entrance. Sebaliknya, jangan menambahkan floating tanpa tujuan untuk menghindari frame diam.
- Sisakan ruang baca. Gerakan tidak boleh mengubah hierarchy atau membuat penonton mengejar teks.

Easing acuan:

- Entrance dan settle: spring teredam, acuan damping 24, stiffness 100, mass 1.1 pada 30 fps.
- Perjalanan kamera / objek: bezier yang halus di awal dan akhir, misalnya `(0.4, 0, 0.2, 1)`.
- Wipe scene: progress lebih merata, acuan `(0.25, 0.1, 0.75, 0.9)`.
- Jangan memakai satu easing untuk semua gerakan.

### 6. Tipografi kinetik

- Judul muncul dengan perpaduan reveal per karakter atau kata, fade-in, dan translate Y pendek.
- Acuan stagger 1–2 frame per karakter pada 30 fps; fade setiap karakter sekitar 9 frame; Y dari 12 px ke 0; blur dari 2 px ke 0.
- Animasi harus tetap terasa sebagai kalimat. Jangan membuat teks panjang muncul terlalu lambat hanya karena semua huruf diberi jeda.
- Pertahankan spasi, baseline, line-height, dan kerning semaksimal mungkin.
- Setelah reveal, judul boleh bergerak dengan zoom perlahan serta sedikit perubahan perspektif.
- Shadow teks berlapis dan lembut: lapisan dekat opacity rendah, lapisan jauh blur lebih lebar. Hasil harus mudah dibaca dan tidak terlihat seperti efek WordArt berat.
- Hindari garis horizontal dekoratif di bawah judul seperti “Your rules.”

### 7. Struktur film acuan

Adaptasikan cerita ini terhadap produk baru; jangan menyalin istilah finansial jika tidak relevan.

| Bagian | Visual dan framing | Perkembangan gerak |
| --- | --- | --- |
| 1. Brand object | Koin 3D pada charcoal | Muncul, membesar mendekati lensa, lalu mulai kembali |
| 2. Product landing | Ponsel penuh pada cream | Koin yang sama mengecil ke pusat grafik; ponsel muncul di belakangnya |
| 3. Verification | Headline di kiri, kartu policy berlapis di kanan pada lavender | Kartu berputar masuk, badge dan detail muncul berurutan, status dikonfirmasi |
| 4. Typography statement | Headline serif + italic pada cream | Reveal per huruf/kata, zoom lambat, shadow halus |
| 5. Connected product system | Kartu gradient di tengah, badge kiri-kanan pada charcoal | Badge muncul bertahap dan garis lengkung tersambung ke kartu |
| 6. Desktop context | Laptop dengan dashboard pada cream | Rotasi ringan, kamera mendekat, chart dan bar terbentuk |
| 7. Feature macro | Dua kartu detail pada charcoal | Lift/rotate masuk bergantian, angka dan konfirmasi diberi aksen |
| 8. Notification close-up | Sebagian ponsel diperbesar, headline di kiri | Notifikasi maju dari bidang layar dan menetap di foreground |
| 9. Product collage | Grid 3 × 2 berisi disc dan detail produk pada cream | Stagger dan kedalaman ringan; variasi konten tetap teratur |
| 10. Motion statement | Headline italic besar pada lavender | Reveal dengan zoom yang perlahan dan jelas |
| 11. Brand resolution | Wordmark pada charcoal | Sapuan diagonal mengikuti bahasa logo, lalu zoom/settle ringan |

Opening 1 dan 2 adalah **satu continuous shot**. Gunakan satu instance objek koin dengan satu lintasan. Jangan mengganti ke koin duplikat yang dicrossfade. Ukuran, orientasi, posisi, dan kecepatan harus berlanjut saat background berubah.

### 8. Transisi scene

Durasi mengikuti jenis efek, bukan diseragamkan:

| Jenis | Durasi acuan pada 30 fps | Karakter |
| --- | --- | --- |
| Horizontal sweep | 18–20 frame / 0.6–0.67 detik | Cepat, jelas, tidak mengganggu ritme |
| Vertical lift | 20 frame / 0.67 detik | Ringkas, dengan arah yang terbaca |
| Mosaic | 48 frame / 1.6 detik | Cukup lama untuk memperlihatkan pembentukan tile |
| Circular focus / zoom reveal | 36 frame / 1.2 detik | Mengikuti pusat objek atau fokus cerita |
| Diagonal brand reveal | 38 frame / sekitar 1.27 detik | Sapuan yang berhubungan dengan bentuk logo |

Mosaic acuan: grid 8 × 5 tile dengan stagger deterministik; tile tumbuh dari pusatnya dengan smoothstep. Boleh gunakan sudut tile sedikit rounded pada pertengahan animasi. Hindari glitch acak yang mengganggu teks.

Pertahankan scene lama sebagai bidang utuh di bawah scene baru sampai reveal selesai. Mask utama diterapkan pada scene masuk. Jangan mengecilkan mask kedua scene sekaligus sehingga background hitam terlihat sebagai celah.

Rotasi dilakukan pada objek, bukan memutar seluruh viewport sampai sudut kanvas terbuka. Pada reveal masuk, scale sekitar 1.06 → 1 boleh memberi kedalaman ringan. Blur hanya secukupnya selama gerak; endpoint harus tajam.

Penutup: sapuan diagonal sekitar 14° membawa lavender ke charcoal. Tambahkan cahaya gradient yang tipis di tepi sapuan. Headline lama mundur/bergeser sedikit; wordmark baru masuk perlahan. Pastikan pertemuan teks lama dan logo baru tidak membentuk kata yang membingungkan pada titik tengah transisi.

### 9. Musik dan SFX — keduanya wajib ada

**Musik latar tetap aktif. Voice-over tidak digunakan kecuali diminta secara eksplisit.**

Gunakan musik elektronik santai atau groove instrumental yang cocok dengan brand. Pilih berdasarkan brief dan referensi musik pengguna. Jangan menganggap sebuah track cocok hanya karena label genre-nya. Siapkan agar track mudah diganti tanpa mengubah timing scene.

Musik berada di belakang SFX, dengan fade-in dan fade-out yang halus. Volume musik dapat turun lembut ketika SFX penting berbunyi. Acuan mix sebelumnya: bed dinormalisasi sekitar -23 LUFS, gain dasar 0.55, duck ke 80% dari gain dasarnya. Ini titik awal, bukan angka wajib untuk semua rekaman.

Bangun cue sheet yang mencakup **transisi dan komponen**:

- Koin mendekat: whoosh pendek yang naik sesuai gerakan.
- Koin menjauh: tekstur retreat yang mengarah ke titik landing.
- Landing: kontak kecil yang taktil, bukan cinematic boom.
- Horizontal sweep: air/whoosh pendek yang berakhir bersama wipe.
- Vertical lift: gerakan suara yang lebih ringan dan berbeda dari horizontal.
- Mosaic: tekstur digital granular sepanjang reveal, dengan pulsa kecil yang terasa menyusun tile.
- Circular focus: suara zoom/vacuum yang panjangnya mengikuti efek.
- Kartu masuk: bunyi pendek dengan body lembut.
- Badge dan baris UI: tick kecil berurutan sesuai stagger.
- Chart atau ring terbentuk: shimmer pendek yang tenang.
- Headline mulai muncul: satu aksen kecil, bukan bunyi keras pada setiap huruf.
- Status berhasil: konfirmasi UI singkat.
- Notifikasi: chime lembut di saat kartu notifikasi mendarat.
- Collage: aksen ringan sesuai urutan disc muncul.
- Penutup: signature sweep diagonal, diikuti resolusi halus saat logo terbaca penuh.

Buat hirarki: SFX transisi paling jelas; bunyi komponen lebih pelan; musik menopang keseluruhan. Sisakan jeda. Jangan menumpuk semua bunyi pada setiap frame. Variasikan sumber dan frekuensi agar efek tidak terdengar identik terus-menerus.

Gunakan sumber audio dengan lisensi yang sesuai dan catat sumbernya. Periksa onset, durasi, tail, level peak, dan mix secara teknis, lalu dengarkan playback dengan visual. Jika tidak bisa melakukan penilaian pendengaran langsung, nyatakan batas verifikasinya; jangan mengklaim sudah mendengarkan hanya dari hasil analisis level.

### 10. Implementasi dan kontinuitas

Jika memakai Remotion:

- Gunakan React/TypeScript dan frame clock deterministik, `useCurrentFrame`, `interpolate`, serta spring.
- Baca panduan versi library yang terpasang sebelum menggunakan API. Ikuti instruksi repository.
- Hindari CSS transition/animation berbasis wall clock dan randomness yang berubah setiap render.
- Pisahkan komponen objek, typography, transition, dan audio agar mudah direvisi.
- Jadikan timing scene, overlap, dan cue sebagai sumber data bersama.
- Kurangi overlap saat menghitung durasi akhir. Memperpanjang transisi tidak boleh menghabiskan waktu baca scene.
- Ikat SFX pada event visual yang sama, bukan daftar timestamp lama yang tidak ikut berubah.
- Pertahankan asset logo resmi dan font yang benar. Jangan merekonstruksi logo secara sembarang.
- Scene dengan objek yang berlanjut harus berbagi transform/anchor yang konsisten.
- Sediakan preview Studio. Export video hanya ketika diminta.

### 11. Pemeriksaan sebelum menyatakan selesai

Periksa frame sebelum transisi, onset, 25%, 50%, 75%, akhir, dan frame pertama sesudahnya. Periksa juga pertengahan dan bagian baca setiap shot.

Pastikan:

- Koin tidak berubah menjadi objek lain atau bertumpuk saat landing.
- Tidak ada celah kanvas, frame kosong tidak disengaja, flash, atau clipping objek yang salah.
- Ponsel tidak bergoyang/miring berlebihan; semua UI melekat pada layar.
- Laptop, kartu, dan koin punya ketebalan serta shadow yang terbaca.
- Zoom tidak memotong headline dan elemen penting.
- Teks tidak saling bertumpuk selama reveal.
- Mosaic dan efek dekoratif benar-benar punya waktu untuk terlihat.
- Semua shot memiliki ritme yang disengaja, dengan ruang baca yang cukup.
- Musik tetap ada, SFX komponen tidak mengalahkan SFX transisi, dan voice-over tidak terpasang.
- Audio tidak clipping, cue tidak keluar timeline, dan semua asset bisa dimuat.
- Type check dan lint lolos.

Sampaikan hasil secara ringkas: apa yang dibuat, lokasi preview, dan apa yang benar-benar sudah diperiksa. Jangan hanya memberi storyboard; implementasikan film yang dapat dipreview.

## AKHIR PROMPT

## Pemanggilan singkat untuk proyek berikutnya

> Buat video [PRODUK] dengan gaya **SIRO Sculpted Product Motion** dari prompt master terlampir. Pertahankan koin satin berlapis, perangkat dengan bevel dan ketebalan, kartu dengan shadow bertingkat, serif editorial, gradient lavender–pink–peach, garis koneksi lengkung, dan motion yang terarah. Variasikan shot ponsel penuh, laptop, macro, dan collage. Ponsel jangan goyang berlebihan. Sweep cepat; mosaic dan circular focus lebih lama. Musik background tetap ada, SFX mengikuti transisi dan komponen, tanpa voice-over. Brief: [ISI BRIEF].

Untuk chat/proyek baru, lampirkan dokumen ini atau salin prompt utamanya. Nama gaya saja tidak membawa detail dokumen secara otomatis.

## Referensi implementasi saat ini

- `src/Montage.tsx`: visual dan rangkaian shot.
- `src/theme.ts`: palet dan font.
- `src/timing.ts`: durasi, overlap, dan start frame.
- `src/components/DepthTransition.tsx`: sweep, lift, mosaic, circular focus, dan penutup diagonal.
- `src/components/RevealText.tsx`: reveal karakter.
- `src/components/DesignedAudio.tsx`: musik serta playback SFX.
- `src/sound-cues.ts`: 42 cue transisi dan komponen pada versi ini.

Baseline: 1920 × 1080, 30 fps, 883 frame, sekitar 29.43 detik. Bagian toss dan phone landing sudah disatukan menjadi satu continuous shot; jumlah sequence aktual lebih sedikit daripada 11 bagian cerita.
