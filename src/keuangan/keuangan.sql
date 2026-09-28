-- =========================================================
-- SKEMA TABEL TRANSAKSI KEUANGAN (MONEY / EXPENSE TRACKER)
-- Database: MySQL / MariaDB
-- =========================================================

CREATE TABLE IF NOT EXISTS keuangan_transaksi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATETIME NOT NULL,
  jenis VARCHAR(50),              -- 'Pembayaran QR', 'Transfer (BI FAST)', dll
  tujuan VARCHAR(255),            -- Merchant / Nama Rekening Penerima
  nominal DECIMAL(12,2) NOT NULL,
  biaya_admin DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  no_referensi VARCHAR(100),
  kategori VARCHAR(50) NOT NULL,  -- 'Makanan', 'Belanja', 'Kos/Sewa', dll
  bukti_gambar LONGTEXT,          -- Gambar bukti transaksi (Base64 atau URL path)
  teks_mentah TEXT,                -- Teks asli dari struk untuk audit/re-parsing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeks untuk query analitik cepat
CREATE INDEX idx_keuangan_tanggal ON keuangan_transaksi (tanggal);
CREATE INDEX idx_keuangan_kategori ON keuangan_transaksi (kategori);
