# Aturan Kerja & Protokol AI Agent: Arz-WEB

> [!IMPORTANT]
> ### 🎯 TUJUAN AKHIR & FILOSOFI DOKUMENTASI (`Arz-WEB.md`)
> 1. **Membimbing AI Agent Men-deploy Website**: Dokumen ini dan repositori Arz-WEB secara mutlak bertujuan untuk membimbing AI Agent merancang, membangun, dan **mendeploy website ke lingkungan server produksi publik (Nginx Home Server / CasaOS)**, **BUKAN untuk membuat aplikasi offline**.
> 2. **Offline Hanya Tahap Awal**: Lingkungan lokal/offline hanya digunakan sebagai ruang kerja sementara (*staging*) pada tahapan awal perancangan fitur sebelum siap dipublikasikan ke server web.
> 3. **Hanya Mencatat Fitur yang Telah Di-deploy & Diedit di Web**: Berkas `Arz-WEB.md` **HANYA memuat fitur yang telah berhasil di-deploy dan diedit dari websitenya** secara live.

Dokumen aturan ini mengikat seluruh sesi pengembangan pada repositori **Arz-WEB**.

## 1. Protokol Eksekusi: "pw" (Pindahkan ke Website)
Setiap kali pengguna memberikan perintah atau instruksi dengan kata kunci:
- **"pw"** (perintah pintas resmi utama)
- atau variasi pendukung: **"pindahkan ke website"**, *"deploy ke server"*, *"sinkronkan ke web"*, *"upload ke website"*

Asisten AI **WAJIB MENJALANKAN 5 TAHAPAN UTAMA SECARA OTOMATIS TANPA MEMINTA KONFIRMASI ULANG**:

### 1. Pre-Deployment Testing Gate (Verifikasi Pengujian Otonom TestSprite)
- Sebelum berkas dipindahkan ke server web produksi, Asisten AI **WAJIB menjalankan verifikasi pengujian otomatis TestSprite** terhadap modul/halaman web yang mengalami perubahan:
  ```powershell
  node testsprite_tests/testsprite-runner.js runTests
  ```
- **Kondisi Lolos (*Passed*):** Jika skenario uji validasi berhasil tanpa regresi fatal, AI otomatis melanjutkan ke tahapan audit HP dan deployment.
- **Kondisi Gagal (*Failed / Bug Detected*):** Apabila terdeteksi error fatal atau fungsi antarmuka rusak, proses deployment ke server web **WAJIB DIBATALKAN**. AI wajib melaporkan rincian kegagalan pengujian dan memberikan rekomendasi perbaikan sebelum kode dinaikkan ke produksi publik.

