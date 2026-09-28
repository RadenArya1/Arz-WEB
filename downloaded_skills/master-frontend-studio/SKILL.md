---
name: master-frontend-studio
description: "Unified Frontend & UI/UX Studio: combines Anti-UI-Slop standards, Vercel design guidelines, modern design tokens, mobile-first ergonomics, micro-animations, and production web architecture."
category: frontend
risk: safe
tags: [frontend, anti-ui-slop, ui-ux, design-system, tailwind, responsive, web-design, react, dark-mode]
---

# Master Frontend Studio — Complete UI/UX Engineering Playbook

Master Frontend Studio menggabungkan 15 skill rekayasa antarmuka terbaik (antara lain `anti-ui-slop`, `web-design-guidelines`, `ui-ux-pro-max`, `design-taste-frontend`, `frontend-architecture`, `design-system`, dan `tailwind-patterns`) menjadi satu pedoman baku produksi web berkualitas tinggi (*world-class web aesthetics*).

---

## 🏛️ PILAR 1: Anti-UI-Slop & Quality Hard Gate

AI sering kali menghasilkan tampilan antarmuka yang membosankan, murahan (*vibe-coded slop*), atau tidak lengkap. Setiap komponen atau halaman web **WAJIB memenuhi 4 syarat mutlak berikut**:

### 1. Wajib Melengkapi 4 State UI:
Jangan hanya mendesain state "sukses/berisi data". Seluruh komponen interaktif wajib menangani:
- **Loading State**: Skeleton loader atau subtle glowing indicator (bukan spinner kasar yang membuat layout bergetar).
- **Empty State**: Ilustrasi/ikon relevan, teks edukatif ramah, dan tombol aksi pemanggil (*Call to Action*).
- **Error State**: Pesan kegagalan manusiawi dengan opsi coba lagi (*retry button*).
- **Active / Populated State**: Tampilan data normal dengan tipografi tajam.

### 2. Eliminasi Warna Generik (*Tailored HSL Palette*):
- ❌ **Dilarang**: Warna primer mentah browser (seperti `#ff0000` merah terang murni, `#0000ff` biru polos kaku).
- ✅ **Wajib**: Palet warna harmonis berbobot HSL:
  - *Dark Aura Background*: `#0a0d14`, `#0f1422`, atau `#121829` (bukan hitam pekat mati `#000000`).
  - *Accent & Glow*: Cyan elektrik (`hsl(190, 95%, 48%)`), Emerald (`hsl(158, 64%, 45%)`), atau Arcane Violet (`hsl(265, 85%, 66%)`).
  - *Glassmorphism*: `background: rgba(255, 255, 255, 0.03 - 0.08); backdrop-filter: blur(12px - 16px); border: 1px solid rgba(255, 255, 255, 0.08)`.

### 3. Hard Finish Gate:
Sebelum menyerahkan kode, wajib periksa:
- Apakah ada elemen yang terpotong saat teks panjang? (`text-overflow`, `break-word`).
- Apakah transisi tombol terasa instan dan kasar? (Wajib tambahkan `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).

---

## 📱 PILAR 2: Ergonomi Mobile-First & Touch Target

Sesuai standar performa dan aturan proyek Arz-WEB:

1. **Zero Horizontal Overflow**:
   - Seluruh kontainer utama wajib terkunci pada `max-width: 100vw; overflow-x: hidden;`.
   - Tabel data wajib selalu dibungkus dalam kontainer geser horizontal:
     ```css
     .table-scroll-container {
       width: 100%;
       overflow-x: auto;
       -webkit-overflow-scrolling: touch;
     }
     ```
2. **Thumb-Friendly Touch Ergonomics**:
   - Target sentuh untuk tombol, ikon klik, dan switcher wajib minimal **38px - 44px** agar nyaman ditekan oleh jempol satu tangan.
   - Jarak antar-tombol minimal **8px - 12px** untuk mencegah salah tekan (*fat-finger error*).
3. **Adaptive Stacking**:
   - Grid 2-kolom atau 4-kolom pada desktop wajib bertransformasi rapi menjadi susunan 1-kolom vertikal pada lebar layar smartphone (~360px - 480px).

---

## ✨ PILAR 3: Micro-Interactions & Estetika Visual (Vercel Guidelines)

1. **Feedback Sentuhan & Hover**:
   - Tombol utama wajib memiliki efek *elevation lift* halus saat di-hover (`transform: translateY(-2px); box-shadow: 0 8px 24px -4px rgba(...);`).
   - Efek *active press*: `transform: translateY(0) scale(0.98);`.
2. **Tipografi Modern**:
   - Gunakan font sans-serif modern (Inter, Plus Jakarta Sans, Outfit, atau Roboto) dengan hirarki berat yang jelas (`font-weight: 400`, `500`, `600`, `700`).
   - Rasio kontras teks terhadap latar belakang wajib memenuhi standar WCAG AA (minimal rasio 4.5:1).
3. **Smooth Micro-Transitions**:
   - Modal, dropdown, dan popover tidak boleh muncul seketika secara kaku. Berikan animasi pembuka *fade & slide*:
     ```css
     @keyframes modalEnter {
       from { opacity: 0; transform: scale(0.96) translateY(8px); }
       to   { opacity: 1; transform: scale(1) translateY(0); }
     }
     ```

---

## 🧩 PILAR 4: Arsitektur Komponen & Clean Architecture

1. **Pemisahan Logika & Tampilan (*Separation of Concerns*)**:
   - Komponen UI bertugas murni merender state dan menangani interaksi pengguna.
   - Logika panggilan jaringan (API / fetch), parsing regex data, dan cache lokal dipisahkan ke modul service/helper terdedikasi (misal: `parser.js`, `storage.js`).
2. **Design Tokens Terstandar**:
   - Tentukan variabel CSS di `:root` untuk seluruh satuan jarak (4px, 8px, 12px, 16px, 24px, 32px), radius sudut (`--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 16px`), dan palet warna.
3. **SEO & Semantic HTML**:
   - Setiap halaman wajib memuat tag `<title>` yang jelas, `<meta name="description">`, dan satu tag `<h1>` per halaman.
   - Gunakan elemen semantik HTML5 (`<main>`, `<nav>`, `<aside>`, `<header>`, `<article>`) alih-alih `<div>` bersarang tanpa akhir (*div soup*).

---

## ⚡ Perintah Cepat / Trigger Word:
- `"anti-ui-slop"` ➔ Jalankan inspeksi kualitas desain dan perbaiki elemen yang terkesan murahan/generik.
- `"mobile-fit-audit"` ➔ Audit apakah halaman bebas horizontal overflow dan ramah layar HP.
- `"polish-ui"` ➔ Berikan sentuhan glassmorphism, micro-animation, dan elevasi modern pada antarmuka.
