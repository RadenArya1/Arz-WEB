---
name: master-frontend-studio
description: "Unified Frontend & UI/UX Studio: definitive synthesis merging Vercel design guidelines, ui-ux-pro-max intelligence, anti-slop-design matrix, 4 production archetypes, 4-state component lifecycle, 8-state interactive systems, concentric radii math, mobile-first ergonomics, and clean web architecture."
category: frontend
risk: safe
tags: [frontend, ui-ux-pro-max, anti-slop-design, vercel-design, design-system, css, dark-mode, mobile-responsive, cyber-grimoire, tailwind]
---

# Master Frontend Studio — The Unified Ultimate UI/UX & Anti-Slop Playbook

**Master Frontend Studio** adalah penggabungan definitif dari:
1. **Master UI Studio Klasik**: Standar desain Vercel, arsitektur *Separation of Concerns*, siklus 4 State UI (Loading, Empty, Error, Populated), dan audit ergonomi *mobile-first*.
2. **Kecerdasan `ui-ux-pro-max` & `anti-slop-design` Terbaru**: Matriks 12 anti-pattern AI terlarang, 4 arketipe token produksi HSL/OKLCH, sistem interaksi 8-state, rumus geometri konsentris (*concentric radii*), dan eliminasi *number jitter*.

Playbook ini mengikat seluruh ekosistem **Arz-WEB** (Grimoire Dashboard, Arcanum Finance, Ethol Notifier, dan aplikasi web mandiri masa depan).

---

## 🚫 PILAR 1: The Anti-Slop Banned Matrix (12 Anti-Pattern AI Terlarang & Hard Finish Gate)

Setiap kode CSS, HTML, dan komponen web **WAJIB lolos dari 12 cacat desain generik berikut**:

| Cacat AI Slop | Bentuk di Kode AI Biasa | Pengganti Wajib Standar Produksi |
| :--- | :--- | :--- |
| **"AI Dark Mode" Blob** | `radial-gradient` ungu/indigo buram di pojok background gelap polos. | Permukaan monokrom pekat (`#060a08`, `#09090b`) dengan *hairline border* 1px halus (`rgba(229,193,88,0.2)` / `rgba(255,255,255,0.08)`). |
| **Monoton Slate/Indigo** | Template Tailwind standar `bg-slate-900 text-slate-400 bg-indigo-600`. | Token semantik kurasi HSL/OKLCH dengan identitas kuat (Arcane Gold, Emerald Precision, Crimson Alert). |
| **Grid 3 Kartu Klise** | 3 kotak identik bersebelahan dengan border menyala saat hover. | Tata letak asimetris, bento-grid modular, atau susunan alur kerja vertikal yang dipandu data. |
| **Emoji Mentah Sebagai Ikon** | Menempelkan emoji (`🚀`, `🔥`, `💡`, `📊`) di tombol dan navbar. | Ikon vektor SVG tunggal berbobot seragam (FontAwesome, Lucide, Phosphor) stroke 1.5px/2px. |
| **Metrik Palsu (Vanity Stats)** | Kartu hiasan tanpa sumber data (`+99.9% Speed`, `10x Faster`). | Data telemetri nyata dari server atau hilangkan kartu tersebut sepenuhnya. |
| **Screaming Eyebrow Labels** | Label huruf kapital berjarak renggang di atas judul: `FEATURES`, `OVERVIEW`. | Hierarki kalimat natural (*sentence-case*) atau hilangkan jika judul sudah jelas. |
| **Aksen Warna Sepatah Kata** | Judul dengan 1 kata acak dicetak miring dengan gradien teks menyala. | Bobot tipografi seragam dan berwibawa tanpa teks gradien pelangi murahan. |
| **Duplikasi Metrik** | Mengulang angka revenue/kunjungan di header, sidebar, dan kartu. | *Single Source of Metric Truth*: ringkasan KPI tunggal di atas, detail di bawah. |
| **Filter Tersebar di Tiap Kartu** | Menaruh date picker atau dropdown di setiap card kecil. | Satu *Page-Level Control Bar* terpusat yang mengatur seluruh view di bawahnya. |
| **Elemen Hiasan Pemboros Layar** | Globe 3D atau peta raksasa memakan 60% layar tanpa data interaktif. | Bar chart horizontal kompak, sparklines, atau tabel data dengan komparasi riil. |
| **Interactive State Bolong** | Tombol hanya punya hover, tanpa `:focus-visible`, `:active`, loading, & disabled. | **8-State Interactive System** lengkap pada setiap tombol dan input. |
| **Placeholder Rusak** | Tautan gambar mati `via.placeholder.com` atau avatar pecah. | Inline SVG geometris, monokrom identicon lokal, atau aset yang terverifikasi ada di disk. |

