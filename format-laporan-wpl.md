# Standar & Protokol Pembuatan Dokumen Workshop Pemrograman Lanjut (WPL)

> **Kepatuhan Protokol & Mekanisme Kloning**: Dokumen spesifikasi ini mengikat alur pembuatan seluruh modul WPL berikutnya.  
> **Prinsip Utama**: Dokumen baru **WAJIB DIBUAT DENGAN CARA MENG-COPY LANGSUNG** file master **`Praktikum 1.docx`** sebagai basis template untuk mewarisi seluruh style, ukuran kertas F4, margin, dan format OpenXML bawaan.  
> **Fitur Sinkronisasi Balik (Auto-Sync)**: Setiap kali pengguna memodifikasi atau memperbaiki berkas Word hasil generate, sistem pengawas (*watcher*) akan otomatis mendeteksi perubahan dan memperbarui dokumen `.md` ini.

---

## I. Alur Kerja Pembuatan Dokumen Baru (Cloning Method)

Setiap pembuatan modul tugas baru (Modul 2, Modul 3, dst.):
1. **Salin Berkas Master**: Salin berkas `Praktikum 1.docx` menjadi berkas tujuan (misal: `Praktikum [N].docx`).
2. **Kosongkan Isi Dokumen Lama**: Buka dokumen salinan via Word Automation, bersihkan teks isi (`doc.Content.Delete()`) tanpa merusak style dictionary dan Page Setup.
3. **Bangun Konten Sesuai Struktur Baku**: Masukkan Judul, Nomor Percobaan, Tabel Code 1x1, Output Gambar, dan Analisa.
4. **Ekspor Otomatis ke PDF**: Gunakan mesin Microsoft Word asli (`ExportAsFixedFormat`) untuk menghasilkan file PDF 100% presisi.

---

## II. Spesifikasi Halaman & Tata Letak (Page Setup)

Diwarisi 100% langsung dari `Praktikum 1.docx`:

| Parameter | Ukuran Metrik | Nilai OpenXML (Twips) | Keterangan |
| :--- | :--- | :--- | :--- |
| **Ukuran Kertas** | **F4 / Folio (21.59 cm x 33.02 cm)** | `w: 12240`, `h: 18720` | Kertas standar praktikum PENS (`code: 149`) |
| **Margin Kiri (Left)** | **3.0 cm** | `1701 twips` | Ruang penjilidan berkas |
| **Margin Atas (Top)** | **2.0 cm** | `1134 twips` | Rata atas |
| **Margin Kanan (Right)** | **2.0 cm** | `1134 twips` | Rata kanan |
| **Margin Bawah (Bottom)** | **2.0 cm** | `1134 twips` | Rata bawah |
| **Orientasi** | **Portrait (Tegak)** | Single continuous section | Rapi tanpa selisih |

---

## III. Aturan Hirarki Style Word (Wajib Diikuti 100%)

Sesuai instruksi baku pembaruan:

### 1. Judul Dokumen $\rightarrow$ Style: `No Spacing`
- **Penerapan**: Judul utama di awal dokumen (misal: `Praktikum 2: Operator dan Assignment`).
- **Gaya Bawaan `No Spacing` Modul 1**:
  - Ukuran: **14 pt** (`val: 28`)
  - Format: **Bold (Tebal)**
  - Warna: **Hitam** (`000000`, `text1`)
  - Line Spacing: **1.0 (Single)** tanpa jarak paragraf ekstra.

### 2. Nomor Praktikum / Sub-Judul Percobaan $\rightarrow$ Style: `Heading 1`
- **Penerapan**: Setiap judul nomor percobaan (misal: `Prak 1. Ternary operator 1`, `Prak 2. Divide dan modulo`).
- **Gaya Bawaan `Heading 1` Modul 1**:
  - Ukuran: **14 pt** (`val: 28`)
  - Format: **Bold (Tebal)**
  - Spacing: Spacing After **12 pt** (`after: 240`), Line Spacing **1.0**.

### 3. Listing Kode Program $\rightarrow$ **Tabel 1x1 (Single Cell Table)**
- **Penerapan**: Sebelum memasukkan kode, buat **Tabel 1x1 (1 baris, 1 kolom)**, lalu *paste* kode di dalam tabel tersebut.
- **Tujuan**: Membentuk *code-box* yang rapi, berbingkai jelas, dan terisolasi dari teks biasa.
- **Spesifikasi Tabel Code**:
  - Border: Garis tepi aktif (`Borders.Enable = true`).
  - Font di dalam tabel: `Consolas` atau `Courier New`, ukuran **10 pt**.
  - Paragraph format: Line spacing single, space before/after 2 pt.

