# 📚 Koleksi Skill Humanizer & Anti-AI (Agentic Awesome Skills)

Koleksi skill ini diunduh langsung dari repositori resmi [sickn33/agentic-awesome-skills](https://github.com/sickn33/agentic-awesome-skills) untuk membantu menghilangkan gaya bahasa kaku khas AI (*AI-tells*, *AI-isms*, dan basa-basi robotik), serta menjadikan tulisan lebih mengalir natural seperti ditulis oleh manusia asli.

> **Catatan:** Skill berbahasa Mandarin (`humanize-chinese` dan `de-ai-writer`) telah dikecualikan sesuai permintaan.

---

## 🗂️ Daftar Skill yang Diunduh

### 1. `avoid-ai-writing`
- **Fokus:** Menghapus 21 kategori pola penulisan khas AI dan tabel pengganti 43 kata/frasa klise (*leverage* ➔ *use*, *robust* ➔ *reliable*, *embark on a journey*, *testament to*, dsb.).
- **Kapan Digunakan:** Sebelum mempublikasikan dokumentasi, artikel, README, atau teks apa pun yang terdengar seperti hasil *prompting* AI.

### 2. `unslop`
- **Fokus:** Pemrosesan deterministik untuk membersihkan pola tulisan AI secara otomatis.
- **Kapan Digunakan:** Sebagai *final check* sebelum commit, merge PR, atau publikasi teks ke produksi.

### 3. `unslop-file`
- **Fokus:** *Deep humanization* khusus untuk berkas dokumen (`.md`, `.txt`, `.rst`). Membersihkan teks narasi tanpa merusak blok kode teknis (`code blocks`) dan URL.
- **Kapan Digunakan:** Untuk merevisi satu file Markdown penuh agar tidak terkesan dibuat oleh chatbot.

### 4. `unslop-commit`
- **Fokus:** Menulis ulang pesan commit Git agar ringkas, padat, dan bergaya bahasa engineer sungguhan (format *Conventional Commits*), tanpa basa-basi *"This commit implements a comprehensive and robust..."*.
- **Kapan Digunakan:** Saat membuat commit pesan Git sebelum push.

### 5. `unslop-review`
- **Fokus:** Mengubah komentar review kode (*pull request review*) agar lugas, ramah, dan berorientasi solusi tanpa kesopanan berlebih khas AI (*corporate throat-clearing*).
- **Kapan Digunakan:** Saat memberikan masukan pada review kode PR.

---

## 🛠️ Status Integrasi Antigravity
Seluruh skill di atas juga telah disalin ke folder **`.agents/skills/`** sehingga AI Agent di lingkungan kerja ini dapat langsung membaca dan menggunakannya saat diperintahkan.
