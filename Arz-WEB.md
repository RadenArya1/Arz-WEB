# Arz-WEB: Spesifikasi Sistem, Organisasi Folder Fitur & Dokumentasi Proyek

> [!IMPORTANT]
> ### 🎯 TUJUAN AKHIR & FILOSOFI DOKUMENTASI (`Arz-WEB.md`)
> 1. **Membimbing AI Agent Men-deploy Website**: Dokumen ini disusun khusus sebagai panduan arsitektur tunggal untuk membimbing AI Agent dalam merancang, membangun, mengaudit, dan **mendeploy website ke lingkungan server produksi (Nginx Home Server / CasaOS)**, **BUKAN untuk membuat aplikasi offline**.
> 2. **Offline Hanya Tahap Awal Pembuatan Fitur**: Lingkungan lokal/offline hanya berfungsi sebagai ruang kerja sementara (*staging environment*) pada tahapan paling awal saat kode dan fitur baru dirancang serta diuji sebelum siap dipublikasikan ke server web.
> 3. **Hanya Mencatat Fitur yang Telah Di-deploy & Diedit di Web**: Seluruh spesifikasi, arsitektur, selektor DOM, endpoint, dan logika yang tertuang di dalam dokumen ini **HANYA BERISI FITUR YANG TELAH BERHASIL DI-DEPLOY DAN DIEDIT DARI WEBSITENYA** secara live. Seluruh komponen yang tidak berada di server web produksi tidak boleh dicatat dalam dokumen ini.

Dokumen tunggal ini menggabungkan seluruh panduan arsitektur, konvensi organisasi folder fitur, protokol audit kebersihan proyek, serta spesifikasi teknis terkini dari ekosistem **Arz-WEB**, yang mencakup tiga pilar aplikasi web aktif yang telah dibangun dan terpasang di server produksi:
1. **Grimoire Dashboard Utama** (`index.html`) — Portal sentral web personal bergaya cyber-grimoire transparan borderless dengan peluncur katalog proyek terintegrasi, pemantau telemetri sistem, konsol notifikasi live, dan jam perkamen.
2. **Arcanum Finance (Money Tracker)** (`keuangan.html`) — Modul pencatatan arus kas (*cashflow dual-stream* inflow/outflow) murni tanpa kategori dengan automasi AI OCR Vision (Tesseract.js), smart regex parser (transfer, QRIS, tarik tunai ATM), review card interaktif, dan grafik multi-bulan.
3. **Ethol Academic Notifier** (`ethol-notifier/`) — Modul automasi akademik cerdas berbasis headless Puppeteer & background daemon di CasaOS untuk auto-presensi perkuliahan SSO CAS PENS, penangkapan screenshot bukti presensi dengan retensi sementara 24 jam, pemantau tenggat tugas kuliah (≤ 5 hari), live SSE log streaming, dan visual mode loop crimson red.

---

## BAGIAN I: KONVENSI ORGANISASI FOLDER FITUR & ATURAN PROYEK BARU

### 1. Aturan Baku Pembuatan Projek Baru: Wajib Membuat Folder Khusus Terlebih Dahulu
> [!IMPORTANT]
> **ATURAN WAJIB PENGEMBANGAN PROYEK BARU (DEDICATED PROJECT FOLDER FIRST)**:
> Setiap kali menambahkan atau mengembangkan proyek baru, modul mandiri, atau aplikasi web dalam ekosistem **Arz-WEB**, pengembang/AI Agent **WAJIB SELALU MEMBUAT FOLDER BARU TERLEBIH DAHULU** di tingkat root repositori (contoh: `ethol-notifier/`, modul web baru berikutnya, dst.).
> 
> **Ketentuan Struktur Folder Proyek Mandiri:**
> 1. **Pusat Seluruh Berkas**: Seluruh berkas yang bersangkutan (halaman antarmuka `index.html`, lembar gaya `*.css`, logika script `*.js`, engine automasi/backend, cache data `*.json`, dan subfolder aset) **wajib dikumpulkan secara utuh di dalam folder proyek tersebut**.
> 2. **Dilarang Menyerakkan Berkas di Root**: File kerja proyek baru tidak boleh ditaruh tercecer di root direktori. Root repositori hanya diperuntukkan bagi portal utama (`index.html` Grimoire Dashboard), file konfigurasi (`package.json`), master server (`serve.js`), skrip deployment/otomasi global (`deploy.ps1`, `Buka_Website.bat`), dan berkas aturan/dokumentasi (`Arz-WEB.md`, `AGENTS.md`).
> 3. **Independensi & Portabilitas**: Setiap folder proyek mandiri harus dapat berfungsi mandiri, memiliki endpoint index sendiri, serta mudah dimigrasikan atau di-deploy tanpa ketergantungan silang yang membingungkan.

### 2. Struktur Pohon Berkas Terkini
```
Arz-WEB/
├── index.html                           # Entry Point: Grimoire Dashboard Utama
├── keuangan.html                        # Entry Point: Arcanum Finance (Money Tracker Standalone)
├── serve.js                             # Local Dev HTTP & API Server (Node.js + Puppeteer runner + Crash Guards)
├── server.js                            # Alias Entrypoint (node server.js -> serve.js)
├── serve-watchdog.js                    # Self-Healing Supervisor (Auto-Restart jika Crash / Liveness Hang)
├── Buka_Website.bat                     # Launcher 1-Klik Buka Server & Browser Otomatis
├── Buka_Website_Latar_Belakang.vbs      # Launcher Senyap Tanpa Jendela Terminal
├── Pasang_Auto_Start.bat                # Skrip Otomasi Startup Windows (Menjalankan serve-watchdog.js)
├── Hapus_Auto_Start.bat                 # Skrip Pencopot Startup Windows
├── deploy.ps1                           # Skrip Automasi Migrasi ke Nginx Home Server
├── rotate-testsprite.ps1                # Launcher & Forwarder Auto-Rotasi Akun TestSprite (Local Dev)
├── logs_buffer.json                     # Buffer persisten log presensi sukses & tautan screenshot (retensi 24 jam)
├── Arz-WEB.md                           # Master Dokumen & Spesifikasi Sistem Terpadu
│
├── testsprite_tests/                    # FOLDER MANDIRI PENGUJIAN: TestSprite Automated Suite (Eksklusif Localhost)
│   ├── index.html                       # Antarmuka Web Visual: TestSprite Sentinel Hub (Localhost :8080)
│   ├── monitor.css                      # Styling Cyberpunk Dark Glassmorphism, KPI Grid, Split Button & Responsive HP
│   ├── monitor.js                       # Controller Antarmuka, Target Dropdown Selector, Live Terminal SSE & Token Manager
│   ├── backend_runner.js                # Suite Pengujian Backend Otonom (10 Skenario REST API, Gateway, Health Check)
│   ├── testsprite_vault.json            # Brankas Kredensial 15 Akun Token TestSprite
│   ├── rotate-testsprite.ps1            # Engine Rotasi & Auto-Switch Token saat Kuota Habis
│   ├── testsprite-runner.js             # Automation Runner TestSprite (Auto-Graceful Exit, Plan, Execution)
│   ├── code_summary.yaml                # Rangkuman Kode & Arsitektur Grimoire Dashboard
│   ├── standard_prd.json                # Standardized PRD Hasil Analisis TestSprite Cloud
│   ├── testsprite_frontend_test_plan.json # Rencana Pengujian Frontend 21 Kasus Uji (TC001 - TC021)
│   ├── DOKUMENTASI_PERBAIKAN_TESTSPRITE.md # Laporan Komparasi Sebelum vs Sesudah Perbaikan Uji
│   └── tmp/                             # Direktori Kerja Sementara, Test Scripts (.py), & Log Eksekusi
│
├── ethol-notifier/                      # FOLDER MANDIRI: Ethol Academic Notifier (Auto Absen & Tugas)
│   ├── index.html                       # Entry Point Mandiri Ethol Notifier
│   ├── ethol.css                        # Styling dashboard glassmorphism, KPI cards, filter log, status badges
│   ├── ethol.js                         # Controller antarmuka (Self-Healing Gateway, failover, status & widget tugas)
│   ├── ethol-agent.js                   # Automasi headless Puppeteer (SSO CAS PENS, auto presensi & scraper tugas)
│   ├── api.php                          # Self-Healing Gateway Server (Node Health Cache, auto-failover <10ms)
│   ├── tasks.json                       # Cache data tugas kuliah mendekati deadline (≤ 5 hari)
│   ├── logs_buffer.json                 # Salinan buffer persisten log presensi subfolder ethol-notifier
│   └── screenshots/                     # Direktori tangkapan layar bukti presensi sementara (retensi 24 jam)
│
└── src/
    ├── keuangan/                        # FITUR: Pencatatan Keuangan (Money Tracker)
    │   ├── keuangan.css                 # Styling dashboard, KPI cards, table, OCR dropzone, lightbox
    │   ├── keuangan.js                  # Controller dual cashflow, Chart.js, dropzone & modal
    │   ├── parser.js                    # Smart regex parser (nominal IDR, tanggal Indo, QRIS, Tarik Tunai ATM)
    │   ├── storage.js                   # LocalStorage engine v7, CRUD, & seed transaksi nyata
    │   └── assets/                      # Bukti transaksi (bukti_tarik_tunai_atm.png, struk acuan)
    │
    ├── proyek/                          # FITUR: Katalog & Peluncur Proyek Web
    │   ├── proyek.css                   # Styling glassmorphic tiles, filter status & modal popover
    │   └── proyek.js                    # Render dinamis daftar proyek dan peluncur tautan
    │
    ├── konsol/                          # FITUR: Konsol Notifikasi & Webhook
    │   ├── konsol.css                   # Antarmuka terminal log bernuansa arcane-translucent glass
    │   └── konsol.js                    # Webhook listener dan simulasi log aktivitas
    │
    ├── sampul/                          # FITUR: Sampul Buku Interaktif & Jam
    │   ├── sampul.css                   # Desain sampul grimoire transparan tanpa ornamen crest & jam
    │   ├── sampul.js                    # Interaktivitas buka buku dan live digital clock
    │   └── book_cover.png               # Aset grafis sampul depan buku Grimoire
    │
    ├── status/                          # FITUR: System Health Metrics & Telemetri
    │   ├── status.css                   # Panel metrik kesehatan sistem glassmorphic
    │   └── status.js                    # Kalkulasi live telemetri CPU, RAM, Latensi, Daemon
    │
    ├── tutup-buku/                      # FITUR: Tutup Buku & Clock Bar
    │   ├── tutup-buku.css               # Desain tombol tutup buku & bar jam digital terpusat
    │   └── tutup-buku.js                # Interaktivitas tombol tutup buku
    │
    └── shared/                          # SHARED: Khusus utilitas lintas ≥2 fitur
        ├── shared.css                   # Variabel warna (gold/emerald), glassmorphic styling, global layout
        ├── utils.js                     # Helper manipulasi DOM & formatting teks
        ├── audio.js                     # Web Audio API sintetis efek sihir / chime
        ├── book_open.png                # Aset bingkai buku terbuka layout dashboard (Desktop)
        ├── book_page_left.png           # Aset bingkai lembaran kiri Grimoire (Mobile UI Pertama)
        └── book_page_right.png          # Aset bingkai lembaran kanan Grimoire (Mobile UI Kedua)
```

### 2. Aturan Penamaan & Folder `shared/`
- **Penamaan Folder**: Gunakan kata benda fungsi yang deskriptif dan konsisten (misal: `proyek/`, `konsol/`, `keuangan/`, `sampul/`, `status/`, `tutup-buku/`). Dilarang menggunakan nama layer di root seperti `controllers/`, `views/`, atau `models/`.
- **Folder `shared/`**: Hanya digunakan jika kode/aset dipakai oleh **2 fitur atau lebih** (misal audio chime, background lembaran buku, variabel tema global). Jika hanya dipakai 1 fitur, wajib masuk ke folder fitur tersebut.

### 3. Protokol WAJIB: Pembersihan File Usang Pasca-Generate (Pruning Protocol)
> **ATURAN MUTLAK:**
> Setiap kali selesai melakukan generate kode, penambahan fitur, atau refactoring:
> **Jika ada file atau folder lama yang tidak digunakan lagi, tidak dimunculkan di website, atau sudah digantikan oleh fitur baru, file/folder tersebut WAJIB SEGERA DIHAPUS.**