### 2. Audit & Transformasi UI Otomatis untuk Lingkungan Android / Mobile (Android-Fit Protocol)
- Sebelum dipublikasikan ke web, Asisten AI **WAJIB secara otomatis mengaudit dan mentransformasi UI halaman web agar pas 1:1 dengan lingkungan Android**:
  1. **Dynamic Viewport Unit (`100dvh` / `100svh`)**: Wajib menggunakan `min-height: 100dvh;` pada kontainer root agar layout tidak terpotong oleh dynamic URL bar browser Android (Chrome / Samsung Internet).
  2. **Android Safe Area Insets**: Seluruh header dan bottom container wajib mengadopsi `env(safe-area-inset-top)` dan `env(safe-area-inset-bottom)` agar tidak menabrak *punch-hole camera*, *notch*, atau *gesture navigation bar* Android.
  3. **Target Sentuh Standar Android (Minimal 48px / 48dp)**: Seluruh tombol aksi, tab switcher, dan kontrol navigasi wajib memiliki target sentuh minimal **48px × 48px** dengan gap sentuh 8px–12px (mencegah *fat-finger error* sesuai Google Material Design 3).
  4. **Zona Jempol (Fitts' Law Thumb-Zone)**: Aksi-aksi utama dan navigasi prioritas wajib dirancang nyaman untuk sepertiga bawah layar yang mudah dijangkau satu jempol.
  5. **Anti-Pull-to-Refresh & Tap Delay**: Mencegah browser me-refresh tak sengaja saat tabel/grafik digeser via `overscroll-behavior-y: contain;` dan `touch-action: manipulation;`.
  6. **Android Status Bar Sync**: Pastikan tag `<meta name="theme-color" content="...">` dan `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` terpasang rapi.
  7. **Zero Horizontal Overflow & Scroll Terisolasi**: `max-width: 100vw; overflow-x: hidden;` dengan seluruh tabel data dibungkus dalam `.table-scroll-container` (`-webkit-overflow-scrolling: touch;`).

### 3. Otomatisasi Pembaruan File Dokumentasi ([Arz-WEB.md](file:///c:/Users/Raden/OneDrive/Documents/New%20folder%20(2)/Arz-WEB.md) & [README.md](file:///c:/Users/Raden/OneDrive/Documents/New%20folder%20(2)/README.md))
- Asisten AI **WAJIB secara otomatis memperbarui file `Arz-WEB.md`** sebelum atau bersamaan dengan migrasi ke server web:
  1. **Pembaruan Ringkasan Fitur Ekosistem (Header & Overview)**: Memastikan daftar seluruh pilar aplikasi web yang telah dibuat pada pengantar dokumen (paragraf 1 dan daftar pilar ekosistem) selalu mutakhir (Grimoire Dashboard, Ethol Academic Notifier, dsb.).
  2. **Pembaruan Seksi Spesifikasi Teknis**: Menambahkan seksi spesifikasi teknis baru atau memperbarui seksi spesifikasi modul terkait jika ada fitur/arsitektur yang ditambahkan atau diubah.
  3. **Pengalihan Riwayat ke GitHub (Tanpa Tabel Manual)**: Fungsi tabel riwayat di `Arz-WEB.md` telah ditiadakan. Seluruh riwayat pembaruan dan changelog dialihkan sepenuhnya ke Git Commit History di GitHub portofolio (`https://github.com/RadenArya1/Arz-WEB/commits/main`).
  4. **Pembaruan Portofolio `README.md`**: Menyelaraskan informasi fitur dan arsitektur pada presentasi portofolio GitHub.
  5. Menjamin dokumentasi selalu sinkron 1:1 dengan kode produksi yang di-deploy.

### 4. Sinkronisasi Git Commit & Push ke GitHub Portofolio (VCS Sync Gate)
- Asisten AI **WAJIB melakukan commit Git dan push otomatis ke GitHub**:
  ```powershell
  git add .
  git commit -m "feat/fix/chore: deskripsi ringkas perubahan"
  git push origin main
  ```
- **Zero-Leak Policy**: Memastikan berkas vault sensitif TestSprite, token kredensial (`ethol-config.json`), dan file sementara tetap terisolasi penuh via `.gitignore`.
- Menjamin repositori GitHub portofolio selalu mutakhir 1:1 dengan versi website yang live.

### 5. Eksekusi Otomatis Deployment ke Nginx Home Server
- Jalankan skrip PowerShell deployment:
  ```powershell
  powershell.exe -ExecutionPolicy Bypass -File ".\deploy.ps1" -PushGit
  ```
- Target Server: `\\100.73.128.8\Data\AppData\nginx\config\www`
- **Proteksi Server Produksi**: Skrip secara otomatis memastikan folder `.git` tidak pernah tersalin ke server Nginx publik.
- Laporkan status berkas yang terpasang, tautan live website, dan konfirmasi pembaruan file `.md`.

## 2. Protokol Wajib: Manajemen Shortcut Katalog Proyek & Siklus Status
Setiap kali ada pengembangan modul, fitur web baru, atau penanganan masalah bug/error:

### A. Pembuatan Fitur Baru Otomatis Membuat Shortcut
- Setiap kali membuat halaman web mandiri, modul, atau fitur proyek baru di repositori Arz-WEB, Asisten AI **WAJIB secara otomatis menambahkan shortcut ubin proyek** ke dalam Katalog Proyek Grimoire Dashboard (`src/proyek/proyek.js`).
- Shortcut harus memuat ikon FontAwesome yang representatif, tautan `url`, target host, deskripsi ringkas, dan tags.

### B. Hanya Ada 2 Status Baku (Status "Ide" Telah Dihapus Total)
Sistem katalog hanya mengenal dua status operasional:
1. **Aktif** (`status: 'active'`, `statusLabel: 'Aktif'`, warna Emerald Green):
   - Menandakan aplikasi/fitur web beroperasi secara normal, stabil, responsif, dan siap digunakan.
2. **Perbaikan** (`status: 'wip'`, `statusLabel: 'Perbaikan'`, warna Warm Amber):
   - Menandakan aplikasi/fitur web sedang dalam pengerjaan, mengalami kendala teknis, bug, server offline, atau dalam proses pemeliharaan.
- **Status "Ide" telah dihapus secara permanen dari seluruh sistem dan antarmuka.**

### C. Deteksi Masalah & Auto-Update Status Shortcut
- **Saat Terjadi Masalah / Bug:** Apabila pada suatu website/fitur yang telah dibuat terjadi kendala, bug, kegagalan request, atau service backend terputus, Asisten AI **WAJIB secara otomatis memperbarui status shortcut proyek terkait menjadi "Perbaikan"** (`wip`) di `src/proyek/proyek.js`, disertai catatan ringkas kendalanya (`note: "..."`).
- **Saat Masalah Terselesaikan:** Begitu kendala berhasil diperbaiki dan diverifikasi normal, Asisten AI **WAJIB secara otomatis mengembalikan status shortcut proyek tersebut menjadi "Aktif"** (`active`) dan menghapus catatan error.

### D. Ikon Shortcut Wajib Unik (Anti-Duplikasi Ikon)
- Setiap shortcut proyek dalam Katalog Grimoire **WAJIB menggunakan ikon FontAwesome yang berbeda/unik**.
- **Dilarang keras menggunakan ikon yang sudah dipakai oleh proyek lain** di katalog.
- Asisten AI wajib memeriksa daftar ikon yang sudah ada di `src/proyek/proyek.js` sebelum menetapkan ikon untuk fitur/modul baru, guna memastikan identitas visual setiap web mudah dikenali secara instan.

## 3. Protokol Keamanan & Isolasi: TestSprite Eksklusif Localhost (Non-Deployable)
1. **Dilarang Men-deploy TestSprite ke Server Nginx**:
   - Seluruh berkas dan folder pengujian TestSprite (`testsprite_tests/`, `testsprite_vault.json`, `rotate-testsprite.ps1`, `testsprite-runner.js`, `mcp_config.json`, `.agents/`) adalah **EKSKLUSIF LOKAL (Localhost Only)**.
   - Dilarang keras menyalin atau mempublikasikan folder/berkas tersebut ke direktori Nginx Home Server (`\\100.73.128.8\Data\AppData\nginx\config\www`).
2. **Pencegahan Kebocoran Kredensial**:
   - Berkas sensitif seperti API Key dan riwayat token pada vault akun wajib dilindungi dan di-exclude dari deployment dan git repository.
3. **Lingkungan Kerja Pengujian**:
   - Seluruh logika pengujian dan pemantauan token beroperasi di Node.js server lokal port 8080. Server Nginx produksi murni hanya menyajikan frontend web publik yang sudah bersih dan teruji.


