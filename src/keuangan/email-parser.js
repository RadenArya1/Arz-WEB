/* =========================================================
   EMAIL PARSER - BCA NOTIFICATION (ARCANUM FINANCE)
   Parser Murni Deterministik untuk Ekstraksi Transaksi BCA Gmail
   ========================================================= */

(function(root) {
  // Enam label sensitif yang DIABAIKAN SEPENUHNYA sesuai kebijakan privasi:
  // Nilai dari keenam label ini tidak boleh masuk ke tx, teks_mentah, warnings,
  // logika dedup, localStorage, DOM, maupun console.log.
  const IGNORED_LABELS = [
    'Merchant PAN',
    'Terminal ID',
    'Source of Fund',
    'Customer PAN',
    'RRN',
    'Reference No.'
  ];

  const MONTH_NAMES_MAP = {
    // English month names
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12',
    // Indonesian fallback month names
    'mei': '05',
    'agu': '08', 'agt': '08', 'agustus': '08',
    'okt': '10', 'oktober': '10',
    'des': '12', 'desember': '12'
  };

  /**
   * Menormalkan string kunci label agar mudah dicocokkan
   * @param {string} k
   * @returns {string}
   */
  function normalizeLabelKey(k) {
    return String(k || '')
      .toLowerCase()
      .replace(/[\.\:\-_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const NORMALIZED_IGNORED_SET = new Set(IGNORED_LABELS.map(normalizeLabelKey));

  /**
   * Ekstrak alamat email dari header From (misal: "BCA <bca@bca.co.id>")
   * @param {string} fromStr
   * @returns {string}
   */
  function extractSenderEmail(fromStr) {
    if (!fromStr || typeof fromStr !== 'string') return '';
    const m = fromStr.match(/<([^>]+)>/);
    if (m && m[1]) return m[1].trim().toLowerCase();
    return fromStr.trim().toLowerCase();
  }

  /**
   * Menormalkan nominal uang menjadi integer
   * Mendukung format Inggris (IDR 15,000.00 / IDR 1,250,000.00)
   * dan format Indonesia (Rp 15.000,00 / Rp 15.000)
   * @param {string} str
   * @returns {number}
   */
  function cleanNominal(str) {
    if (!str) return 0;
    let clean = String(str).replace(/[^\d\.,]/g, '').trim();
    if (!clean) return 0;

    // Jika berakhiran desimal sen (.00 atau ,00), buang sen
    if (clean.endsWith('.00') || clean.endsWith(',00')) {
      clean = clean.slice(0, -3);
    }

    // Hilangkan semua tanda pemisah ribuan (titik maupun koma)
    clean = clean.replace(/[\.,]/g, '');
    const val = parseInt(clean, 10);
    return isNaN(val) ? 0 : val;
  }

  /**
   * Parser Utama Notifikasi Transaksi Email BCA
   * @param {object} param0
   * @param {string} param0.subject
   * @param {string} param0.from
   * @param {string} param0.bodyText
   * @param {number|string} [param0.internalDate]
   * @returns { { tx: object, warnings: string[] } | null }
   */
  function parseBcaEmail({ subject, from, bodyText, internalDate }) {
    if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) {
      return null;
    }

    // 1. Verifikasi Pengirim (Allowed Official BCA Notification Senders)
    const senderEmail = extractSenderEmail(from);
    const VALID_BCA_SENDERS = new Set([
      'bca@bca.co.id',
      'klikbca@bca.co.id',
      'mybca@bca.co.id',
      'ebanking@bca.co.id',
      'kartukreditbca@klikbca.com',
      'estatement@klikbca.com',
      'notification@bca.co.id'
    ]);
    if (!VALID_BCA_SENDERS.has(senderEmail)) {
      return null;
    }

    // 2. Deteksi Apakah Email Adalah Notifikasi Transaksi (Subject, Body, & Keywords)
    const lowerBody = bodyText.toLowerCase();
    const lowerSubject = String(subject || '').toLowerCase();

    const hasTxSubject = lowerSubject.includes('transaction') ||
                         lowerSubject.includes('transaksi') ||
                         lowerSubject.includes('bukti') ||
                         lowerSubject.includes('pembayaran') ||
                         lowerSubject.includes('transfer') ||
                         lowerSubject.includes('qris') ||
                         lowerSubject.includes('journal');

    const hasTxIntro = lowerBody.includes('you just made a transaction') || 
                       lowerBody.includes('transaksi melalui mybca') || 
                       lowerBody.includes('transaksi melalui klikbca') || 
                       lowerBody.includes('transaksi melalui bca') || 
                       lowerBody.includes('telah melakukan transaksi') || 
                       lowerBody.includes('transaksi berhasil') || 
                       lowerBody.includes('pembayaran berhasil') || 
                       lowerBody.includes('transfer berhasil') || 
                       lowerBody.includes('bukti transaksi') || 
                       lowerBody.includes('rincian transaksi') ||
                       lowerBody.includes('detail transaksi') ||
                       lowerBody.includes('informasi transaksi') ||
                       lowerBody.includes('internet transaction journal');

    const hasTxTypeAndTotal = (lowerBody.includes('transaction type') || lowerBody.includes('jenis transaksi') || lowerBody.includes('tipe transaksi')) &&
                              (lowerBody.includes('total payment') || lowerBody.includes('total pembayaran') || lowerBody.includes('jumlah pembayaran') || lowerBody.includes('total transfer') || lowerBody.includes('nominal transfer') || lowerBody.includes('nominal'));

    if (!hasTxSubject && !hasTxIntro && !hasTxTypeAndTotal) {
      return null; // Abaikan promo murni, e-statement non-transaksi, OTP, edukasi, dsb.
    }

    // 3. Ekstraksi Seluruh Pasangan "Label : Value" ke dalam Dictionary
    const dict = {};
    const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Format A: "Label : Value" atau "Label: Value" dalam satu baris
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const rawKey = line.substring(0, colonIdx).trim();
        let rawVal = line.substring(colonIdx + 1).trim();
        if (rawKey && !rawKey.includes('<')) {
          if (!rawVal && i + 1 < lines.length && !lines[i + 1].includes(':')) {
            rawVal = lines[i + 1].trim();
            i++;
          }
          dict[normalizeLabelKey(rawKey)] = { label: rawKey, value: rawVal };
          continue;
        }
      }

      // Format B: Label di baris ini dan baris berikutnya diawali tanda ":"
      if (i + 1 < lines.length && lines[i + 1].startsWith(':')) {
        const rawKey = line.trim();
        let rawVal = lines[i + 1].substring(1).trim();
        let advance = 1;
        // Jika tanda ":" berdiri sendiri di baris terpisah (e.g. format 3 sel <td> terpisah),
        // maka nilai transaksi berada di baris berikutnya!
        if (!rawVal && i + 2 < lines.length) {
          rawVal = lines[i + 2].trim();
          advance = 2;
        }
        if (rawKey && !rawKey.includes('<')) {
          dict[normalizeLabelKey(rawKey)] = { label: rawKey, value: rawVal };
          i += advance; // Lewati baris tanda titik dua dan baris nilai
          continue;
        }
      }
    }

    // 4. Eliminasi Mutlak Label Sensitif (IGNORED_LABELS)
    // Label ini tidak boleh masuk ke tx, teks_mentah, warnings, atau log
    for (const key of Object.keys(dict)) {
      if (NORMALIZED_IGNORED_SET.has(key)) {
        delete dict[key];
      }
    }

    // 5. Verifikasi Status Transaksi
    // Jika label status eksplisit ada di dictionary:
    const statusEntry = dict['status'];
    if (statusEntry) {
      const sVal = statusEntry.value.trim().toLowerCase();
      const VALID_STATUSES = ['successful', 'berhasil', 'sukses', 'success'];
      if (!VALID_STATUSES.includes(sVal)) {
        return null; // Status ditolak (misal: 'Failed', 'Gagal', 'Dibatalkan')
      }
    } else {
      // Jika label status tidak ditulis dalam baris terpisah (misal format transfer KlikBCA / myBCA):
      // Tolak jika body atau subject mengindikasikan kegagalan transaksi
      const hasFailedKeyword = /\b(gagal|failed|ditolak|batal|rejected|unsuccessful)\b/i.test(lowerBody) ||
                               /\b(gagal|failed|ditolak|batal|rejected|unsuccessful)\b/i.test(lowerSubject);
      if (hasFailedKeyword) {
        return null;
      }
    }

    const warnings = [];

    // 6. Ekstraksi Tanggal & Waktu Transaksi
    // Format standar email: "06 Oct 2026 19:42:19" atau "06/10/2026 19:42:19"
    let tanggal = '';
    const dateEntry = dict['transaction date'] || 
                      dict['tanggal transaksi'] || 
                      dict['waktu transaksi'] || 
                      dict['tanggal'] || 
                      dict['date'];

    if (dateEntry && dateEntry.value) {
      // Pola A: "06 Oct 2026 19:42:19"
      const dateMatch = dateEntry.value.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/);
      if (dateMatch) {
        const [, d, mStr, y, time = '00:00:00'] = dateMatch;
        const mKey = mStr.toLowerCase();
        const mNum = MONTH_NAMES_MAP[mKey] || '01';
        const fullTime = time.split(':').length === 2 ? `${time}:00` : time;
        tanggal = `${y}-${mNum}-${String(d).padStart(2, '0')} ${fullTime}`;
      } else {
        // Pola B: "06/10/2026 19:42:19" atau "2026-10-06 19:42:19"
        const numMatch = dateEntry.value.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/);
        if (numMatch) {
          let [, p1, p2, p3, time = '00:00:00'] = numMatch;
          let y, m, d;
          if (p1.length === 4) {
            y = p1; m = p2; d = p3;
          } else {
            d = p1; m = p2; y = p3;
          }
          const fullTime = time.split(':').length === 2 ? `${time}:00` : time;
          tanggal = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${fullTime}`;
        }
      }
    }

    // Fallback regex langsung dari bodyText jika dateEntry belum menemukan tanggal
    if (!tanggal) {
      const bodyDateMatch = bodyText.match(/(?:transaction date|tanggal transaksi|tanggal)\s*[:=]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
      if (bodyDateMatch && bodyDateMatch[1]) {
        const m = bodyDateMatch[1].match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/);
        if (m) {
          const [, d, mStr, y, time = '00:00:00'] = m;
          const mKey = mStr.toLowerCase();
          const mNum = MONTH_NAMES_MAP[mKey] || '01';
          const fullTime = time.split(':').length === 2 ? `${time}:00` : time;
          tanggal = `${y}-${mNum}-${String(d).padStart(2, '0')} ${fullTime}`;
        }
      }
    }

    // Fallback: Jika Transaction Date tidak ditemukan, perkirakan dari internalDate Gmail
    if (!tanggal) {
      if (internalDate) {
        const dObj = new Date(Number(internalDate));
        if (!isNaN(dObj.getTime())) {
          const y = dObj.getFullYear();
          const m = String(dObj.getMonth() + 1).padStart(2, '0');
          const d = String(dObj.getDate()).padStart(2, '0');
          const hh = String(dObj.getHours()).padStart(2, '0');
          const mm = String(dObj.getMinutes()).padStart(2, '0');
          const ss = String(dObj.getSeconds()).padStart(2, '0');
          tanggal = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
          warnings.push("Waktu transaksi diperkirakan dari waktu email, mohon periksa");
        }
      }
      if (!tanggal) {
        const now = new Date();
        tanggal = now.toISOString().replace('T', ' ').substring(0, 19);
        warnings.push("Waktu transaksi diperkirakan dari waktu email, mohon periksa");
      }
    }

    // 7. Ekstraksi Nominal, Biaya Admin, dan Total
    const totalEntry = dict['total payment'] || 
                       dict['total pembayaran'] || 
                       dict['total transfer'] || 
                       dict['total transaksi'] || 
                       dict['total'] ||
                       dict['nominal transfer'] ||
                       dict['nominal transaksi'] ||
                       dict['nominal'] ||
                       dict['jumlah transfer'] ||
                       dict['jumlah transaksi'] ||
                       dict['jumlah pembayaran'] ||
                       dict['jumlah'];

    let total = totalEntry ? cleanNominal(totalEntry.value) : 0;

    // Fallback regex nominal langsung dari body jika tidak tertangkap dalam dict
    if (!total) {
      const nominalMatch = bodyText.match(/(?:total payment|total pembayaran|total transfer|nominal transfer|nominal transaksi|nominal|jumlah transfer|jumlah transaksi|jumlah)\s*[:=]\s*(?:idr|rp)?\s*([0-9\.,]+)/i);
      if (nominalMatch && nominalMatch[1]) {
        total = cleanNominal(nominalMatch[1]);
      }
    }

    // Jika setelah semua pengecekan total masih 0, maka ini bukan email transaksi finansial
    if (!total || total <= 0) {
      return null;
    }

    let biayaAdmin = 0;
    const adminFeeEntry = dict['admin fee'] || 
                          dict['biaya admin'] || 
                          dict['biaya transaksi'] || 
                          dict['biaya transfer'] || 
                          dict['biaya'] || 
                          dict['fee'];
    if (adminFeeEntry && adminFeeEntry.value) {
      biayaAdmin = cleanNominal(adminFeeEntry.value);
    } else {
      const feeMatch = bodyText.match(/(?:admin fee|biaya admin|biaya transaksi|biaya transfer)\s*[:=]\s*(?:idr|rp)?\s*([0-9\.,]+)/i);
      if (feeMatch && feeMatch[1]) {
        biayaAdmin = cleanNominal(feeMatch[1]);
      }
    }

    let nominal = total - biayaAdmin;
    if (nominal < 0) nominal = total;

    // Pastikan invariant total selalu konsisten
    total = nominal + biayaAdmin;

    // 8. Ekstraksi Jenis Transaksi
    let jenis = 'Pembayaran QR'; // Default untuk contoh QRIS
    const typeEntry = dict['transaction type'] || 
                      dict['jenis transaksi'] || 
                      dict['tipe transaksi'];

    if (typeEntry && typeEntry.value) {
      const rawType = typeEntry.value.trim();
      const rawTypeLower = rawType.toLowerCase();
      if (rawTypeLower.includes('qris')) {
        jenis = 'Pembayaran QR';
      } else if (rawTypeLower.includes('bi-fast') || rawTypeLower.includes('bi fast')) {
        jenis = 'Transfer (BI FAST)';
      } else if (rawTypeLower.includes('transfer')) {
        jenis = 'Transfer Bank';
      } else {
        // Jenis transaksi lain belum terkonfirmasi contohnya
        jenis = rawType;
        warnings.push(`Jenis transaksi '${rawType}' belum terkonfirmasi, mohon periksa jenis dan arus`);
      }
    } else {
      // Perkirakan dari subject / body jika tidak ada key tipe transaksi
      if (lowerSubject.includes('qris') || lowerBody.includes('qris')) {
        jenis = 'Pembayaran QR';
      } else if (lowerSubject.includes('transfer') || lowerBody.includes('transfer')) {
        jenis = 'Transfer Bank';
      } else if (lowerSubject.includes('pembayaran') || lowerBody.includes('pembayaran')) {
        jenis = 'Pembayaran Tagihan';
      }
    }

    // 9. Penentuan Arus Kas (Inflow vs Outflow)
    // Default transaksi adalah pengeluaran
    let arus = 'pengeluaran';
    if (/transfer masuk|dana masuk|uang masuk|\bincoming\b|\breceived\b/i.test(lowerBody)) {
      arus = 'pemasukan';
      warnings.push("Arus transaksi diperkirakan sebagai pemasukan dari kata kunci, mohon periksa");
    }

    // 10. Ekstraksi Tujuan / Merchant (Payment to)
    const paymentToEntry = dict['payment to'] || 
                           dict['pembayaran ke'] || 
                           dict['merchant'] || 
                           dict['nama merchant'] || 
                           dict['nama penerima'] || 
                           dict['penerima'] || 
                           dict['ke rekening'] || 
                           dict['rekening tujuan'] || 
                           dict['tujuan transfer'] || 
                           dict['tujuan'];

    let tujuan = paymentToEntry ? paymentToEntry.value.trim() : '';
    if (!tujuan) {
      const mMerchant = bodyText.match(/(?:payment to|pembayaran ke|merchant|penerima|nama penerima|rekening tujuan|tujuan transfer)\s*[:=]\s*([^\r\n<]+)/i);
      if (mMerchant && mMerchant[1]) {
        tujuan = mMerchant[1].trim();
      }
    }
    if (tujuan) {
      tujuan = tujuan.replace(/^[:\-\s]+/, '').trim();
    }
    if (!tujuan) {
      tujuan = 'Transaksi BCA';
    }

    // 11. Pembentukan Teks Mentah (Sanitasi Total)
    // Hanya menyertakan baris terizinkan: Status, Transaction Date, Transaction Type,
    // Payment to, Merchant Location, Acquirer, Total Payment (dan Admin Fee jika ada).
    // Dilarang menyertakan salam (nama pemilik), footer, maupun label sensitif.
    const rawLines = [];
    const allowedKeys = [
      'status',
      'transaction date',
      'transaction type',
      'payment to',
      'merchant location',
      'acquirer',
      'total payment',
      'admin fee',
      'biaya admin'
    ];
    for (const k of allowedKeys) {
      if (dict[k] && dict[k].value) {
        rawLines.push(`${dict[k].label} : ${dict[k].value}`);
      }
    }
    let teksMentah = rawLines.join('\n');
    if (teksMentah.length > 3000) {
      teksMentah = teksMentah.substring(0, 3000);
    }

    const tx = {
      arus,
      tanggal,
      jenis,
      tujuan,
      nominal,
      biaya_admin: biayaAdmin,
      total,
      no_referensi: '',   // Email BCA tidak membawa nomor referensi ke aplikasi
      bukti_gambar: '',   // Transaksi Gmail tanpa foto struk
      sumber: 'gmail',
      teks_mentah: teksMentah
    };

    return { tx, warnings };
  }

  const api = {
    IGNORED_LABELS,
    cleanNominal,
    extractSenderEmail,
    parseBcaEmail
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.BcaEmailParser = api;
  }
})(typeof window !== 'undefined' ? window : this);