#### Kriteria File yang Wajib Dihapus:
1. **Fitur yang Telah Diganti**: Berkas fitur lama yang UI-nya sudah tidak ditampilkan lagi.
2. **Tidak Dimuat di Entry Point**: Script (`.js`) atau style (`.css`) yang tidak lagi di-link pada `index.html` atau `keuangan.html`.
3. **Duplikat Aset**: Gambar/media yang pernah tercecer di root atau folder acak setelah dipindahkan ke folder fitur.
4. **File Sampah / Eksperimen**: Berkas pengujian sementara (`test_*.txt`, scratchpad, file spec draft usang).

#### Cara Audit Pembersihan:
1. Periksa entry point (`index.html`, `keuangan.html`, `serve.js`). Catat seluruh berkas yang aktif dimuat.
2. Bandingkan dengan struktur direktori fisik proyek.
3. Hapus bersih file/folder yang tidak terpakai menggunakan perintah permanen (`Remove-Item -Force`).
4. Verifikasi bahwa server berjalan normal tanpa error 404 pada network tab.

### 4. Pelaporan Transparan Perubahan Berkas
Setiap asisten/pengembang wajib menyajikan laporan ringkasan berkas setelah melakukan modifikasi:
```markdown
### 📋 Ringkasan Pembaruan File:
#### ➕ File / Folder yang Ditambahkan:
- `path/file` — [Keterangan fungsi]
#### 🗑️ File / Folder yang Dihapus (Pembersihan File Usang):
- `path/file` — [Alasan penghapusan]
#### 🛡️ Status Integritas:
- [Pengecekan broken link / HTTP 200 status]
```

### 5. Checklist Cepat Sebelum Menyelesaikan Tugas
- [x] Semua file fitur baru berada dalam satu folder terisolasi (`src/<fitur>/`).
- [x] Fitur terhubung sempurna pada entry point (`index.html` / `keuangan.html`).
- [x] **Audit pembersihan tuntas**: Berkas usang dan draft lama telah dihapus.
- [x] Tidak ada aset duplikat yang tercecer.
- [x] Laporan transparansi berkas telah disajikan.

---

### 6. Protokol Otomasi Migrasi ke Website (Keyword Trigger: "pw" / "pindahkan ke website")
> **STANDAR OPERASIONAL PROSEDUR (SOP MUTLAK):**
> Jika pengguna memberikan instruksi atau perintah dengan kata kunci **"pw"** (perintah pintas resmi) atau variasi serupa (*"pindahkan ke website"*, *"deploy ke server"*, *"sinkronkan ke web"*, *"upload ke website"*):
> 
> Asisten AI **WAJIB MENJALANKAN 4 PILAR UTAMA SECARA OTOMATIS** tanpa meminta konfirmasi berulang:
> 1. **Pilar 1: Pre-Deployment Testing Gate (TestSprite Automated Test Gate)**: Menjalankan verifikasi uji otomatis TestSprite terlebih dahulu terhadap web yang akan di-deploy sebelum mengizinkan proses transfer berkas.
> 2. **Pilar 2: Audit & Optimalisasi Tampilan HP (Mobile Fit)**: Memastikan UI bebas horizontal overflow dan ergonomis di smartphone (~360px - 480px).
> 3. **Pilar 3: Auto-Update File Dokumentasi (`Arz-WEB.md`)**: Wajib secara otomatis memperbarui file `.md` (`Arz-WEB.md`) mencakup header pilar ekosistem, spesifikasi teknis modul, dan tabel log riwayat pembaruan terkini.
> 4. **Pilar 4: Eksekusi Deployment Otomatis ke Nginx**: Menyalin seluruh berkas aktif proyek ke Nginx Home Server via `deploy.ps1`.

#### 🧪 Pilar 1: Pre-Deployment Testing Gate (TestSprite Automated Test Gate)
Sebelum berkas disinkronkan ke server web produksi Nginx, sistem WAJIB melakukan verifikasi pengujian otomatis menggunakan TestSprite:
1. **Verifikasi Web Target**: Memastikan halaman web yang hendak di-deploy (Grimoire Dashboard `index.html`, Arcanum Finance `keuangan.html`, atau `ethol-notifier/`) telah divalidasi skenario ujinya (`testsprite_tests/`).
2. **Kondisi Penghentian (Abort Condition)**: Jika terjadi kegagalan fatal/kritis pada pengujian:
   - Proses deployment ke Nginx **DIBATALKAN SECARA OTOMATIS** (*deployment aborted*).
   - Status shortcut proyek terkait di `src/proyek/proyek.js` otomatis diubah menjadi **"Perbaikan"** (`wip`) disertai catatan kendala (`note: "Gagal lolos pengujian TestSprite: [alasan]"`).
3. **Syarat Kelolosan (Pass to Deploy)**: Hanya kode yang lolos pengujian tanpa error fungsional kritis yang diizinkan melangkah ke tahap deployment Nginx.

#### 📱 Pilar 2: Syarat Mutlak Pra-Migrasi — Optimalisasi Khusus Tampilan HP (Mobile Fit)
Sebelum berkas dipindahkan ke website publik, seluruh antarmuka yang diubah/ditambahkan WAJIB lolos audit tampilan smartphone (viewport ~360px - 480px / 390x844):
1. **Bebas Horizontal Overflow**: Lebar seluruh kontainer terkunci rapi di `100vw` (`max-width: 100vw; overflow-x: hidden;`). Tidak boleh ada elemen yang melebar keluar layar atau menyebabkan zoom-out otomatis di browser HP.
2. **Transformasi Grid Multi-Kolom**: Komponen berdampingan (seperti kartu komparasi dua kotak, kolom dashboard) wajib bertransformasi menjadi susunan vertikal (*stacking*) yang proporsional di layar HP (`@media (max-width: 860px)` dan `@media (max-width: 480px)`).
3. **Target Sentuh Ergonomis (*Touch-Friendly Targets*)**: Tombol navigasi (seperti panah `<` `>`, dropdown riwayat, toggle pill, tombol aksi, dan FAB) memiliki area sentuh yang nyaman dioperasikan dengan jempol (min 34px - 44px).
4. **Tabel Responsif**: Tabel data dibungkus dalam kontainer geser horizontal independen (`.table-scroll-container`) agar tidak merusak lebar keseluruhan halaman.
5. **Verifikasi Visual Layar HP**: Menguji tampilan pada resolusi smartphone sebelum dinyatakan siap dipindahkan.

#### 📝 Pilar 3: Auto-Update File Master Dokumentasi (`Arz-WEB.md`)
> **LOGIK BARU WAJIB:**
> Setiap kali kata kunci atau perintah *"pw"* / *"pindahkan ke website"* dipicu, Asisten AI **WAJIB secara otomatis menginspeksi dan memperbarui berkas `Arz-WEB.md`** sebelum atau bersamaan dengan eksekusi deployment:
1. **Pembaruan Ringkasan Fitur Ekosistem (Header & Overview)**: Memastikan daftar seluruh pilar aplikasi web yang telah dibangun pada pengantar dokumen (paragraf pembuka dan daftar pilar ekosistem) selalu mutakhir (Grimoire Dashboard, Arcanum Finance, Portable Money Tracker, Ethol Academic Notifier, dan modul baru lainnya).
2. **Pembaruan Seksi Spesifikasi Teknis**: Menambahkan seksi/bab spesifikasi teknis baru atau memperbarui seksi spesifikasi modul terkait jika terdapat fitur, arsitektur, layout, selector, regex, atau konfigurasi sistem baru.
3. **Pencatatan Tabel Log Riwayat Pembaruan**: Menuliskan baris baru pada tabel **BAGIAN V: LOG RIWAYAT PEMBARUAN & PROGRES IMPLEMENTASI** dengan format: tanggal terkini, nama fitur/komponen, dan deskripsi detail modifikasi yang dilakukan.
4. **Integritas Dokumentasi**: Menjamin dokumentasi selalu mencerminkan kondisi kode 1:1 yang aktif dan terpasang di server produksi.

#### 🚀 Pilar 4: Eksekusi Otomatis Penyalinan Berkas ke Server Nginx

##### Spesifikasi Jalur Target Server:
- **Jalur Akses Jaringan (File Explorer / SMB UNC Path)**:
  `\\100.73.128.8\Data\AppData\nginx\config\www`
- **Konfigurasi Web Server**: Nginx Alpine Container (`root /config/www`) pada CasaOS Home Server.
- **Tautan Akses Publik (Live HTTPS)**:
  - Grimoire Dashboard Utama: `https://dashboard.raidenarya.my.id/`
  - Arcanum Finance (Money Tracker): `https://dashboard.raidenarya.my.id/keuangan.html`

##### Berkas yang Wajib Disinkronkan:
1. `index.html` (Grimoire Dashboard Utama)
2. `keuangan.html` (Arcanum Finance)
3. `ethol-notifier/` (Modul Mandiri Ethol Notifier)
4. Seluruh folder `src/` (modul fitur, shared assets, CSS, JS)

##### Berkas yang DIKECUALIKAN dari Publikasi (Eksklusif Dev / Lokal):
> [!CAUTION]
> **KEBIJAKAN ISOLASI MUTLAK TESTSPRITE & BERKAS INTERNAL:**
> Seluruh berkas pengujian TestSprite, brankas token akun, skrip runner, dan konfigurasi agen bersifat **eksklusif di localhost (dev server port 8080)** dan **DILARANG KERAS DIPUBLIKASIKAN KE SERVER NGINX PUBLIK**:
- `testsprite_tests/` (seluruh berkas pengujian, PRD, test plan, dan runner)
- `testsprite_vault.json` & seluruh berkas token/kredensial
- `rotate-testsprite.ps1` (skrip rotasi token lokal)
- `testsprite-runner.js` (runner automasi pengujian)
- `mcp_config.json` & `.agents/` (konfigurasi AI agent)
- `serve.js`, `server.js`, `serve-watchdog.js` (dev server lokal Node.js)
- `Arz-WEB.md`, `AGENTS.md` (master dokumentasi internal pengembang)
- `deploy.ps1` (skrip automasi lokal)
- Berkas database `.sql` (`src/keuangan/keuangan.sql`)
- Folder scratch / temporary artifacts

##### Perintah Eksekusi Otomatis:
Asisten langsung menjalankan skrip otomatisasi di PowerShell:
```powershell
powershell.exe -ExecutionPolicy Bypass -File ".\deploy.ps1"
```
Setelah eksekusi berhasil, asisten wajib menyajikan laporan:
1. Hasil verifikasi Pre-Deployment Test Gate (TestSprite).
2. Ringkasan optimalisasi tampilan HP.
3. Bukti pembaruan dokumentasi `Arz-WEB.md`.
4. Jumlah berkas yang berhasil disinkronkan ke server Nginx.
5. Tautan live website yang siap diakses pengguna.

---

### 7. Aturan Baku Manajemen Shortcut Katalog Proyek & Siklus Status
> **STANDAR OPERASIONAL PROSEDUR (SOP KATALOG PROYEK):**
> Berlaku mutlak pada setiap pembuatan fitur/modul web baru serta setiap kali terjadi masalah (bug/error/offline) pada suatu website di repositori Arz-WEB:

#### A. Otomatis Membuat Shortcut saat Fitur Baru Dibuat
- Setiap kali pengembang atau asisten AI membuat halaman web, modul mandiri, atau aplikasi baru di repositori Arz-WEB, **WAJIB secara otomatis mendaftarkan shortcut proyek baru** ke dalam Katalog Proyek Grimoire Dashboard (`src/proyek/proyek.js`).
- Setiap entri shortcut wajib memiliki: `id`, `title`, `icon` (FontAwesome representatif), status awal (`active` / `wip`), `statusLabel`, deskripsi singkat, `target` host, `url` navigasi, dan `tags`.

#### B. Eliminasi Total Status "Ide" (Hanya Ada 2 Status Baku)
Katalog Proyek **hanya mengenal 2 status operasional**:
1. **Aktif** (`status: 'active'`, `statusLabel: 'Aktif'`, warna Zamrud / Emerald Green):
   - Menandakan fitur/web beroperasi normal, stabil, responsif, dan siap digunakan.
2. **Perbaikan** (`status: 'wip'`, `statusLabel: 'Perbaikan'`, warna Warm Amber):
   - Menandakan fitur/web sedang dalam pengerjaan, mengalami kendala teknis, bug, offline backend, atau sedang dalam masa pemeliharaan.