### 4. Tangkapan Layar Eksekusi $\rightarrow$ **Output Ditaruh Setelah Code**
- **Penerapan**: Ditempatkan tepat di bawah tabel kode dengan label `Output:`.
- **Spesifikasi Gambar**:
  - Tangkapan layar terminal asli (PowerShell / Command Prompt) dengan latar belakang gelap kontras.
  - Lebar gambar diset tepat **15.2 cm** (memenuhi batas margin aktif kertas F4 tanpa terpotong).

### 5. Analisis Hasil $\rightarrow$ **Analisa Ditaruh Setelah Output**
- **Penerapan**: Ditempatkan setelah gambar output dengan label `Analisa:`.
- **Format**:
  - Teks menggunakan font `Times New Roman 12 pt`.
  - Format poin peluru (*bullet points* `•`) menjelaskan logika program, hasil perbandingan bitwise, operator aritmatika/relasional, dan alasan teknis output.

---

## IV. Diagram Urutan Alur Tiap Percobaan

```
┌─────────────────────────────────────────────────────────────┐
│ Heading 1 : Prak N. [Nama Percobaan]                       │
├─────────────────────────────────────────────────────────────┤
│ Normal    : Code:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ TABEL 1x1 (Font Consolas 10pt)                          │ │
│ │ class PrakN { ... }                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Normal    : Output:                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ GAMBAR SCREENSHOT TERMINAL (Lebar 15.2 cm)              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Normal    : Analisa:                                        │
│ • Poin analisa 1                                            │
│ • Poin analisa 2                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## V. Skrip Generator Baku (Word COM PowerShell)

```powershell
# Buka salinan dari Praktikum 1.docx
$doc = $word.Documents.Open($targetDocxPath)
$doc.Content.Delete()

# 1. Judul dengan "No Spacing"
$selection.Style = $doc.Styles.Item("No Spacing")
$selection.TypeText("Praktikum N: [Judul Topik]")
$selection.TypeParagraph()

foreach ($item in $listPercobaan) {
    # 2. Heading 1 untuk nomor
    $selection.Style = $doc.Styles.Item("Heading 1")
    $selection.TypeText($item.Title)
    $selection.TypeParagraph()

    # 3. Code dalam Tabel 1x1
    $selection.Style = $doc.Styles.Item("Normal")
    $selection.TypeText("Code:")
    $selection.TypeParagraph()

    $table = $doc.Tables.Add($selection.Range, 1, 1)
    $table.Borders.Enable = $true
    $table.Cell(1, 1).Range.Text = $item.Code
    $table.Cell(1, 1).Range.Font.Name = "Consolas"
    $table.Cell(1, 1).Range.Font.Size = 10

    # 4. Output setelah code
    $selection.SetRange($table.Range.End + 1, $table.Range.End + 1)
    $selection.TypeText("Output:")
    $selection.TypeParagraph()
    $shape = $doc.InlineShapes.AddPicture($item.ImagePath, $false, $true)
    $shape.Width = 15.2 * 28.3465

    # 5. Analisa setelah output
    $selection.TypeParagraph()
    $selection.TypeText("Analisa:")
    $selection.TypeParagraph()
    foreach ($a in $item.Analysis) {
        $selection.TypeText("• $a")
        $selection.TypeParagraph()
    }
}
$doc.Save()
$doc.ExportAsFixedFormat($pdfPath, 17)
```

---

## VI. Layanan Sinkronisasi Balik Otomatis (Auto-Sync Watcher)

Tersedia daemon pengawas di latar belakang:
- Skrip: `watch-docx-sync-md.ps1`
- Cara kerja: Memantau folder perkuliahan menggunakan `System.IO.FileSystemWatcher`.
- Setiap kali Anda melakukan *Save* pada file Word (`.docx`), sistem akan:
  1. Menginspeksi struktur style baru yang Anda terapkan.
  2. Menganalisis perubahan tabel, font, heading, atau margin.
  3. Memperbarui dokumen `format-laporan-wpl.md` ini secara instan pada bagian log riwayat penyesuaian.

---

## VII. Log Riwayat Sinkronisasi Pembaruan

| Tanggal & Waktu | Sumber Perubahan | Rincian Modifikasi |
| :--- | :--- | :--- |
| **2026-09-15 14:00** | Pembuatan Awal Modul 1 | Ekstraksi format baku Modul 1 (F4, Margin 3-2-2-2, TNR 12pt). |
| **2026-09-15 14:28** | Masukan & Penyesuaian Pengguna | 1. Mengubah basis dokumen menjadi **copy langsung dari `Praktikum 1.docx`**.<br>2. Menetapkan style **`No Spacing`** untuk Judul dokumen.<br>3. Menetapkan style **`Heading 1`** untuk nomor praktikum.<br>4. Mewajibkan penempatan kode program di dalam **Tabel 1x1**.<br>5. Menetapkan urutan kaku: **Code $\rightarrow$ Output $\rightarrow$ Analisa**.<br>6. Menambahkan mekanisme auto-sync berkas `.md`. |
