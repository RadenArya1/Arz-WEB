---
name: master-humanizer
description: "Unified AI Humanizer & Tone Engine: audits & rewrites prose to remove 21 categories of AI-isms, strips robotic throat-clearing, crafts engineer-grade Git commits, and formats honest code reviews."
category: writing
risk: safe
tags: [humanizer, unslop, avoid-ai-writing, natural-writing, clean-prose, git-commit, code-review]
---

# Master Humanizer — Natural Language & Anti-AI Playbook

Master Humanizer menggabungkan 5 skill penulisan esensial (`avoid-ai-writing`, `unslop`, `unslop-file`, `unslop-commit`, dan `unslop-review`) menjadi satu panduan terpadu untuk menghilangkan seluruh ciri khas tulisan kaku robotik (*AI-tells*, *AI-isms*, dan *corporate throat-clearing*).

---

## 🎯 Filosofi Inti: "Write Like a Real Human"
1. **Burstiness & Variasi Ritme**: AI cenderung menghasilkan kalimat dengan panjang dan struktur yang monoton. Tulisan manusia memiliki variasi alami: kalimat pendek yang tegas berselingan dengan kalimat penjelas yang mengalir.
2. **Hapus Basa-Basi (*Zero Throat-Clearing*)**: Langsung ke inti masalah. Jangan gunakan pembuka hampa seperti *"In today's fast-paced digital world..."*, *"It is important to remember that..."*, atau *"I would kindly suggest..."*.
3. **Konkret & Faktual**: Jangan mendandani teks dengan kata sifat hiperbolis (*revolutionary*, *cutting-edge*, *comprehensive*). Biarkan fakta dan kode berbicara sendiri.

---

## 📖 MODUL 1: Deteksi AI-isms & Tabel Pengganti 43 Kata Klise

Setiap kali mengaudit atau menulis teks, lakukan pemindaian terhadap kata/frasa klise AI berikut dan ganti dengan padanan yang lebih membumi:

| Kata / Frasa Klise AI | Pengganti Alami Manusia | Catatan Kontekstual |
| :--- | :--- | :--- |
| **leverage** | **use**, **rely on** | Jangan pernah gunakan *leverage* jika artinya hanya menggunakan. |
| **utilize** | **use** | *Utilize* adalah kata formal berlebihan untuk *use*. |
| **robust** | **reliable**, **solid**, **stable** | Sangat sering menjadi penanda kuat teks buatan AI. |
| **seamless / seamlessly** | **smooth**, **easy**, atau hapus | Sering menjadi klaim pemasaran kosong. |
| **testament to** | **shows**, **proves** | Frasa hiperbolis yang sering diulang AI. |
| **embark on a journey** | **start**, **begin** | Hindari metafora perjalanan fiksi dalam konteks teknis/bisnis. |
| **cutting-edge** | **modern**, **new** | Gunakan deskripsi spesifik daripada label pemasaran. |
| **pivotal / paramount** | **key**, **critical**, **important** | Penyederhanaan nada bicara. |
| **delve / dive into** | **explore**, **examine**, atau hapus | Basa-basi pembuka khas chatbot. |
| **foster / nurturing** | **encourage**, **support**, **build** | Gaya bahasa LSM/korporat kaku. |
| **in today's ... landscape** | *Hapus seluruh klausa* | Mulai langsung dengan subjek dan aksi nyata. |
| **moreover / furthermore** | **also**, **and**, atau kalimat baru | Penanda transisi kaku esai akademis AI. |
| **comprehensive** | **complete**, **thorough**, **full** | Sering dipakai AI tanpa substansi nyata. |
| **game-changer** | **helpful**, **major improvement** | Hindari sensasionalisme kosong. |

### 21 Kategori Pola AI yang Wajib Dihapus:
1. *Significance Inflation* (melebih-lebihkan dampak fitur kecil).
2. *Superficial -ing Analyses* (analisis gantung: *"highlighting the importance of..."*).
3. *Rule of Three* (memaksakan tepat 3 kata sifat/poin tanpa alasan).
4. *Hollow Intensifiers* (kata penguat hampa: *crucially*, *deeply*, *truly*).
5. *Hedging Berlebih* (*"It might be worth potentially considering..."*).
6. *Generic Conclusions* (*"In conclusion, the future of X looks bright"*).