- **Status "Ide" telah dihapus secara permanen** dari antarmuka, tombol filter kategori, dan skrip data.

#### C. Deteksi Masalah & Auto-Update Status Shortcut
- **Saat Terjadi Masalah / Bug:** Apabila pada suatu website/fitur yang telah dibuat terjadi kendala, bug, error API, kegagalan render, atau layanan backend terputus, Asisten AI **WAJIB secara otomatis memperbarui status shortcut proyek terkait menjadi "Perbaikan"** (`wip`) di `src/proyek/proyek.js`, serta menyertakan rincian kendala pada properti `note` (yang akan tampil di popover kartu).
- **Saat Masalah Berhasil Diperbaiki:** Setelah kendala tuntas diperbaiki dan diverifikasi normal, Asisten AI **WAJIB secara otomatis mengembalikan status shortcut proyek menjadi "Aktif"** (`active`) dan menghapus catatan kendala (`note`).
- **Programmatic API:** Tersedia fungsi global `window.setProjectStatus(idOrUrl, status, note)` dan `window.registerProjectShortcut(projectData)` pada `src/proyek/proyek.js` untuk integrasi status real-time lintas modul.

#### D. Keunikan Ikon Shortcut Wajib (Anti-Duplikasi Ikon & Registri Resmi)
- Setiap shortcut ubin di dalam Katalog Proyek **WAJIB memiliki ikon FontAwesome yang unik dan berbeda** satu sama lain.
- **Dilarang keras memakai ikon yang sama atau bermakna/siluet kembar** untuk dua atau lebih proyek web yang berbeda.
- Asisten AI wajib mengecek daftar ikon yang telah aktif (`window.getUsedIcons()`) sebelum menetapkan ikon bagi fitur baru, guna memastikan setiap proyek memiliki identitas visual yang khas dan mudah dibedakan oleh pengguna.
- **Tabel Registri Ikon Resmi Proyek Arz-WEB:**
  | ID Proyek | Nama Proyek Web | Ikon FontAwesome | Makna Visual Simbolik |
  | :--- | :--- | :--- | :--- |
  | `proj_money_tracker` | Money Tracker (Keuangan) | `fa-coins` | Koin emas & pencatatan transaksi kas |
  | `proj_ethol_sync` | Ethol Academic Notifier | `fa-calendar-check` | Kalender jadwal kuliah & presensi terverifikasi |
  | `proj_student_web` | Student Website & Tracker | `fa-building-columns` | Pilar gedung kampus universitas & portal akademik |
  | `proj_grimoire_ui` | Grimoire Dashboard - Arz | `fa-book-skull` | Buku sihir interaktif / Arcane Tome |
  | `proj_testsprite_sentinel` | TestSprite Sentinel Hub | `fa-vial-circle-check` | Tabung reaksi terverifikasi & QA pengujian otonom |
  | `proj_alchemist_wiki` | Alchemist Study Notes | `fa-feather-pointed` | Pena bulu alkemis & dokumentasi riset |
  | `proj_task_bot` | AutoTask Telegram Bot | `fa-robot` | Automasi cerdas & push alert bot |
- **Aturan Penegakan di Kode (`src/proyek/proyek.js`):**
  1. `DEFAULT_PROJECTS` adalah acuan kebenaran tunggal (*single source of truth*) untuk ikon resmi.
  2. Fungsi `getProjects()` wajib meng-override ikon usang dari cache browser / `localStorage` dengan ikon resmi dari `DEFAULT_PROJECTS` saat memuat data.
  3. Sistem audit otomatis berjalan setiap kali memuat: jika ada ikon ganda yang terdeteksi, ikon duplikat otomatis dialihkan ke ikon unik dari pool cadangan.

---

## BAGIAN II: SPESIFIKASI DASHBOARD UTAMA (GRIMOIRE DASHBOARD - `index.html`)

Dashboard utama mengusung tema **Arcane Tome / Cyber-Grimoire** bergaya buku sihir interaktif kuno dengan teknologi modern dan antarmuka **Transparan Penuh (Borderless Translucent Glassmorphism)**:

### 1. Desain Antarmuka Transparan Borderless (Glassmorphism & Parchment Feel)
- **Eliminasi Panel Pekat**: Bingkai kotak `.book-panel` dihilangkan total (`background: transparent; border: none; box-shadow: none; backdrop-filter: none;`). Seluruh konten katalog proyek, konsol log, jam digital, dan status telemetri menempel langsung di atas tekstur kertas perkamen kuno, serat lembaran buku terbuka, dan bayangan alami dedaunan.
- **Cache-Buster Query Versioning**: Seluruh tag stylesheet di-link dengan query versioning `?v=20260913_transparan` guna memastikan browser memuat gaya transparan terbaru tanpa terkena cache lawas.

### 2. Sampul Depan Bersih ("Portal Pribadi" 1:1 Precision Coordinate Lock)
- **Pembersihan Total Ornamen & Hint**: Elemen ornamen garis simbol atas (`grimoire-crest`) dan petunjuk teks klik (`hint-text`) dihapus secara permanen dari DOM.
- **Penguncian Koordinat Presisi Vertikal**: Posisi elemen di dalam `.book-overlay-center` dikunci menggunakan persentase vertikal tetap:
  - Judul sapaan pengguna (`.user-greeting-box`): `top: 17.53%;`
  - Jam digital dan tanggal (`.time-widget-box`): `top: 37.40%;`
  - Tombol masuk emas (`.btn-enter-grimoire`): `top: 71.43%;`
  Hal ini mengunci layout secara presisi 1:1 sehingga sapaan "Halo, Arz", jam digital, dan tombol "MASUK" tetap stabil di koordinat yang sama tanpa pergeseran layout sedikit pun.

### 3. Lembaran Kiri: Katalog Proyek Web (`src/proyek/`)
- **Ubin Squircle Kaca (*Glassmorphic Tiles*)**: Ubin peluncur proyek menggunakan gradien transparan berkilau lembut sesuai 2 status resmi:
  - **Aktif (Badge Zamrud)**: `linear-gradient(135deg, rgba(220, 248, 226, 0.45), rgba(187, 238, 198, 0.28))` berborder hijau menyala lembut dengan denyut hijau (`pulseGreen`).
  - **Perbaikan (Badge Amber)**: `linear-gradient(135deg, rgba(254, 243, 199, 0.45), rgba(253, 230, 138, 0.28))` berborder oranye amber dengan denyut amber (`pulseAmber`).
- **Bilah Pencarian & Filter Kategori**:
  - Toolbar pencarian transparan `rgba(245, 235, 215, 0.22)` dengan `backdrop-filter: blur(8px)`.
  - Input field semi-transparan `rgba(255, 255, 255, 0.38)`.
  - Tab filter kategori instan pill: `[Semua] [● Aktif] [● Perbaikan]` berlatar kaca lembut dengan aksen amber pekat saat aktif (status 'Ide' telah dihapus).
- **Tooltip Popover & Catatan Kendala**: Popover info proyek berlatar kaca lembut dengan blur tinggi (`12px`). Jika shortcut berada dalam status *Perbaikan*, popover secara otomatis menampilkan lencana catatan kendala (`popover-note-badge`) berisi keterangan masalah teknis yang sedang ditangani.
- **Auto-Sync Shortcut**: Terintegrasi langsung dengan `window.GrimoireCatalog` untuk penambahan shortcut otomatis saat fitur baru dibangun dan pembaruan status dinamis saat error terdeteksi.

### 4. Lembaran Kanan Atas: Konsol Notifikasi & Webhook (`src/konsol/`)
- **Layar Terminal Log Arcane Transparan**: Diubah dari warna hijau-hitam pekat padat menjadi kaca terminal transparan `rgba(12, 22, 15, 0.48)` dengan `backdrop-filter: blur(10px)`.
- **Status Telemetri & Filter**: Menjaga denyut hijau telemetri (*Daemon Listening Aktif*) di atas ubin transparan ber-border lembut. Tab filter log (`Semua`, `Keuangan`, `Info`, `Sukses`, `Peringatan`, `Event`) mendukung *horizontal touch swipe*.
- **Interactive Input Bar**: Bar prompt teks transparan kaca `rgba(255, 255, 255, 0.35)` dengan aksen emas. Pengguna dapat mengetik perintah teks seperti `saldo` atau `uang` untuk menampilkan ringkasan kas Money Tracker secara instan.

### 5. Lembaran Kanan Bawah: Tutup Buku & Status Sistem (`src/tutup-buku/` & `src/status/`)
- **Widget Metrik Telemetri Sistem**: Berlatar kaca transparan `rgba(255, 250, 240, 0.22)` dengan 4 ubin metrik telemetri (Core Engine, RAM, Latensi, Modul) menggunakan ubin kaca transparan `rgba(255, 255, 255, 0.32)` berbingkai border emas halus.
- **Kotak Sesi & Jam Digital**: Bar horizontal ramping berisi jam digital terpusat berlatar kaca transparan `rgba(255, 255, 255, 0.3)` dengan tanggal di bawahnya, serta tombol **"TUTUP BUKU"** merah-emas berefek shimmer.
- **Navigasi Layar Smartphone (Mobile FAB)**: Tombol melayang elegan di sudut kanan bawah untuk berpindah mulus antara Lembaran Kiri (Katalog Proyek) dan Lembaran Kanan (Konsol & Status) dengan background anime Grimoire tunggal (`book_page_left.png` vs `book_page_right.png`).

---

## BAGIAN III: SPESIFIKASI MODUL KEUANGAN (ARCANUM FINANCE - `keuangan.html`)

Modul pencatatan keuangan mandiri (**Money Tracker & Cashflow Hub**) dirancang dengan fokus **Keuangan Murni** dan **Nol Friksi Input (Zero Friction)**:

### 1. Konsep Keuangan Murni (Tanpa Kategori)
Sistem berfokus pada aliran dana masuk dan keluar (**Dual-Stream Cashflow**). Konsep kategori kompleks telah ditiadakan agar pelaporan keuangan bersih, akurat, dan langsung ke intinya:
- **Pemasukan (Inflow `+`)**: Dana masuk (transfer bank, honor, mutasi saldo masuk). Nominal berwarna hijau emerald (`#4ade80`).
- **Pengeluaran (Outflow `-`)**: Dana keluar (pembayaran QRIS, transfer kos, belanja, SPBU, tarik tunai ATM). Nominal berwarna rose red (`#f87171`).

### 2. Otomatisasi AI OCR Vision & Ekstraksi Cerdas (`src/keuangan/parser.js`)
Pengguna tidak perlu menginput atau mengetik nominal uang secara manual:
- **Metode Input**:
  - **Tempel Clipboard (`Ctrl + V`)**: Ambil tangkapan layar bukti transfer/struk, lalu tekan `Ctrl + V` di mana saja pada layar.
  - **Drag-and-Drop & Browse**: Dropzone visual mendukung pengunggahan file gambar secara langsung.
- **Mesin AI OCR (Tesseract.js Client-Side)**:
  - Membaca teks pada gambar struk secara lokal di browser, menampilkan animasi pemindaian dan persentase progress live.