### Hard Finish Gate Checklist:
Sebelum kode diserahkan atau di-deploy:
- [ ] Tidak ada teks yang terpotong jelek saat panjang (`text-overflow: ellipsis; overflow-wrap: anywhere;`).
- [ ] Transisi antarmuka bebas dari patahan kaku (wajib memakai kurva bezier presisi).
- [ ] Struktur HTML bebas dari *div soup* (gunakan tag semantik).

---

## 🎨 PILAR 2: 4 Arketipe Token Desain Produksi (Design Archetypes)

Pilih salah satu dari 4 arketipe token berikut sesuai fungsi halaman web:

### Arketipe A: Cyber-Grimoire & Translucent Dark (Standar Utama Arz-WEB)
Khusus untuk **Grimoire Dashboard**, terminal telemetri, dan modul portal:
```css
:root {
  --bg-canvas: #06080d;
  --bg-surface: rgba(13, 17, 26, 0.75);
  --bg-surface-elevated: rgba(22, 29, 44, 0.88);
  --glass-border: 1px solid rgba(212, 175, 55, 0.18);
  --glass-border-hover: 1px solid rgba(212, 175, 55, 0.45);
  --glass-blur: blur(14px);
  --accent-gold: hsl(43, 74%, 49%);       /* Arcane Gold */
  --accent-emerald: hsl(158, 64%, 45%);   /* Active Status */
  --accent-amber: hsl(38, 92%, 50%);      /* Warning / WIP */
  --accent-crimson: hsl(348, 83%, 47%);   /* Error / Alert */
  --text-primary: #f0f3f8;
  --text-secondary: #9aa5b8;
  --text-muted: #5e697a;
  --font-display: 'Cinzel', serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

### Arketipe B: Technical Dense Workspace (DevTools & FinTech Arcanum)
Khusus untuk **Arcanum Finance**, tabel audit cashflow, dan konsol server:
```css
:root {
  --bg-canvas: #060a08;
  --bg-surface: rgba(13, 24, 17, 0.78);
  --bg-surface-elevated: rgba(18, 34, 24, 0.88);
  --border-subtle: rgba(229, 193, 88, 0.22);
  --border-glow: #e5c158;
  --accent-primary: #22c55e; /* Emerald Precision */
  --accent-secondary: #f59e0b; /* Amber */
  --accent-danger: #ef4444; /* Crimson Alert */
  --text-primary: #f0f6f0;
  --text-secondary: #8fa892;
  --font-mono: 'JetBrains Mono', monospace;
  --tabular-nums: tabular-nums;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

### Arketipe C: Quiet Luxury SaaS (Web App Publik & Portofolio Vercel Style)
Khusus untuk portofolio publik, lab landing page, dan showcase bersih:
```css
:root {
  --bg-canvas: #09090b;
  --bg-surface: #121215;
  --bg-surface-elevated: #18181c;
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.18);
  --accent-primary: #3b82f6;
  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}
```

### Arketipe D: Warm Editorial / Parchment (Halaman Dokumen & Log Sejarah)
Khusus untuk pembaca markdown, dokumen log, dan catatan arsip:
```css
:root {
  --bg-canvas: #faf8f5;
  --bg-surface: #ffffff;
  --border-subtle: #e8e4df;
  --accent-primary: #2d261e;
  --text-primary: #1a1918;
  --text-secondary: #635f59;
  --font-display: 'Cinzel', 'Playfair Display', serif;
}
```

---

## 📐 PILAR 3: Mikro-Geometri, Spasi 8-Point & Tabular Numerics

### 1. Rumus Radius Konsentris Wajib (Concentric Radii)
Radius sudut elemen bagian dalam **wajib** proporsional dengan radius kontainer luarnya dikurangi jarak padding:
$$\text{radius\_inner} = \max(0, \text{radius\_outer} - \text{padding})$$
*Contoh:* Kartu luar beradius `16px` dengan padding `12px` $\rightarrow$ tombol di dalamnya wajib beradius `4px`, bukan `16px` dan bukan `0px`.

### 2. Ritme Spasi 8-Point
Gunakan kelipatan presisi: `4px` (hairline/gap mikro), `8px` (jarak ikon & teks), `12px` (padding tombol standar), `16px` (padding kartu/kontainer), `24px` (jarak antar-seksi), `32px` / `48px` (margin makro).

### 3. Tabular Numerics (Anti-Jitter Rule)
Semua angka mata uang (Rp / IDR), jam/menit, persentase progress, jumlah data, dan tanggal **wajib menggunakan font monospace atau `font-variant-numeric: tabular-nums`** agar angka tidak bergeser atau bergetar saat nilainya diperbarui secara dinamis.

---

## 🔄 PILAR 4: Siklus Komponen Lengkap (4 State Halaman + 8 State Interaktif)

### A. 4 State Wajib Komponen Data (Vercel Guidelines):
Jangan pernah hanya mendesain state "ada data":
1. **Loading State**: Skeleton bar beranimasi shimmer halus (bukan spinner berputar yang membuat layout melompat).
2. **Empty State**: Ikon/ilustrasi relevan bertema grimoire, teks penjelas ramah, dan tombol aksi pembuka data baru (*Call to Action*).
3. **Error State**: Pesan kegagalan manusiawi dengan tombol coba lagi (*retry button*).
4. **Populated State**: Tampilan kartu/tabel terisi dengan angka tabular rapi dan visual kontras tinggi.

### B. 8-State Interactive System pada Tombol & Form:
1. `Default`: Permukaan bersih dengan border subtle.
2. `:hover`: Elevasi mikro (`transform: translateY(-2px)`), border lebih terang, bayangan lembut.
3. `:active`: Efek tekan fisik pegas (`transform: translateY(0) scale(0.96)`).
4. `:focus-visible`: Cincin fokus kontras tinggi 2px dengan offset 2px (`outline: 2px solid var(--accent); outline-offset: 2px;`).
5. `Disabled`: Opacity 0.45, `cursor: not-allowed`, matikan pointer-events pada elemen non-form.
6. `Loading`: Tombol terkunci, spinner mikro atau skeleton loader terpasang tanpa membuat ukuran tombol membesar/mengecil.
7. `Success`: Kilatan status warna emerald sesaat.
8. `Error`: Getaran mikro (*shake animation*) dengan border warna crimson dan pesan error inline di bawah input.

---

## 📱 PILAR 5: Ergonomi Mobile-First & Aksesibilitas WCAG

1. **Zero Horizontal Overflow Mutlak**:
   - Kontainer root wajib memiliki `max-width: 100vw; overflow-x: hidden;`.
   - Seluruh tabel data wajib dibungkus kontainer geser horizontal:
     ```css
     .table-scroll-container {
       width: 100%;
       overflow-x: auto;
       -webkit-overflow-scrolling: touch;
     }
     ```
2. **Thumb-Friendly Touch Targets**:
   - Area klik/sentuh tombol, switcher, dan link menu pada perangkat mobile wajib minimal **40px $\times$ 40px** hingga **44px $\times$ 44px**.
   - Jarak antar-tombol sentuh minimal **8px - 12px** untuk mencegah salah sentuh (*fat-finger error*).
3. **Adaptive Stacking**:
   - Grid 2-kolom atau 4-kolom pada desktop wajib bertransformasi rapi menjadi susunan 1-kolom vertikal pada layar smartphone (~360px - 480px).
4. **Standar Kontras Warna WCAG AA**:
   - Rasio kontras teks terhadap latar belakang wajib minimal **4.5:1** untuk teks biasa dan **3:1** untuk teks besar (bold $\ge$ 18px).
   - Selalu berikan teks bayangan (*text-shadow*) atau kontras lapisan jika teks ditaruh di atas kaca transparan.

---

## 🎬 PILAR 6: Micro-Interactions & Animasi Kinetik Halus

1. **Transisi Kurva Bezier Berwibawa**:
   - ❌ Hindari: `transition: all 0.5s ease;`
   - ✅ Gunakan:
     ```css
     transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                 box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                 border-color 0.15s ease;
     ```
2. **Animasi Kemunculan Modal / Popover**:
   ```css
   @keyframes modalEnter {
     from { opacity: 0; transform: scale(0.94) translateY(8px); }
     to   { opacity: 1; transform: scale(1) translateY(0); }
   }
   ```
3. **Penghormatan Preferensi Pengguna**:
   Sertakan `@media (prefers-reduced-motion: reduce)` untuk mematikan animasi bagi pengguna yang rentan disorientasi gerak.

---

## 🧩 PILAR 7: Arsitektur Komponen, Semantic HTML & Clean Code

1. **Pemisahan Logika & Tampilan (*Separation of Concerns*)**:
   - Komponen UI bertugas murni merender state dan menangani interaksi pengguna.
   - Logika panggilan jaringan (API / fetch), parsing regex data, dan cache lokal dipisahkan ke modul service/helper terdedikasi (misal: `parser.js`, `storage.js`).
2. **SEO & Semantic HTML**:
   - Setiap halaman wajib memuat tag `<title>` yang jelas, `<meta name="description">`, dan satu tag `<h1>` per halaman.
   - Gunakan elemen semantik HTML5 (`<main>`, `<nav>`, `<aside>`, `<header>`, `<article>`) alih-alih `<div>` bersarang tanpa akhir (*div soup*).

---

## ⚡ PILAR 8: Perintah Cepat / Trigger Words

- `"anti-ui-slop"` ➔ Jalankan inspeksi kualitas desain dan bersihkan elemen yang generik/murahan.
- `"mobile-fit-audit"` ➔ Audit apakah seluruh elemen bebas horizontal overflow dan ramah jempol HP.
- `"polish-ui"` ➔ Terapkan glassmorphism berlapis, ambient glow, dan mikro-interaksi kinetik.
- `"apply-archetype [A|B|C|D]"` ➔ Terapkan paket token desain yang sesuai pada halaman target.