---

## 📄 MODUL 2: Deep File & Markdown Humanizer (`unslop-file`)

Saat membersihkan atau menulis ulang berkas dokumen (`.md`, `.txt`, `.rst`):
1. **Preservasi Blok Kode 100%**:
   - Seluruh blok kode (` ``` `), baris kode inline (`` `code` ``), URL, nama variabel, dan tabel **DILARANG DIUBAH**.
   - Hanya teks narasi/paragraf penjelas yang dihumanisasi.
2. **Pertahankan Fakta**:
   - Jangan menambahkan fakta/klaim baru yang tidak ada pada sumber aslinya.
   - Jangan menghapus peringatan teknis atau batasan keamanan (*security caveats*).
3. **Format Bersih**:
   - Hapus bullet points berantai jika paragraf ringkas 2 baris lebih nyaman dibaca.
   - Hindari header dengan terlalu banyak emoji dekoratif yang tidak fungsional.

---

## 🛠️ MODUL 3: Humanizer Pesan Git Commit (`unslop-commit`)

Saat membuat atau merumuskan pesan commit Git:

### Aturan Format:
- **Format Baku**: `<type>(<scope>): <ringkasan imperatif>`
- **Panjang Baris Pertama**: Maksimal 50–72 karakter, huruf kecil setelah titik dua, tanpa titik di akhir.
- **Kata Kerja Imperatif**: Gunakan `add`, `fix`, `refactor`, `docs`, `chore` (bukan `added`, `fixes`, `fixing`).

### ❌ Dilarang Keras:
- Menggunakan awalan template: *"This commit implements..."*, *"I have updated..."*.
- Menggunakan kata sifat promosi: *"feat: add a robust, comprehensive, cutting-edge authentication system"*.

### ✅ Contoh Nyata:
- **Buruk (Gaya AI)**: `feat: implement a comprehensive solution for user profile retrieval with enhanced error handling`
- **Benar (Human Engineer)**: `feat(api): return profile fields needed by mobile client`
- **Buruk (Gaya AI)**: `fix: resolve critical issues in payment calculation algorithm`
- **Benar (Human Engineer)**: `fix(checkout): prevent duplicate discount on coupon re-entry`

---

## 🔍 MODUL 4: Humanizer Review Kode PR (`unslop-review`)

Saat memberikan masukan (*code review*) pada Pull Request:

### Aturan Format:
`L<baris>: <kategori>: <observasi langsung>. <solusi konkret>.`

- Kategori severity:
  - `bug:` — Kode rusak atau berpotensi meledak saat dijalankan.
  - `risk:` — Bekerja hari ini, namun rentan patah di masa depan (race condition, timeout).
  - `nit:` — Masalah gaya kode, nama variabel, atau kode mati (*dead code*).
  - `q:` — Pertanyaan tulus tentang arsitektur, bukan keluhan terselubung.

### ❌ Dilarang Keras:
- Basa-basi pemanis: *"Great work on this PR! However, I was wondering if perhaps..."*.
- Menjelaskan ulang isi diff yang sudah jelas terlihat.
- Opini tanpa solusi: *"Ini jelek"* tanpa memberi alternatif kode perbaikan.

### ✅ Contoh Nyata:
- **Buruk**: `I would kindly suggest that we might want to potentially consider adding a null check here as it could maybe lead to issues.`
- **Benar**: `L42: bug: 'findUser' returns undefined saat email tidak cocok. Tambahkan guard sebelum akses 'user.email' atau return 404.`

---

## ⚡ Perintah Cepat / Trigger Word:
- `"humanize <teks/file>"` ➔ Audit dan hilangkan AI-isms pada teks atau file dokumen.
- `"unslop-commit"` ➔ Buatkan pesan commit bergaya human engineer.
- `"unslop-review"` ➔ Format masukan PR menjadi komentar langsung dan solutif.