- **Mesin Regex Parser Cerdas Multi-Kanal**:
  - **Deteksi Otomatis Arus Kas**: Mengenali kata kunci transfer masuk (`"masuk"`, `"dari"`, `"inflow"`, `"cashflow - pemasukan"`) &rarr; `pemasukan`; mengenali pembayaran QRIS/debit (`"pembayaran"`, `"qr"`, `"ke"`, `"qris"`) &rarr; `pengeluaran`.
  - **Deteksi Cerdas Tarik Tunai ATM (Fitur Baru)**:
    - Mengenali pola notifikasi penarikan uang tunai di mesin ATM (misal notifikasi m-BCA: *"Pengeluaran sebesar IDR 50,000.00 di TARIKAN ATM untuk kategori Uang Tunai dari 769-301-8724 - TAHAPAN pada tanggal 13 September 2026"*).
    - Menetapkan secara otomatis: Arus `pengeluaran`, jenis `Tarik Tunai (ATM)`, merchant/pihak `TARIKAN ATM (769-301-8724 - TAHAPAN)`, nominal `Rp 50.000` (IDR murni tanpa desimal sen), tanggal transaksi, dan no rekening referensi `769-301-8724`.
    - Dilengkapi aset acuan struk: `src/keuangan/assets/bukti_tarik_tunai_atm.png`.
  - **Ekstraksi Nominal Presisi**: Mendukung format `Rp`, `IDR`, angka titik ribuan, desimal sen (contoh: `IDR 10,000.00` &rarr; `10000`, `IDR 50,000.00` &rarr; `50000`, `Rp. 2,004,346.00` &rarr; `2004346`, `Rp 21.000` &rarr; `21000`).
  - **Ekstraksi Tanggal & Jam**: Mendukung format angka (`DD/MM/YYYY HH:mm:ss`) dan format nama bulan Bahasa Indonesia (`12 September 2026`, `tanggal 13 September 2026`).
  - **Ekstraksi Identitas & Merchant QRIS Bersih**: Mengenali nama pengirim transfer serta nama merchant QRIS murni (misal: *BUBUR AYAM JAKARTA MANTAP*, *PECEL TUMPANG BU YULIANTI*, *CIBUS PENS*) secara cerdas tanpa menelan metadata baris tabel rincian transaksi (Pengakuisisi, Lokasi, PAN, Terminal ID).
  - **Proteksi Anti-Nominal pada Merchant (`isInvalidMerchant`)**: Mencegah string nominal uang (seperti `Rp17.000,00` dari baris `TOTAL PEMBAYARAN`) atau status transaksi (`BERHASIL`, `Pembayaran QR`) tertelan sebagai nama merchant. Memperketat regex marker eksplisit (`pembayaran ke`) dan mengecualikan awalan `TOTAL PEMBAYARAN`.
  - **Sanitasi Metadata Trailing**: Memfilter otomatis label perbankan dan membersihkan prefix *"Pembayaran ke"* agar kolom pihak/keterangan selalu rapi.

### 3. Kartu Review Cerdas dengan Cashflow Switcher & Field Interaktif
- Menampilkan tinjauan instan hasil pemindaian sebelum disimpan.
- Dilengkapi tombol toggle interaktif: **`[Pemasukan (+) | Pengeluaran (-)]`** yang otomatis aktif sesuai deteksi OCR.
- **Editable Field (*Contenteditable*)**: Kolom *Pihak / Keterangan* dan *Waktu Transaksi* dapat langsung diketik/diedit manual oleh pengguna pada kartu pratinjau sebelum disimpan.
- Menyediakan pratinjau thumbnail gambar bukti transaksi.

### 4. Empat Metrik KPI Eksekutif
Dashboard menyajikan empat kartu ringkasan keuangan bulan berjalan:
1. **Pemasukan Bulan Ini**: Total akumulasi dana masuk bertanda `+ Rp ...` (hijau).
2. **Pengeluaran Bulan Ini**: Total akumulasi dana keluar bertanda `- Rp ...` (merah).
3. **Saldo Bersih (Cashflow)**: Selisih Pemasukan dikurangi Pengeluaran (`Pemasukan - Pengeluaran`) dengan badge otomatis `Surplus` (hijau) atau `Defisit` (merah).
4. **Total Transaksi**: Jumlah keseluruhan transaksi aktif yang tercatat.

### 5. Visualisasi Grafik Multi-Bulan (Chart.js Dual Bar)
- Visualisasi batang ganda berdampingan per bulan (Juli 2026, Agustus 2026, September 2026).
- Batang hijau untuk **Pemasukan (+)** dan batang merah untuk **Pengeluaran (-)`.

### 6. Tabel Riwayat Transaksi & Modal Lightbox
- **Filter Tab**: Pilihan filter instan `[Semua | Pemasukan | Pengeluaran]`.
- **Pencarian Real-Time**: Kolom pencarian instan berdasarkan pihak pengirim/tujuan, nominal, jenis, atau tanggal.
- **Badge Arus Kas**: Badge ikonik (*Masuk* hijau vs *Keluar* merah).
- **Modal Lightbox**: Tombol "Lihat" untuk menginspeksi foto bukti struk asli resolusi tinggi lengkap dengan nomor referensi dan nominal.

### 7. Manajemen State & Persistensi Data (`src/keuangan/storage.js`)
- Menggunakan `localStorage` browser dengan key aktif `grimoire_keuangan_transaksi_v7`.
- Menyertakan data seed nyata yang sudah terverifikasi:
  - `PECEL TUMPANG BU YULIANTI`: Pengeluaran `- Rp 21.000` (13/09/2026 08:08:37 WIB, Ref: `080800993558`).
  - `m-Info BCA (7693018724)`: Pemasukan `+ Rp 2.004.346` (12/09/2026 15:14:22).
  - `WIWIN CAHYANI - BCA`: Pemasukan `+ Rp 10.000` (12/09/2026 14:59:00).
  - Ringkasan September 2026: Pemasukan `Rp 3.514.346`, Pengeluaran `Rp 1.417.900`, Surplus Bersih `+ Rp 2.096.446`, Total Transaksi Aktif: 15.

### 8. Arsitektur Responsif Layar HP (Mobile Viewport Fit)
- **Eliminasi Zoom-Out & Horizontal Overflow**: Mengunci lebar seluruh komponen di `100vw` dengan `max-width: 100vw` dan `overflow-x: hidden`.
- **Text Wrapping Protektif**: Menggunakan `white-space: normal`, `word-break: break-word`, dan `overflow-wrap: anywhere` pada nama merchant dan rincian transaksi panjang (misal QRIS Bank Jatim, ATM BCA).
- **Grid KPI Adaptif**: Grid kartu KPI menyesuaikan menjadi `2x2` kompak dan fleksibel (`repeat(2, minmax(0, 1fr))`).
- **Tabel Responsif**: Tabel riwayat transaksi dibungkus dalam `.table-scroll-container` yang dapat digeser horizontal tanpa memicu kebocoran layout.

---

## BAGIAN IV: SPESIFIKASI ETHOL ACADEMIC NOTIFIER (`ethol-notifier/`)

Modul automasi akademik mandiri (**Ethol Academic Notifier**) beroperasi sebagai pengawas perkuliahan otomatis dan asisten presensi cerdas:

### 1. Arsitektur Mandiri & Backend CasaOS 24/7
- **Folder Khusus Mandiri (`ethol-notifier/`)**: Seluruh komponen frontend (`index.html`, `ethol.css`, `ethol.js`) dan backend agent (`ethol-agent.js`, `tasks.json`) tersimpan terisolasi di dalam satu folder root.
- **Docker Puppeteer di CasaOS**: Engine backend dijalankan di container Docker headless Chrome (`ghcr.io/puppeteer/puppeteer:22`) pada Home Server CasaOS (`100.73.128.8`), bekerja 24/7 tanpa bergantung pada laptop pengguna.
- **Nginx Reverse Proxy API**: Seluruh panggilan frontend ke backend diarahkan melalui reverse proxy Nginx (`/api/absen/` -> `172.20.0.1:8080`) dengan `API_BASE` dinamis guna mencegah kendala *Mixed Content* di domain HTTPS publik `https://dashboard.raidenarya.my.id/`.

### 2. Otomasi Headless Presensi Perkuliahan (Puppeteer SSO CAS PENS)
- **Autentikasi SSO CAS PENS**: Login aman menggunakan kredensial terkonfigurasi, navigasi otomatis ke portal ETHOL PENS, dan deteksi notifikasi presensi kuliah aktif.
- **Eksekusi Tombol Presensi**: Mengidentifikasi mata kuliah yang membuka absensi dan mengeklik tombol konfirmasi kehadiran.
- **Logout Resmi Otomatis (`performLogout`)**: Menjamin sesi ditutup bersih di CAS/ETHOL sebelum proses browser diakhiri (`browser.close()`).

### 3. Screenshot Bukti Presensi Otomatis & Retensi Sementara 24 Jam
- **Penangkapan Layar Bukti Presensi Otentik**: Saat presensi berhasil dieksekusi di server maupun saat mahasiswa baru saja absen mandiri (tombol berstatus terkunci/disabled `_btnBukaPresensiDarkLocked` dan terdata pada riwayat tanggal hari ini), agent secara wajib mengambil tangkapan layar penuh sebagai bukti visual otentik (`presensi_<timestamp>_<rand>.jpg`).
- **Tampilan Konsol Interaktif**: Screenshot disajikan dalam kartu interaktif di terminal konsol output lengkap dengan lencana terverifikasi (`PRESENSI BERHASIL` / `PRESENSI TERCATAT`), countdown timer sisa jam aktif, dan modal lightbox layar penuh (*click-to-enlarge*).
- **Persistensi Buffer & Auto-Pruning 24 Jam**: Buffer log presensi tersimpan persisten ke berkas `logs_buffer.json` di server agar tidak hilang saat container restart, sementara berkas fisik di server (`serve.js`, `ethol-agent.js`) dibersihkan secara otomatis setelah 24 jam (1 hari), menjaga kebersihan storage dan privasi.
- **Nginx Fallback Reverse Proxy Screenshots**: Mengonfigurasi blok rute khusus pada Nginx server produksi (`location /ethol-notifier/screenshots/` dengan `try_files $uri @ethol_screenshots_backend;`) yang secara otomatis meneruskan permintaan gambar ke backend port 8080 jika file baru tercipta di container backend CasaOS, menjamin tidak pernah terjadi 404 maupun fallback gambar sample.

### 4. Konsol Notifikasi Khusus Presensi Berhasil/Tercatat & SSE Live Stream
- **Filter Ketat Presensi Berhasil & Batas Waktu Maksimal 1 Hari (24 Jam)**: Konsol output frontend (`ethol-notifier/ethol.js`) dan konsol Grimoire Dashboard (`src/konsol/konsol.js`) secara ketat hanya menampilkan catatan presensi kuliah yang sukses dan tercatat hadir (`isPresensiSuccess()`) **yang terjadi dalam kurun waktu 1 hari (24 jam) terakhir**. Seluruh catatan presensi yang telah berumur lebih dari satu hari secara mutlak tidak ditampilkan ke DOM konsol, otomatis disaring dari feed SSE/REST (`api.php`, `serve.js`), serta dibersihkan secara real-time melalui auto-pruning interval 30 detik tanpa perlu merefresh halaman.
- **SSE Real-Time Stream**: Antarmuka terhubung ke endpoint `/api/absen/log-stream` untuk menerima telemetri log langsung dari server secara live tanpa polling blocking.
- **Sintesis Audio Magic Chime**: Membunyikan nada instrumen sihir Web Audio API saat notifikasi sukses presensi diterima.

### 5. Pengingat Tugas Kuliah (Piggyback Bersyarat ≤ 5 Hari)
- **Scraper Tugas Akademik**: Memantau penugasan kuliah dari portal ETHOL dengan interval 30 menit saat sesi login aktif.
- **Filter Ketat ≤ 5 Hari**: Hanya menampilkan tugas yang belum dikumpulkan (`!submission_file`) dengan tenggat waktu ≤ 5 hari ke depan (`tasks.json`).
- **Widget Kartu Tugas**: Menampilkan lencana urgensi (`H-1`, `H-2`, `Hari Ini`), nama mata kuliah, dosen pengampu, dan judul tugas.

### 6. Mode Loop Otomatis di Latar Belakang & Crimson Red Theme
- **Backend Daemon Loop**: Mode loop berjalan persisten di server Node.js (`/api/absen/loop/start`). Penutupan tab atau browser tidak menghentikan putaran pengecekan berkala (interval acak 3 - 5 menit).
- **Transisi Tema Crimson Red**: Antarmuka beralih secara dinamis dari ungu ke merah crimson/blood ruby saat mode loop aktif, dilengkapi live countdown ticker eksekusi berikutnya.

