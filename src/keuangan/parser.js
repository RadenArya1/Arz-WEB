/* =========================================================
   FITUR: PARSER STRUK & BUKTI TRANSAKSI (RECEIPT PARSER)
   Ekstraksi Tanggal, Nominal, Merchant, Jenis, & Kategori Otomatis
   ========================================================= */

(function(root) {
  /**
   * Mengubah format tanggal DD/MM/YYYY HH:mm:ss menjadi YYYY-MM-DD HH:mm:ss
   */
  function normalizeDate(day, month, year, timeStr) {
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    const y = year.length === 2 ? '20' + year : year;
    return `${y}-${m}-${d} ${timeStr}`;
  }

  /**
   * Menormalkan teks nominal Rupiah (misal "Rp15.000,00" atau "Rp 18.400" atau "1,300,000.00")
   * menjadi bilangan integer murni (misal 15000, 18400, 1300000)
   */
  function cleanNominal(str) {
    if (!str) return 0;
    let clean = str.replace(/[^\d\.,]/g, '').trim();

    // Jika berakhiran ,00 atau .00 (desimal sen), buang bagian sen
    if (clean.endsWith(',00') || clean.endsWith('.00')) {
      clean = clean.slice(0, -3);
    }

    // Jika tersisa tanda koma atau titik sebagai pemisah ribuan
    clean = clean.replace(/[\.,]/g, '');
    const val = parseInt(clean, 10);
    return isNaN(val) ? 0 : val;
  }

  /**
   * Memeriksa apakah suatu teks adalah nominal mata uang atau metadata teknis yang bukan nama merchant
   */
  function isInvalidMerchant(str) {
    if (!str || typeof str !== 'string') return true;
    const s = str.trim();
    // Nominal mata uang murni (misal: "Rp17.000,00", "IDR 50,000.00", "Rp 21.000", "17000", "17.000,00")
    if (/^(?:rp\.?|idr)?\s*[\d\.,]+$/i.test(s)) return true;
    // Label pembayaran / status sistem / jenis transaksi
    if (/^total\s*(?:pembayaran)?/i.test(s)) return true;
    if (/^pembayaran\s*(?:qr|qris)?$/i.test(s)) return true;
    if (/^(?:berhasil|sukses|gagal|pending)$/i.test(s)) return true;
    if (/^(?:no\.?\s*transaksi|rrn|ref\b|terminal|merchant\s*pan|customer)/i.test(s)) return true;
    return false;
  }

  const INDO_MONTHS = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
  };

  /**
   * Parser Utama untuk Teks Bukti Transaksi (BCA QR, m-Transfer, Transfer Masuk, BI FAST, dll)
   */
  function parseReceiptText(rawText) {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return null;
    }

    const text = rawText.trim();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 0. Deteksi Arus Kas (Pemasukan vs Pengeluaran)
    let arus = 'pengeluaran'; // default
    if (/transfer masuk|pemasukan|dana masuk|uang masuk|cashflow\s*-\s*pemasukan/i.test(text)) {
      arus = 'pemasukan';
    }

    // 1. Deteksi Jenis Transaksi
    let jenis = arus === 'pemasukan' ? 'Transfer Masuk' : 'Pembayaran Lainnya';
    if (/tarikan\s*atm|tarik\s*tunai|atm/i.test(text)) {
      jenis = 'Tarik Tunai (ATM)';
    } else if (/pembayaran\s*qr/i.test(text) || /qris/i.test(text)) {
      jenis = 'Pembayaran QR';
    } else if (/bi\s*fast/i.test(text)) {
      jenis = 'Transfer (BI FAST)';
    } else if (/m-transfer/i.test(text) || /transfer/i.test(text)) {
      jenis = arus === 'pemasukan' ? 'Transfer Masuk' : 'Transfer Bank';
    }

    // 2. Ekstraksi Tanggal & Jam
    let tanggal = '';
    // Format A: DD/MM/YYYY atau DD-MM-YYYY
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(?:\-\s*)?(\d{1,2}:\d{2}(?::\d{2})?)/i);
    // Format B: 13 September 2026 atau tanggal 13 September 2026
    const indoDateMatch = text.match(/(?:tanggal\s+)?(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i);

    if (dateMatch) {
      const [, d, m, y, time] = dateMatch;
      const fullTime = time.split(':').length === 2 ? `${time}:00` : time;
      tanggal = normalizeDate(d, m, y, fullTime);
    } else if (indoDateMatch) {
      const [, d, mStr, y] = indoDateMatch;
      const mNum = INDO_MONTHS[mStr.toLowerCase()] || '09';
      // Cek apakah ada jam di teks (misal 19:16 atau 14:59)
      const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
      const time = timeMatch ? (timeMatch[1].split(':').length === 2 ? `${timeMatch[1]}:00` : timeMatch[1]) : '00:00:00';
      tanggal = normalizeDate(d, mNum, y, time);
    } else {
      // Fallback ke waktu sekarang jika tidak terdeteksi
      const now = new Date();
      tanggal = now.toISOString().replace('T', ' ').substring(0, 19);
    }

    // 3. Ekstraksi Nominal, Biaya Admin, & Total
    let nominal = 0;
    let biayaAdmin = 0;
    let total = 0;

    // Cari Pola Nominal: Transfer Masuk / Pengeluaran Sebesar / IDR / Total Pembayaran
    const transferMasukMatch = text.match(/Transfer\s*masuk\s*sebesar\s*(?:IDR|Rp\.?)\s*([0-9\.\,]+)/i);
    const pengeluaranSebesarMatch = text.match(/Pengeluaran\s*sebesar\s*(?:IDR|Rp\.?)\s*([0-9\.\,]+)/i);
    const genericIdrMatch = text.match(/IDR\s*([0-9\.\,]+)/i);
    const totalMatch = text.match(/TOTAL\s*PEMBAYARAN[:\s]*Rp\.?\s*([0-9\.\,]+)/i);
    const nominalTfMatch = text.match(/NOMINAL\s*TRANSFER[:\s]*Rp\.?\s*([0-9\.\,]+)/i);
    const biayaMatch = text.match(/BIAYA[:\s]*Rp\.?\s*([0-9\.\,]+)/i);

    if (biayaMatch) {
      biayaAdmin = cleanNominal(biayaMatch[1]);
    }

    if (pengeluaranSebesarMatch) {
      nominal = cleanNominal(pengeluaranSebesarMatch[1]);
      total = nominal + biayaAdmin;
    } else if (transferMasukMatch) {
      nominal = cleanNominal(transferMasukMatch[1]);
      total = nominal;
    } else if (genericIdrMatch) {
      nominal = cleanNominal(genericIdrMatch[1]);
      total = nominal + biayaAdmin;
    } else if (totalMatch) {
      total = cleanNominal(totalMatch[1]);
      nominal = total - biayaAdmin;
    } else if (nominalTfMatch) {
      nominal = cleanNominal(nominalTfMatch[1]);
      total = nominal + biayaAdmin;
    } else {
      // Fallback mencari angka berawalan Rp
      const genericRp = text.match(/Rp\.?\s*([0-9\.\,]+)/i);
      if (genericRp) {
        nominal = cleanNominal(genericRp[1]);
        total = nominal + biayaAdmin;
      }
    }

    // 4. Ekstraksi Merchant / Pengirim / Tujuan / Keterangan Berita
    let tujuan = '';
    let berita = '';

    // Khusus Tarikan ATM: "di TARIKAN ATM untuk kategori Uang Tunai dari 769-301-8724 - TAHAPAN"
    if (/tarikan\s*atm|tarik\s*tunai/i.test(text)) {
      const lokasiAtmMatch = text.match(/di\s+([A-Za-z0-9\s]+?)(?=\s+untuk|\s+dari|\s+pada|\s*$)/i);
      const rekeningMatch = text.match(/dari\s+([0-9\-\s]+(?:\s*-\s*[A-Za-z0-9]+)?)(?=\s+pada|\s*$)/i);
      const lokasiStr = lokasiAtmMatch ? lokasiAtmMatch[1].trim() : 'TARIKAN ATM';
      const rekStr = rekeningMatch ? rekeningMatch[1].trim() : '';
      tujuan = rekStr ? `${lokasiStr} (${rekStr})` : lokasiStr;
      berita = 'Tarik Tunai ATM / Uang Tunai';
    }

    // Khusus Pemasukan: Ambil nama pengirim dari teks bukti transfer
    if (!tujuan && arus === 'pemasukan') {
      const pengirimMatch = text.match(/dari\s+([A-Za-z0-9\s\.\-]+?)(?=\s+untuk|\s+ke|\s+pada|\s*$)/i);
      if (pengirimMatch) {
        tujuan = pengirimMatch[1].trim();
      }
      // Ambil berita / kategori transfer jika ada
      const kategoriTfMatch = text.match(/kategori\s+([A-Za-z0-9\s]+?)(?=\s+ke\s+no|\s+pada|\s*$)/i);
      if (kategoriTfMatch) {
        berita = kategoriTfMatch[1].trim();
      }
    }

    // Cek Berita / Catatan transfer umum (misal: "BERITA Pembayaran Kos Bulan September")
    if (!berita) {
      const beritaMatch = text.match(/BERITA\s+([^\n\r]+?)(?=\s+(?:TUJUAN|Ref|No|BIAYA)|$)/i);
      if (beritaMatch) {
        berita = beritaMatch[1].trim();
      }
    }

    // 4c. Jika transfer bank pengeluaran: ambil nama rekening tujuan
    if (!tujuan && arus === 'pengeluaran' && (jenis === 'Transfer Bank' || jenis === 'Transfer (BI FAST)')) {
      const transferTujuanMatch = text.match(/Ke\s*Rekening\s*Tujuan\s*([^\n\r]+?)(?=\s+NOMINAL|\s*\d{8,}|\s*$)/i);
      if (transferTujuanMatch) {
        let rawTujuan = transferTujuanMatch[1].trim();
        rawTujuan = rawTujuan.replace(/\d{8,}/g, '').trim();
        const linesAfter = text.substring(text.indexOf(transferTujuanMatch[0])).split(/\r?\n/);
        if (linesAfter.length > 1) {
          const nextLine = linesAfter[1].trim();
          if (nextLine && !nextLine.toUpperCase().includes('NOMINAL')) {
            const cleanName = nextLine.replace(/\d{8,}/g, '').trim();
            if (cleanName) {
              rawTujuan = `${cleanName} (${rawTujuan})`;
            }
          }
        }
        tujuan = rawTujuan;
      }
    }

    // 4d. Deteksi Khusus QRIS / Pembayaran QR (BCA Mobile, myBCA, Livin, GoPay, OVO, Dana, ShopeePay, dll)
    if (!tujuan && (jenis === 'Pembayaran QR' || /qris|qr\s*payment|pembayaran\s*qr/i.test(text))) {
      // 1. Ekstraksi langsung via pola marker eksplisit (misal: "Pembayaran ke [Merchant]", "Bayar ke [Merchant]", "Merchant: [Merchant]")
      // PENTING: Jangan cocokkan "TOTAL PEMBAYARAN" atau "Pembayaran QR". Kata kunci 'ke/kepada' wajib ada setelah 'pembayaran'
      const qrisExplicitRegex = /(?:(?<!total\s*)pembayaran\s+(?:ke|kepada)|bayar\s*ke|nama\s*merchant|merchant\s*name|penerima|merchant)[:\s]+([^\n\r]+?)(?=\s+(?:pengakuisisi|lokasi|merchant\s*pan|terminal|dari|customer|cpan|rrn|ref\b|nominal|biaya|total)|$)/i;
      const qrisMatch = text.match(qrisExplicitRegex);
      if (qrisMatch && qrisMatch[1]) {
        let cleanMatch = qrisMatch[1].replace(/^[:\s\-]+/, '').trim();
        cleanMatch = cleanMatch.replace(/\s+(?:pengakuisisi|lokasi(?:\s*merchant)?|merchant\s*pan|terminal(?:\s*id)?|customer(?:\s*pan)?|cpan|rrn|ref\b).*$/i, '').trim();
        if (cleanMatch && !isInvalidMerchant(cleanMatch)) {
          tujuan = cleanMatch;
        }
      }

      // 2. Jika marker "Pembayaran ke" berdiri sendiri pada satu baris, ambil baris teks di bawahnya
      if (!tujuan) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (/^(?:pembayaran\s+(?:ke|kepada)|bayar\s*ke|nama\s*merchant|merchant|penerima)[:\s]*$/i.test(line)) {
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              if (!/^(?:pengakuisisi|lokasi|merchant\s*pan|terminal|dari|customer|cpan|rrn|ref\b|nominal|biaya|total)/i.test(nextLine) && !isInvalidMerchant(nextLine)) {
                tujuan = nextLine;
                break;
              }
            }
          }
        }
      }

      // 3. Fallback struk QR standar (misal BCA Mobile / myBCA): Baris nama merchant terletak langsung setelah baris tanggal/jam
      if (!tujuan) {
        const metadataFieldRegex = /^(?:no\.?\s*transaksi|bca|tid|terminal|pengakuisisi|lokasi|merchant|cpan|customer|dari\s+\d|rrn|ref\b|total|biaya|nominal|tanggal|waktu|jam|berhasil|sukses|pembayaran\s*qr)/i;
        let startCapture = false;

        for (const line of lines) {
          if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) {
            startCapture = true;
            continue;
          }

          if (startCapture) {
            if (/^(?:no\.?\s*transaksi|total|dari\s+\d|rrn|ref\b)/i.test(line)) {
              break;
            }
            if (metadataFieldRegex.test(line)) {
              continue;
            }
            const cleanLine = line.replace(/^(?:pembayaran\s+(?:ke|kepada)|bayar\s*ke|merchant)[:\s]*/i, '').trim();
            if (cleanLine.length > 1 && !isInvalidMerchant(cleanLine)) {
              tujuan = cleanLine;
              break;
            }
          }
        }
      }
    }

    // Pembersihan akhir (sanitasi) nama tujuan / merchant agar bebas dari prefix label & trailing metadata struk
    if (tujuan) {
      tujuan = tujuan.replace(/^(?:pembayaran\s+(?:ke|kepada)|bayar\s*ke|merchant\s*:?|nama\s*merchant\s*:?|penerima\s*:?)[:\s]*/i, '').trim();
      tujuan = tujuan.replace(/\s+(?:pengakuisisi|lokasi(?:\s*merchant)?|merchant\s*pan|terminal(?:\s*id)?|customer(?:\s*pan)?|cpan|rrn|ref\b).*$/i, '').trim();
      if (isInvalidMerchant(tujuan)) {
        tujuan = '';
      }
    }

    // Fallback tujuan jika masih kosong
    if (!tujuan) {
      tujuan = berita || (arus === 'pemasukan' ? 'Pemasukan Terverifikasi' : 'Pembayaran Transaksi');
    }

    // 5. Ekstraksi No Referensi / No Transaksi / Rekening
    let noReferensi = '';
    const noTxMatch = text.match(/No\.?\s*Transaksi[:\s]*([A-Za-z0-9]+)/i);
    const refMatch = text.match(/Ref\s*([A-Za-z0-9]+)/i);
    const rrnMatch = text.match(/RRN\s*([A-Za-z0-9]+)/i);
    const rekMatch = text.match(/(?:rekening|dari)\s+([0-9]{3,4}[\-\s]?[0-9]{3,4}[\-\s]?[0-9]{3,5})/i);

    if (noTxMatch) {
      noReferensi = noTxMatch[1];
    } else if (refMatch) {
      noReferensi = refMatch[1];
    } else if (rrnMatch) {
      noReferensi = rrnMatch[1];
    } else if (rekMatch) {
      noReferensi = rekMatch[1].trim();
    }

    return {
      arus,
      tanggal,
      jenis,
      tujuan,
      nominal,
      biaya_admin: biayaAdmin,
      total,
      no_referensi: noReferensi,
      berita,
      teks_mentah: text
    };
  }

  const api = {
    cleanNominal,
    parseReceiptText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.ReceiptParser = api;
  }
})(typeof window !== 'undefined' ? window : this);