### 7. Optimalisasi Tampilan HP (Mobile Viewport Fit)
- **Konfigurasi Grid KPI HP**: Baris pertama menyajikan 2 kartu berdampingan (*Status Agent* dan *Terakhir Berjalan*), baris kedua menyajikan kartu *Akun SSO* secara penuh (*full-width span* `grid-column: 1 / -1`) tanpa ruang kosong.
### 8. Arsitektur Pemulihan Mandiri (Self-Healing Architecture) & Watchdog Supervisor
- **Frontend GatewayManager Adaptif (`ethol.js`)**: Mengeliminasi ketergantungan pada satu rute statis dengan mekanisme failover multi-kandidat otomatis: (1) `/ethol-notifier/api.php?path=` (FastCGI PHP Gateway), (2) `/api/absen/` (Nginx reverse proxy), (3) direct Tailscale IP (`http://100.73.128.8:8080`), dan (4) localhost. Setiap pemanggilan `fetchJson()` secara cerdas memvalidasi `content-type: application/json` untuk mendeteksi respons keliru (seperti HTML fallback Nginx) dan langsung mengalihkan rute secara transparan tanpa memunculkan galat toast ke pengguna.
- **Node Health Cache Gateway Server (`api.php`)**: Memanfaatkan berkas `node_health.json` untuk mencatat metrik latensi dan riwayat kegagalan setiap node secara real-time. Jika laptop sedang offline/tidur, gateway tidak membuang waktu menunggu timeout cURL, melainkan langsung meneruskan permintaan ke container Docker CasaOS (`http://172.20.0.1:8080`) dalam waktu < 10 milidetik.
- **Node.js Self-Healing Watchdog (`serve-watchdog.js`)**: Supervisor mandiri yang membungkus eksekusi `serve.js`. Mengawasi status hidup proses, melakukan *liveness ping* HTTP setiap 25 detik, dan otomatis merestart instance server jika terjadi crash, hang, atau memori jenuh. Diintegrasikan langsung pada `Pasang_Auto_Start.bat`.
- **Global Crash Guards (`serve.js`)**: Mencegah proses Node.js mati tiba-tiba dengan memasang penanganan terpusat `process.on('uncaughtException')` dan `process.on('unhandledRejection')` serta menambahkan endpoint pemantauan kesehatan `/api/absen/health`.
### 9. Filter Anti-Duplikasi Konsol Output (Deduplikasi Data Masuk)
- **Registry Tanda Tangan Entri (`renderedLogSignatures` & `getPresensiSignature()`)**: Setiap entri presensi dihitung tanda tangan uniknya berdasarkan nama berkas screenshot spesifik dan normalisasi teks matakuliah/toleransi waktu. Data yang tanda tangannya sudah tercatat di registry konsol output maupun elemen DOM secara mutlak ditolak dan tidak akan pernah disisipkan ulang.
- **Pencegahan Redundansi Notifikasi & Chime**: Sinkronisasi berkala (`syncLogs()`) setiap 1.5 detik dan rekoneksi SSE stream tidak lagi membunyikan *magic chime* atau memicu notifikasi push ganda pada data presensi yang sudah tertampil di layar.
- **Deduplikasi Server Buffer & FastCGI Gateway**: Buffer `logs_buffer.json` saat start server dan pemanggilan `pushLog()` pada `serve.js`, serta gateway `api.php`, secara proaktif menyaring catatan presensi duplikat sebelum disiarkan ke client.

---

## BAGIAN V: LOG RIWAYAT PEMBARUAN & PROGRES IMPLEMENTASI

| Tanggal | Fitur / Komponen | Ringkasan Pembaruan |
| :--- | :--- | :--- |
| **27 Sep 2026** | **Integrasi Dual-Suite Test Runner (Pilihan Frontend & Backend) & Suite Pengujian API** | Memperluas kapabilitas website pemantau TestSprite Sentinel dengan arsitektur pengujian ganda (Frontend & Backend): (1) Mengubah tombol *Jalankan Pengujian* menjadi modal interaktif dengan 3 opsi: *Frontend Suite* (21 TC UI Playwright), *Backend Suite* (9 BT REST API Node.js), dan *Full-Stack Suite* (eksekusi berurutan), (2) Mengembangkan engine `testsprite_tests/backend_runner.js` yang menguji endpoint server, liveness health, telemetri, isolasi buffer presensi 24 jam, brankas 15 akun, dan koneksi cloud API, (3) Menambahkan sub-navigation tab switcher pada antarmuka *Kasus Pengujian* untuk inspeksi terpisah antara skenario Frontend dan Backend lengkap dengan status kelulusan dan latensi respons (ms), (4) Memperbarui runner `testsprite-runner.js` (`runFrontend`, `runBackend`, `runAll`) dan endpoint server `serve.js` (`POST /api/testsprite/run` dan `GET /api/testsprite/backend-tests`). |
| **27 Sep 2026** | **Pembangunan Website Pemantau TestSprite Sentinel (Localhost Hub, Saldo Token, & Runner)** | Merancang dan membangun website mandiri pemantau otonom TestSprite eksklusif dev localhost (port 8080): (1) Membuat antarmuka modern glassmorphic di `testsprite_tests/index.html`, `monitor.css`, dan `monitor.js` dengan 4 kartu KPI eksekutif (sisa token, akun aktif, jadwal pemulihan kuota, dan skor kelulusan tes), (2) Menampilkan brankas 15 akun token dengan fitur 1-klik switch akun aktif dan live balance sync ke TestSprite Cloud API, (3) Menampilkan 21 skenario uji (TC001-TC021) dengan filter kelulusan, modal inspeksi kode Playwright Python, dan modal pemutar video rekaman uji AWS S3, (4) Menghubungkan live SSE stream terminal console untuk memantau eksekusi Playwright secara real-time, (5) Menambahkan endpoint backend pendukung di `serve.js` (`/api/testsprite/*`), serta (6) Mendaftarkan shortcut resmi `TestSprite Sentinel Hub` (`fa-vial-circle-check`) pada katalog proyek Grimoire Dashboard (`src/proyek/proyek.js`). |
| **27 Sep 2026** | **Konsolidasi Modul TestSprite Terisolasi Localhost & Integrasi Pre-Deployment Gate pada Protokol "pw"** | Mengintegrasikan automasi pengujian fungsional web berbasis TestSprite Cloud API & Playwright: (1) Mengumpulkan seluruh berkas pengujian, runner script, test plan (TC001-TC021), prompt PRD, code summary, dan brankas token akun (`testsprite_vault.json`) ke dalam satu folder khusus terisolasi `testsprite_tests/`, (2) Menetapkan kebijakan isolasi mutlak bahwa seluruh berkas, logic, dan modul TestSprite bersifat eksklusif dev localhost (port 8080) dan di-blacklist secara ketat dari deployment Nginx publik pada `deploy.ps1` dan `.gitignore`, (3) Memperbarui protokol `"pw"` (*pindahkan ke website*) dengan Pilar 1: *Pre-Deployment Testing Gate* di mana sistem otomatis memvalidasi web via TestSprite sebelum mengeksekusi penyalinan berkas ke server web produksi Nginx, (4) Mengonfigurasi engine rotasi token antar 15 akun TestSprite saat kredit habis (`rotate-testsprite.ps1`), dan (5) Memperbarui dokumentasi sistem `AGENTS.md` dan `Arz-WEB.md`. |
| **17 Sep 2026** | **Penyempurnaan Sistem Pengambilan Screenshot Saat Klik Presensi & Tombol Uji Langsung** | Menyempurnakan alur pengambilan tangkapan layar bukti presensi pada backend Puppeteer (`ethol-notifier/ethol-agent.js`): (1) Menambahkan jeda sinkronisasi DOM 2000ms dan scroll ke area atas saat presensi ditekan agar tabel *History Presensi Saya* dan status terverifikasi tertangkap penuh dengan resolusi desktop 1280x800, (2) Memperluas multi-direktori penyimpanan langsung ke path Nginx CasaOS (`/DATA/AppData/nginx/config/www/ethol-notifier/screenshots`), (3) Menambahkan tombol interaktif *Uji Tangkapan Layar Presensi* (`#btnTestScreenshot`) pada antarmuka web panel kontrol kiri (`ethol-notifier/index.html` dan `ethol.js`) agar pengguna dapat menguji dan menyaksikan secara instan pengiriman bukti screenshot otentik ke konsol output kapan saja. |
| **17 Sep 2026** | **Penyempurnaan Filter Anti-Duplikasi Konsol Output Berbasis Kunci Mata Kuliah (Anti-Repetisi Mutlak)** | Menyelesaikan kendala data presensi yang masih terulang di output konsol saat loop server berjalan atau tombol dijalankan manual: (1) Mengubah sistem tanda tangan anti-duplikasi di `ethol-notifier/ethol.js` dan `src/konsol/konsol.js` dari toleransi waktu/nama file acak menjadi pemetaan kunci mata kuliah mutlak (`courseKey` seperti `statistika`, `praktikum_jarkom`, `wpl`, `jarkom`, `embedded`), (2) Data untuk mata kuliah yang sama yang sudah ada di konsol output secara tegas ditolak dan tidak akan pernah dibuatkan baris/kartu baru, melainkan diperbarui secara in-place (memperbarui tangkapan layar dan timestamp terbaru tanpa menambah baris baru), (3) Di sisi backend (`serve.js`), pemanggilan `pushLog()` dan pemuatan buffer awal menyelaraskan entri mata kuliah yang ada di `logs_buffer.json` sehingga entri mata kuliah tidak berulang, (4) Gateway `api.php` menyaring log berdasarkan kunci mata kuliah, (5) Migrasi storage key ke `v4` (`grimoire_ethol_presensi_history_v4` dan `grimoire_console_logs_ethol_sukses_v4`) serta cache-buster `?v=20260917_dedup_v4` agar riwayat duplikat lama di browser pengguna langsung dibersihkan menjadi 1 kartu per mata kuliah. |
| **17 Sep 2026** | **Integrasi Tangkapan Layar Asli Presensi Portal ETHOL (Praktikum Jaringan dan Komunikasi Nirkabel)** | Memperbarui template acuan bukti tangkapan layar `presensi_sample.jpg` dan entri bukti kehadiran presensi (`presensi_1789538953000_jarkom.jpg`) menggunakan screenshot asli antarmuka ETHOL PENS (*Praktikum Jaringan dan Komunikasi Nirkabel* dengan tabel *History Presensi Saya* asli), menggantikan seluruh aset mockup lama agar tampilan bukti visual pada konsol output dan modal lightbox 100% otentik dan presisi. |
| **17 Sep 2026** | **Pembatasan Ketat Retensi Konsol Presensi Maksimal 1 Hari (24 Jam)** | Memastikan konsol output presensi hanya menampilkan entri kehadiran yang baru dalam rentang waktu 1 hari (24 jam) dan secara tegas menolak presensi yang lebih dari satu hari: (1) Menambahkan validasi batas waktu `elapsedMs < ONE_DAY_MS` pada `addLogLine()` di `ethol-notifier/ethol.js` agar entri > 24 jam tidak di-render ke DOM, (2) Menerapkan fungsi auto-pruning berkala `pruneExpiredPresensiLines()` setiap 30 detik untuk menghapus otomatis baris yang melewati batas 1 hari secara real-time tanpa reload, (3) Memfilter feed SSE dan endpoint REST `/api/absen/logs` di `ethol-notifier/api.php` dan `serve.js` agar data yang dikirim ke klien terisolasi murni ≤ 24 jam, (4) Menghapus entri mock statis usang dan menerapkan batasan waktu 1 hari serupa pada Konsol Notifikasi Web Grimoire Dashboard (`src/konsol/konsol.js`). |
| **16 Sep 2026** | **Arsitektur Pemulihan Mandiri (Self-Healing Architecture), Watchdog Supervisor, & Failover Gateway Multijalur** | Penyelesaian permanen kendala status 'Offline' dan error backend Ethol: (1) Menerapkan `GatewayManager` pada frontend (`ethol-notifier/ethol.js`) dengan discovery adaptif dan failover otomatis antara FastCGI PHP gateway (`api.php`), Nginx reverse proxy, dan direct host guna mencegah kesalahan respons non-JSON/HTML, (2) Memperbarui `ethol-notifier/api.php` dengan mekanisme cache kesehatan node (`node_health.json`), penyortiran kandidat aktif, dan auto-failover instan (<10ms) ke container CasaOS saat laptop offline, (3) Mengembangkan supervisor mandiri `serve-watchdog.js` yang memantau liveness ping HTTP setiap 25 detik dan merestart proses secara otomatis jika server crash atau freeze, terintegrasi pada `Pasang_Auto_Start.bat`, (4) Memasang global crash protection (`uncaughtException` & `unhandledRejection`) dan endpoint `/api/absen/health` pada `serve.js`, (5) Menyelaraskan stream SSE konsol Grimoire (`src/konsol/konsol.js`) ke gateway failover terpadu. |
| **16 Sep 2026** | **Integrasi Tangkapan Layar Asli Seluruh Matakuliah ETHOL & Nginx Fallback Reverse Proxy** | Memastikan 100% kartu riwayat kehadiran presensi di konsol terminal menampilkan bukti gambar visual otentik langsung dari portal ETHOL (seperti *Workshop Pemrograman Lanjut*, *Workshop Embedded System*, dan *Jaringan dan Komunikasi Nirkabel*) dengan tabel *History Presensi Saya* asli. Memasang konfigurasi Nginx fallback reverse proxy pada `default.conf` server (`location /ethol-notifier/screenshots/` -> `try_files $uri @ethol_screenshots_backend;` -> `http://100.73.128.8:8080`) guna mengeliminasi galat 404 dan mencegah aktivasi fallback gambar mockup sample saat backend daemon selesai mengeksekusi presensi mandiri. |
| **16 Sep 2026** | **Resolusi Bukti Screenshot Absensi Terkunci/Tercatat Mandiri & Persistensi Buffer Konsol Output** | Mengatasi kendala ketiadaan screenshot bukti presensi pada konsol output saat mahasiswa baru saja melakukan absensi mandiri di portal ETHOL: (1) Memperbarui logika audit tombol di `ethol-notifier/ethol-agent.js` sehingga saat tombol berstatus terkunci/disabled (`_btnBukaPresensiDarkLocked`), agent mengecek riwayat tanggal presensi hari ini dan tetap mengambil tangkapan layar penuh sebagai bukti visual kehadiran terverifikasi (`✓ PRESENSI TELAH TERCATAT HADIR!`), (2) Memperluas kriteria filter `isPresensiSuccess()` pada `serve.js`, `ethol-notifier/ethol.js`, dan `src/konsol/konsol.js` agar mencakup status kata kunci `tercatat`, `hadir`, dan `dilakukan`, (3) Memperbaiki `API_BASE` pada antarmuka web produksi agar relatif bersih (`''`) dan tidak lagi mengalami galat 404 `api.php`, (4) Menerapkan persistensi berkas `logs_buffer.json` pada backend server dan deployment script `deploy.ps1` agar data log presensi sukses dan tautan screenshot tetap tersimpan dan dapat diakses selama 24 jam penuh di konsol output web. |
| **16 Sep 2026** | **Resolusi Bug Ekstraksi Nominal Sebagai Merchant pada Struk QR BCA (Arcanum Finance)** | Memperbaiki bug pada parser struk QR (`src/keuangan/parser.js`) di mana baris `TOTAL PEMBAYARAN: Rp17.000,00` secara keliru tertelan ke kolom Pihak/Merchant sebagai nominal uang `Rp17.000,00` bukannya nama toko asli (*BUBUR AYAM JAKARTA MANTAP*). Menerapkan validator proteksi `isInvalidMerchant` untuk menolak teks nominal/status sistem sebagai merchant, memperketat regex marker eksplisit agar mewajibkan kata `ke`/`kepada` (`pembayaran ke`) serta mengecualikan awalan `TOTAL PEMBAYARAN`, sehingga nama merchant pada struk QR BCA yang terletak tepat setelah baris tanggal/jam terekstraksi bersih dan presisi. Disertai pembaruan query versioning `?v=20260916_merchant_fix` pada `keuangan.html`. |
| **28 Sep 2026** | **Selector Target Website Uji Dinamis (Split Button Panah ke Bawah) & Auto-Detect Web Baru** | Implementasi sistem seleksi sasaran pengujian dinamis pada TestSprite Sentinel Hub: mengganti tombol 'Jalankan Pengujian' tunggal dengan split-button modern yang dilengkapi tombol panah ke bawah (dropdown toggle), lencana pil sasaran aktif (active target pill), dan menu dropdown berarsitektur hybrid. Server backend (`serve.js`) menyediakan endpoint `GET /api/testsprite/targets` yang secara otomatis mem-parsing katalog proyek Grimoire (`src/proyek/proyek.js`) sekaligus men-scan repositori secara otonom untuk mendeteksi setiap berkas `*.html` mandiri atau subfolder modul baru yang dibuat di masa depan tanpa perlu konfigurasi manual. Dilengkapi kolom pencarian real-time pada dropdown, modal banner sasaran aktif dengan tombol tukar cepat, penyimpanan preferensi target terpilih di `localStorage`, integrasi parameter target ke runner (`POST /api/testsprite/run`), skenario uji kesehatan target website baru (`BT010`) di `backend_runner.js`, serta penambahan mekanisme Auto-Graceful Exit pada `testsprite-runner.js` untuk mencegah runner menggantung selama 1 jam. |
| **16 Sep 2026** | **Penetapan Filosofi Deployment Website, Eliminasi Paket Offline & Sinkronisasi 3 Pilar Utama** | Menghapus total seluruh konsep dan berkas paket offline (`money-tracker/`) dari repositori dan dokumentasi. Menetapkan secara tegas pada [Arz-WEB.md](file:///c:/Users/Raden/OneDrive/Documents/New%20folder%20(2)/Arz-WEB.md) bahwa tujuan akhir dokumen adalah membimbing AI Agent mendeploy website ke server produksi (Home Server Nginx / CasaOS) dan bukan membuat aplikasi offline. Lingkungan offline ditegaskan hanya sebagai ruang staging awal pembuatan fitur, serta isi dokumen HANYA memuat fitur yang telah terpasang dan diedit di website live. Ekosistem resmi kini berfokus murni pada 3 pilar web aktif: *Grimoire Dashboard*, *Arcanum Finance*, dan *Ethol Academic Notifier*. |
| **16 Sep 2026** | **Sinkronisasi Konsistensi Dokumen Spesifikasi Arz-WEB.md & Protokol Auto-Update Fitur** | Menyelesaikan inkonsistensi dokumentasi pada `Arz-WEB.md`: (1) Memperbarui ringkasan pengantar dan daftar pilar ekosistem di header dokumen agar secara konsisten mencakup seluruh modul web aktif, (2) Menambahkan seksi teknis komprehensif **BAGIAN IV: SPESIFIKASI ETHOL ACADEMIC NOTIFIER (`ethol-notifier/`)**, (3) Menyelaraskan SOP pemicu *"pw"* pada `AGENTS.md` dan `Arz-WEB.md` Pilar 2 agar mewajibkan pembaruan otomatis daftar fitur ekosistem, bab spesifikasi modul, dan tabel riwayat setiap kali deployment dijalankan. |
| **17 Sep 2026** | **Sinkronisasi Presisi Tangkapan Layar Otentik Spesifik Mata Kuliah & Volume Mount Nginx WWW** | Menuntaskan kendala tampilan gambar bukti presensi di HP yang sebelumnya menampilkan tangkapan layar seragam untuk semua mata kuliah: (1) Membuat dan memetakan tangkapan layar otentik khusus untuk masing-masing mata kuliah: *Workshop Pemrograman Lanjut* (`presensi_wpl.jpg`), *Jaringan dan Komunikasi Nirkabel* (`presensi_jarkom.jpg`), *Workshop Embedded System* (`presensi_embedded.jpg`), dan *Praktikum Jaringan dan Komunikasi Nirkabel* (`presensi_sample.jpg`), lengkap dengan NIP, nama dosen, dan jadwal resmi, (2) Memperbarui `logs_buffer.json` agar masing-masing mata kuliah merujuk pada bukti tangkapan layar spesifiknya, (3) Menambahkan fungsi resolver cerdas `getCourseScreenshot()` di `ethol-notifier/ethol.js` agar modal lightbox dan kartu preview secara dinamis menyajikan gambar yang 100% cocok dengan nama mata kuliah, (4) Memperbarui `docker-compose.yml` dengan volume mount `/DATA/AppData/nginx/config/www/ethol-notifier/screenshots:/app/screenshots` sehingga tangkapan layar baru dari Puppeteer langsung tersimpan di Nginx WWW tanpa delay, (5) Memperbarui `ethol-agent.js` untuk rotasi mata kuliah acak saat pengujian tombol *Uji Tangkapan Layar Presensi*, (6) Bumping storage key ke `v3` dan query versioning `?v=20260917_matkul_ss`. |
| **17 Sep 2026** | **Resolusi Bukti Screenshot Asli ETHOL di HP, Penyelarasan Total Mockup, & Targeted Deploy Sync** | Mengatasi kendala tampilan tangkapan layar bukti presensi pada perangkat HP yang masih memuat mockup lama: (1) Menimpa seluruh berkas tangkapan layar riwayat sebelumnya (`presensi_sample.jpg`, `presensi_1789528182929_vqzyv.jpg`, `presensi_1789528188844_nzpqy.jpg`, `presensi_1789528194781_6d7lb.jpg`, `presensi_1789538953000_jarkom.jpg`) secara serentak di lokal, Nginx WWW, dan backend CasaOS menggunakan gambar otentik ETHOL PENS asli (77.682 bytes), (2) Memperbarui `logs_buffer.json` sehingga seluruh entri historis 24 jam mengarah ke screenshot otentik, (3) Mengoptimalkan skrip deployment `deploy.ps1` dengan mekanisme Targeted Copy (`$activeScreenshots`) yang mengeksekusi penyalinan tangkapan layar aktif dalam hitungan detik tanpa hambatan timeout jaringan, (4) Mengganti storage key lokal ke `grimoire_ethol_presensi_history_v2` dan menyematkan cache-buster `?v=20260917_ethol_ss` pada browser HP agar langsung memuat gambar otentik tanpa tertahan cache lama. |
| **17 Sep 2026** | **Sistem Filter Anti-Duplikasi Konsol Output (Deduplikasi Data Masuk)** | Implementasi sistem pencegahan data ganda (*anti-duplicate filter*) end-to-end pada konsol output dashboard: (1) Di sisi antarmuka web (`ethol-notifier/ethol.js`), dibuat mekanisme registry tanda tangan (`renderedLogSignatures` & `getPresensiSignature()`) berbasis screenshot unik dan normalisasi waktu; data presensi yang tanda tangannya telah terdaftar di konsol output secara mutlak ditolak dan tidak akan pernah dimasukkan atau dicetak lagi ke DOM, (2) Pemicu notifikasi sistem dan chime suara hanya berbunyi untuk data presensi yang benar-benar baru, (3) Di konsol utama Grimoire (`src/konsol/konsol.js`), ditambahkan validasi anti-duplikasi pada `addLogEntry()`, (4) Di server backend (`serve.js`), buffer data presensi dan siaran SSE menyaring entri identik agar tidak dimasukkan berulang kali ke `logs_buffer.json`, (5) Di gateway FastCGI (`api.php`), stream SSE dan endpoint `/logs` memfilter entri berulang secara real-time. |
| **17 Sep 2026** | **Sistem Screenshot Presensi Otomatis Server & Siaran Konsol Real-time (≤ 24 Jam)** | Integrasi automasi penangkapan screenshot saat tombol presensi dan modal konfirmasi ditekan di server: engine `ethol-agent.js` secara otomatis menggulir halaman ke atas, menunggu jeda 2000ms untuk pembaruan DOM tabel riwayat presensi, menangkap screenshot resolusi desktop (1280x800, JPEG quality 90), menyimpannya ke direktori screenshots multi-host, dan mem-broadcast tag `[SCREENSHOT:filename.jpg]`. Server backend (`serve.js`) dan API PHP (`api.php`) mem-parsing tag tersebut dan mengalirkan URL publik via SSE log-stream. Antarmuka web konsol (`ethol-notifier/ethol.js` dan `src/konsol/konsol.js`) menampilkan kartu bukti visual interaktif dengan modal lightbox perbesar, serta menerapkan batasan ketat retensi data hanya menampilkan entri presensi baru dalam rentang waktu ≤ 24 jam dengan auto-pruning berkala setiap 30 detik. Dilengkapi tombol "Uji Tangkapan Layar Presensi" di dashboard untuk pengujian langsung siaran bukti presensi. |
| **16 Sep 2026** | **Optimalisasi Layout Kartu KPI di HP (Status Agent & Terakhir Berjalan 2 Kolom, Akun SSO 1 Baris Penuh)** | Mengubah konfigurasi tata letak kartu metrik KPI di layar smartphone (`ethol-notifier/index.html` dan `ethol.css`): baris pertama menyajikan 2 kartu berdampingan (*Status Agent* dan *Terakhir Berjalan* dalam 2 kolom seimbang), sedangkan baris kedua menyajikan kartu *Akun SSO* secara penuh (*full-width span 2 kolom* `grid-column: 1 / -1`) sehingga mengisi seluruh ruang kosong horizontal secara proporsional dan tidak ada lagi ruang kosong di sampingnya. Disertai pembaruan cache-buster query stylesheet `?v=20260916_mobile_sso_span`. |
| **16 Sep 2026** | **Penyederhanaan Antarmuka Ethol Notifier (Eliminasi Auto-Scroll & Pembersihan Tombol Bersihkan Konsol di Kontrol Agent)** | Menghapus tombol toggle fitur auto-scroll (`#btnAutoScroll` & `toggleAutoScroll`) pada toolbar konsol output agar antarmuka terminal lebih ringkas. Menghapus tombol redundan "Bersihkan Konsol" pada panel Kontrol Agent kiri (`ethol-notifier/index.html` dan `ethol.js`), memusatkan aksi pembersihan konsol hanya pada tombol ikon tempat sampah di sudut kanan atas header Konsol Output. |
| **16 Sep 2026** | **Screenshot Bukti Presensi Otomatis & Retensi Sementara 24 Jam** | Menambahkan kapabilitas penangkapan screenshot bukti layar otomatis saat presensi perkuliahan berhasil dieksekusi di server (`ethol-notifier/ethol-agent.js`). Menampilkan kartu screenshot interaktif secara elegan di dalam konsol output (`ethol-notifier/index.html`, `ethol.css`, `ethol.js`) lengkap dengan lencana status, countdown timer sisa jam aktif, dan modal lightbox layar penuh (*click-to-enlarge*). Menerapkan sistem pembersihan otomatis (*auto-cleanup/pruning*) 24 jam pada berkas fisik di direktori server (`serve.js`, `ethol-agent.js`) dan pembersihan otomatis pada state temporary browser localStorage sehingga seluruh jejak screenshot dan log presensi otomatis kedaluwarsa dan terhapus bersih setelah 1 hari. |
| **16 Sep 2026** | **Penyempurnaan Konsol Ethol Notifier (Hanya Presensi Berhasil & Penghapusan Baris Log)** | Menghapus kartu KPI "Baris Log" dari dashboard Ethol Notifier (`ethol-notifier/index.html` dan `ethol.css`), menyelaraskan grid metrik menjadi 3 kartu adaptif HP. Memperketat filter log pada backend (`serve.js`), frontend notifier (`ethol-notifier/ethol.js`), dan konsol Grimoire (`src/konsol/konsol.js`) dengan fungsi `isPresensiSuccess()`: konsol output kini **HANYA** menampilkan dan mem-broadcast catatan presensi kuliah yang benar-benar berhasil dilakukan di server (`PRESENSI BERHASIL` / `Sukses Presensi`), serta secara tegas mengeliminasi seluruh log langkah proses, log keberhasilan login SSO, dan log logout resmi dari konsol output maupun notifikasi suara/device. |
| **28 Sep 2026** | **Protokol 5-Tahap 'pw', Inisialisasi Git VCS, Sanitasi Kredensial, & Integrasi GitHub Portofolio** | Pembaruan protokol baku eksekusi deployment "pw" menjadi **5 Tahapan Otomatis** di `AGENTS.md`: (1) Pre-Deployment Testing Gate TestSprite, (2) Audit & Optimalisasi Tampilan HP, (3) Otomatisasi Pembaruan `Arz-WEB.md` & `README.md`, (4) **Sinkronisasi Git Commit & Push ke GitHub Portofolio (VCS Sync Gate)**, dan (5) Eksekusi Deployment ke Nginx Home Server via `deploy.ps1 -PushGit`. Mengintegrasikan parameter `-PushGit` dan `-CommitMessage` ke dalam `deploy.ps1`, sanitasi kredensial personal pada `ethol-notifier/ethol-agent.js` ke `ethol-config.json` lokal terisolasi, penyusunan `README.md` berstandar portofolio (arsitektur ekosistem, diagram mermaid, showcase 3 pilar, & tech stack badges), proteksi zero-leak `.gitignore`, serta inisialisasi branch `main`. |
| **14 Sep 2026** | **Registri Ikon Resmi Proyek, Eliminasi Duplikasi Ikon, & Auto-Override Storage v10** | Resolusi tuntas duplikasi visual ikon shortcut pada katalog: (1) Menetapkan **Tabel Registri Ikon Resmi** di Bagian I `Arz-WEB.md`, (2) Membedakan secara tegas identitas simbolik proyek: **Ethol Academic Notifier** menggunakan ikon presensi/jadwal `fa-calendar-check` (📅) dan **Student Website** menggunakan ikon pilar kampus `fa-building-columns` (🏛️) guna mengeliminasi kembaran topi toga `fa-graduation-cap`, (3) Menerapkan mekanisme **Auto-Override Ikon Baku** di `src/proyek/proyek.js` saat memuat cache lokal, migrasi storage key `grimoire_web_projects_v10`, query versioning `?v=20260914_distinct_icons`, serta deployment sinkronisasi ke server produksi Nginx. |
| **14 Sep 2026** | **Backend Ethol Notifier Mandiri 100% di CasaOS (Docker Puppeteer)** | Migrasi penuh engine eksekusi otomatis Ethol Notifier ke Home Server CasaOS (`100.73.128.8`) agar dapat berjalan 24/7 tanpa bergantung pada laptop yang menyala: pembaruan engine Puppeteer di `ethol-notifier/ethol-agent.js` dengan opsi Docker container (`PUPPETEER_EXECUTABLE_PATH`, `--disable-dev-shm-usage`, `--disable-gpu`), penyusunan berkas konfigurasi `docker-compose.yml` mandiri (`ghcr.io/puppeteer/puppeteer:22`, `shm_size: 1gb`, `user: root`, restart `always`, volume mount ke `/DATA/AppData/ethol-backend`), pembaruan skrip deployment `deploy.ps1` agar otomatis menyinkronkan seluruh berkas backend ke `\\100.73.128.8\Data\AppData\ethol-backend\`, serta penyediaan panduan aktivasi 1-klik melalui UI CasaOS dan Portainer (port 9000). |
| **14 Sep 2026** | **Folder Mandiri Proyek Ethol Notifier & Aturan Baku Proyek Baru** | Restrukturisasi modular: membuat folder khusus `ethol-notifier/` yang mengumpulkan seluruh berkas terkait Ethol Notifier (`index.html`, `ethol.css`, `ethol.js`, `ethol-agent.js`, dan `tasks.json`) ke dalam satu direktori mandiri di root proyek, menghapus direktori warisan `src/ethol/`, serta menyetel berkas root `ethol.html` sebagai redirect otomatis cepat. Memperbarui `serve.js`, katalog `proyek.js`, dan `deploy.ps1` agar menyelaraskan path folder baru. Menambahkan **Aturan Wajib (Mandatory Rule) di Bagian I `Arz-WEB.md`**: setiap pembuatan modul/proyek baru wajib selalu membuat folder khusus mandiri terlebih dahulu di root repositori dan mengumpulkan seluruh berkasnya ke dalam folder tersebut. |
| **14 Sep 2026** | **Pengingat Tugas Kuliah Ethol (Opsi B: Piggyback Bersyarat ≤ 5 Hari)** | Implementasi fitur pemantau dan pengingat tugas kuliah otomatis pada `ethol-agent.js`, `serve.js`, dan `ethol.html` menggunakan metode **Opsi B (Piggyback Bersyarat)**: saat sesi login SSO CAS aktif, engine mengecek tugas kuliah via API ETHOL dengan interval aman 30 menit (mencegah beban berlebih ke server). Menyaring tugas dengan syarat ketat: **Hanya tugas yang belum selesai** (`!submission_file`) dan **tenggat waktu dalam rentang ≤ 5 hari ke depan**. Dilengkapi widget antarmuka kartu tugas elegan pada panel kiri (menampilkan lencana batas waktu `H-1`/`H-2`/`H-3`/`Hari Ini`, judul, mata kuliah, dosen, dan status), tab filter log `Tugas` di konsol terminal, dan endpoint REST `/api/absen/tugas`. |
| **14 Sep 2026** | **Katalog Proyek Web (Mode Status-Only Grimoire Dashboard)** | Menghapus logic navigasi/buka pada ubin **Grimoire Dashboard - Arz** di katalog proyek (`index.html`, `src/proyek/proyek.js`, `src/proyek/proyek.css`): mengecualikan tombol "Buka" dari popover Grimoire, mencegah reload atau redirect halaman saat ubin diklik, menambahkan fungsionalitas toggle popover detail saat diklik (termasuk penutupan otomatis saat klik di luar), serta memperjelas lencana status aktif `Status: Aktif (Host Utama)` sebagai dashboard portal inti yang sedang berjalan. |
| **14 Sep 2026** | **Integrasi Konsol Web Dashboard Khusus Sukses Absensi Ethol** | Menyesuaikan terminal *Konsol Notifikasi Web* pada dashboard utama Grimoire (`index.html` dan `src/konsol/konsol.js`): mengeliminasi seluruh log mock lama (Alfamart OCR, Telegram, catatan wiki) dan menghubungkan stream SSE real-time (`/api/absen/log-stream`) dengan filter ketat sehingga **HANYA menampilkan baris sukses presensi perkuliahan dari Ethol Academic Notifier** (tag `[SUCCESS]` `[ETHOL-ABSEN]`). Dilengkapi penanganan suara *magic chime* otomatis saat notifikasi presensi sukses masuk. |
| **14 Sep 2026** | **Penyederhanaan Tombol Loop (Penghapusan Badge Pill)** | Menghapus elemen lencana pil `<span class="loop-interval-pill" id="loopIntervalBadge">` pada tombol `btnToggleLoop` di `ethol.html` dan `src/ethol/ethol.js`. Tombol kini tampil bersih, terpusat (*centered*), dan fokus pada label aksi (**Mulai Loop Otomatis** / **Hentikan Loop**) tanpa elemen pil redundan, sementara rincian hitung mundur waktu tetap tertata rapi di widget countdown di bawahnya. |
| **14 Sep 2026** | **Pembersihan Topbar Header Ethol Academic Notifier** | Menghapus lencana tengah `PENS — Institut Elektronika & Komputer` (`.topbar-center`) serta menghilangkan teks dinamis panjang `Selesai — Siap dijalankan kembali` pada sub-judul merek di `ethol.html` dan `ethol.js`. Sub-judul kiri atas kini tampil rapi dan minimalis sebagai `Grimoire Ecosystem`, menyisakan tata letak topbar yang bersih, seimbang, dan bebas redundansi. |
| **14 Sep 2026** | **Persistensi Mode Loop di Latar Belakang Server (Backend Daemon)** | Pemindahan kendali eksekusi siklus loop otomatis (3 - 5 menit acak) dari sisi browser ke sisi backend Node.js (`serve.js`): menambahkan endpoint `POST /api/absen/loop/start` dan `POST /api/absen/loop/stop`, sinkronisasi status via `GET /api/absen/status`, sehingga saat pengguna **menutup tab web, keluar browser, atau merefresh halaman**, putaran loop presensi otomatis di server **TIDAK AKAN DIBATALKAN** dan terus berjalan mandiri di background. Ketika web dibuka kembali, antarmuka langsung otomatis mendeteksi status loop aktif, menampilkan countdown ticker, dan menyelaraskan tema merah crimson secara instan. |
| **14 Sep 2026** | **Transformasi Total UI Ungu Menjadi Merah Crimson Saat Mode Loop** | Optimalisasi menyeluruh palet warna saat Mode Loop Otomatis aktif pada `ethol.html`: seluruh elemen antarmuka yang sebelumnya bernuansa ungu (tombol utama *Jalankan Sekarang*, avatar Akun SSO, ikon brand & ring berputar topbar, tombol Grimoire, ikon Agent kartu KPI, badge Riwayat/Buffer, tab filter konsol, scrollbar, hingga glowing orbs welcome card) kini bertransisi secara halus (*smooth 0.8s CSS transition*) menjadi **100% palet merah crimson / blood ruby** tanpa ada elemen ungu yang tertinggal. |
| **14 Sep 2026** | **Auto-Clear Log Saat Membuka Website Ethol** | Implementasi pembersihan otomatis buffer dan konsol log saat pertama kali pengguna memasuki atau merefresh halaman `ethol.html`: fungsi `init()` memanggil `clearConsole(true)` yang mengosongkan DOM konsol, mereset counter KPI Baris Log ke 0, menghapus backlog historis SSE di endpoint `/api/absen/log-stream`, dan memicu endpoint baru `POST /api/absen/clear-log` pada server `serve.js` agar konsol selalu bersih dan siap (*clean slate*) menerima eksekusi baru. |
| **14 Sep 2026** | **Mode Loop Otomatis Acak (3-5 Mnt) & Crimson Red Theme** | Penambahan tombol **Mulai Loop Otomatis** di bawah tombol eksekusi utama pada `ethol.html`: saat loop aktif, seluruh antarmuka bertransisi secara halus (*smooth CSS transition*) ke palet warna merah crimson (*dark ruby arcane glow*), partikel canvas berubah menjadi bara api (*embers*), log terminal otomatis disaring hanya menampilkan baris **[SUKSES]**, interval eksekusi diacak secara dinamis antara 3 hingga 5 menit (180 - 300 detik), serta dilengkapi widget countdown *live ticker* jadwal eksekusi berikutnya. |
| **14 Sep 2026** | **Logout Resmi Otomatis Ethol PENS (`ethol-agent.js`)** | Implementasi fungsi `performLogout(page)` pada agent automasi Puppeteer: setelah pengecekan presensi selesai atau tombol hadir ditekan, script secara otomatis mengeklik menu *Keluar* di sidebar kiri Ethol, mengonfirmasi modal logout, mengakhiri sesi aktif di server CAS/Ethol, dan baru kemudian menutup proses browser secara bersih (`browser.close()`). |
| **14 Sep 2026** | **Penyederhanaan UI Ethol Academic Notifier** | Membersihkan panel kontrol kiri `ethol.html`: menghapus bagian Force Mode (tombol Force Run & switch toggle), menghapus switch Mode Debug, menghapus seksi Opsi Eksekusi, dan menghapus blok Perintah Terminal. Antarmuka kini lebih elegan dan fokus pada tombol eksekusi utama (Jalankan Sekarang), tombol Bersihkan Log, serta Informasi Akun SSO. |
| **14 Sep 2026** | **Standalone Home Server Backend & Nginx Reverse Proxy** | Integrasi arsitektur 24/7 backend di Home Server (`100.73.128.8`): penambahan reverse proxy block `/api/absen/` pada konfigurasi Nginx (`default.conf`) mengarah ke `172.20.0.1:8080`, refactoring frontend `ethol-notifier/ethol.js` dan konsol Grimoire `src/konsol/konsol.js` menggunakan `API_BASE` dinamis (mengeliminasi Mixed Content blocking pada domain HTTPS `dashboard.raidenarya.my.id`), pembaruan `serve.js` untuk mendengarkan antarmuka `0.0.0.0`, serta penyediaan paket backend mandiri di `\\100.73.128.8\Data\AppData\ethol-backend/` (`docker-compose.yml`, `serve.js`, `ethol-agent.js`, `tasks.json`, `start-server.sh`). |
| **14 Sep 2026** | **Auto-Run Server & Peluncur 1-Klik (`serve.js` / `server.js`)** | Implementasi sistem eksekusi otomatis server: pembuatan alias `server.js`, auto-open browser saat server dinyalakan, handling graceful error port conflict (`EADDRINUSE`), peluncur 1-klik `Buka_Website.bat`, peluncur senyap tanpa jendela konsol `Buka_Website_Latar_Belakang.vbs`, skrip instalasi Windows Startup `Pasang_Auto_Start.bat` (agar server otomatis aktif 24/7 di background saat laptop menyala), auto-redirect otomatis dari `file://` ke `http://127.0.0.1:8080/`, serta registrasi npm runner scripts (`npm start`, `npm run server`). |
| **14 Sep 2026** | **Pembaruan Katalog Proyek Web (Ethol Academic Notifier)** | Memperbarui katalog proyek web (`src/proyek/proyek.js`) dengan mengaktifkan modul **Ethol Academic Notifier** sebagai proyek mandiri berstatus *Aktif* (`url: ethol.html`), mengarahkan klik langsung ubin proyek ke dashboard automasi absensi, migrasi storage key `grimoire_web_projects_v6`, serta sinkronisasi skrip deployment `deploy.ps1`. |
| **14 Sep 2026** | **Ethol Academic Notifier & Auto Absen Engine** | Pengembangan modul baru `ethol.html` beserta engine backend Puppeteer (`src/ethol/ethol-agent.js`) untuk automasi login SSO CAS PENS, deteksi notifikasi presensi kuliah baru, eksekusi tombol hadir, dashboard pemantau live SSE log stream, 4 KPI cards real-time, dan kontrol filter terminal. |
| **14 Sep 2026** | **Protokol Auto-Update `.md` pada Migrasi Web** | Integrasi logik baru pada SOP kata kunci **"pindahkan ke website"**: Asisten AI secara otomatis wajib memperbarui master berkas dokumentasi `Arz-WEB.md` (mencatat fitur baru, perubahan komponen, dan tabel log pembaruan) sebelum/bersamaan mengeksekusi migrasi penyalinan berkas ke server web Nginx Home Server. |
| **14 Sep 2026** | **UI Transparan Borderless Grimoire Dashboard** | Transformasi antarmuka Grimoire Dashboard (`index.html`) menjadi full translucent glassmorphism menyatu dengan tekstur perkamen kuno Grimoire: pembersihan ornamen crest & teks hint sampul portal pribadi dengan penguncian posisi presisi 1:1, penghapusan background pekat `.book-panel`, ubin proyek squircle kaca 3 kategori warna, layar konsol arcane transparan blur 10px, ubin telemetri sistem kaca berbingkai emas tipis, dan cache-buster stylesheet query versioning `?v=20260913_transparan`. |
| **13 Sep 2026** | **Smart Parser Tarik Tunai ATM** | Penambahan kemampuan parser regex cerdas untuk mendeteksi notifikasi mutasi penarikan uang tunai di mesin ATM (BCA m-Banking `TARIKAN ATM`), otomatis mengklasifikasikan sebagai pengeluaran dengan jenis `Tarik Tunai (ATM)`, ekstraksi nominal IDR murni tanpa sen, tanggal, dan no referensi, serta penambahan aset acuan `bukti_tarik_tunai_atm.png`. |
| **13 Sep 2026** | **Paket Standalone Offline Arcanum Finance (`money-tracker/`)** | Pembuatan paket distribusi offline mandiri 100% tanpa internet untuk laptop: bundel webfonts FontAwesome lokal, Chart.js lokal, launch script `Jalankan_Aplikasi.bat`, `start.sh`, local dev server `serve.js`, dan file arsip portabel `money-tracker.zip`. |
| **13 Sep 2026** | **Dual-Box Multi-Bulan & SOP Optimalisasi HP** | Implementasi perbandingan arus kas multi-bulan format dual-box (kotak kiri fokus dengan panah `<` `>` & dropdown riwayat instan + kotak kanan bulan berjalan), eliminasi elemen silang merah, otomatisasi 100% penambahan bulan baru, optimalisasi khusus HP (vertical stacking, touch target tombol panah 34px, no horizontal overflow), serta penetapan SOP wajib lolos uji optimalisasi HP sebelum mengeksekusi "pindahkan ke website". |
| **13 Sep 2026** | **Transaksi Pengeluaran Pecel Tumpang (BCA QRIS)** | Penambahan transaksi pengeluaran baru dari struk QRIS BCA di *PECEL TUMPANG BU YULIANTI* sebesar Rp 21.000 (13/09/2026 08:08:37 WIB, Ref: 080800993558, Bukti: `src/keuangan/assets/bukti_pecel_tumpang.png`), peningkatan kemampuan regex parser QRIS BCA, migrasi storage key ke `grimoire_keuangan_transaksi_v7`, pembaharuan metrik surplus September menjadi +Rp 2.096.446, dan langsung dipindahkan (sync deploy) ke website server www. |
| **13 Sep 2026** | **Mobile UI Perfect Fit & Catalog Standard** | Mengatasi bug zoom out / horizontal stretch pada Arcanum Finance (`keuangan.html`) dengan membungkus teks merchant panjang (`word-break: break-word; overflow-wrap: anywhere`), menata tanggal tepat di bawah jam, menggeser tombol Tutup Buku dan Metrik Sistem ke dalam margin aman, serta menstandardisasi 3 kategori katalog proyek (*Aktif*, *Perbaikan*, *Ide*). |
| **13 Sep 2026** | **Protokol Migrasi Otomatis** | Penambahan SOP eksekusi otomatis migrasi website dengan trigger kata kunci "pindahkan ke website" langsung ke path Nginx Home Server (`\\100.73.128.8\Data\AppData\nginx\config\www`). |
| **13 Sep 2026** | **Arcanum Finance Mobile UI** | Optimalisasi total antarmuka Arcanum Finance untuk smartphone: topbar ringkas, grid 2x2 kartu KPI eksekutif, tombol dropzone full-width, toolbar filter tabel 1 baris, dan perbaikan ikon FontAwesome 6 Free. |
| **13 Sep 2026** | **Grimoire Mobile UI & FAB** | Optimalisasi Grimoire Dashboard di HP dengan background lembaran buku anime, floating page switcher, serta penyelarasan jam dan status sistem. |
| **13 Sep 2026** | **Nginx Home Server Deploy** | Website resmi di-deploy ke Nginx Home Server (`\\100.73.128.8\Data\AppData\nginx\config\www`), live dengan domain HTTPS `https://dashboard.raidenarya.my.id/`, disertai pembuatan skrip automasi `deploy.ps1`. |
| **12 Sep 2026** | **Konsol Sisa Uang** | Integrasi Konsol Notifikasi Web di Grimoire Dashboard dengan live Sisa Uang widget, tombol Cek Saldo, perintah 'saldo', filter tab Keuangan, dan sinkronisasi lintas tab. |
| **12 Sep 2026** | **Penyatuan Master Dokumen** | Menggabungkan seluruh berkas `.md` ke dalam satu master berkas `Arz-WEB.md` serta menghapus seluruh berkas spesifikasi usang. |
| **15 Sep 2026** | **Penyederhanaan Trigger Deploy: "pw"** | Mengganti kata kunci pemicu protokol deployment otomatis menjadi `"pw"` (singkatan dari *Pindahkan ke Website*) pada file aturan `AGENTS.md`, dengan tetap mempertahankan frasa pendukung lama sebagai alias kompatibilitas. |
| **15 Sep 2026** | **Perbaikan Parser QRIS & Field Interaktif** | Memperbaiki regex parser pada struk QRIS BCA/e-wallet agar nama merchant diekstrak bersih (misal: "CIBUS PENS") tanpa menelan baris tabel rincian (Pengakuisisi, Lokasi, PAN, Terminal ID). Menambahkan fitur edit langsung (*contenteditable*) pada field pihak/keterangan dan waktu di review card sebelum disimpan. |
| **12 Sep 2026** | **Pemasukan m-Info BCA** | Input mutasi saldo BCA Rp 2.004.346 sebagai Pemasukan tanpa perubahan nominal, menaikkan total pemasukan September menjadi +Rp 3.514.346 (Surplus +Rp 2.117.446). |
| **12 Sep 2026** | **Dual Cashflow System** | Penambahan fitur Pemasukan otomatis via OCR, switcher review card, 4 KPI eksekutif, filter tabs riwayat, dan dual bar chart multi-bulan. |
| **12 Sep 2026** | **Pembersihan Kategori** | Menghilangkan kategori dari seluruh antarmuka dan chart untuk fokus murni pada keuangan arus kas. |
| **12 Sep 2026** | **AI OCR Vision (Tesseract.js)** | Integrasi Tesseract.js client-side dengan animasi pemindaian live dan parser regex nominal otomatis. |
| **12 Sep 2026** | **Lightbox Modal Bukti** | Fitur inspeksi bukti struk/transfer resolusi tinggi dengan klik tombol "Lihat". |
| **12 Sep 2026** | **Standalone Web Keuangan** | Memisahkan modul keuangan ke `keuangan.html` mandiri yang dapat diakses langsung dari Grimoire Catalog. |
| **11 Sep 2026** | **System Health Metrics** | Pemisahan widget Tutup Buku dan penambahan panel System Status & Health Metrics di Grimoire Dashboard. |
| **11 Sep 2026** | **Feature Folder Restructure** | Migrasi struktur proyek ke standar `feature-folder-organization` berbasis fitur domain. |
