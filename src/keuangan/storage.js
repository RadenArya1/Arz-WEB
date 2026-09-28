/* =========================================================
   FITUR: STORAGE & STATE TRANSAKSI KEUANGAN
   Persistensi LocalStorage, Query Analitik, & Seed Data Nyata (Pemasukan & Pengeluaran)
   ========================================================= */

(function(root) {
  const STORAGE_KEY = 'grimoire_keuangan_transaksi_v7';

  // Seed Data Awal: Bersih Tanpa Data Pengguna (Clean Slate)
  const INITIAL_TRANSACTIONS = [];

  function getTransactions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Gagal membaca transaksi dari localStorage:', e);
    }
    // Simpan seed awal ke localStorage
    saveTransactions(INITIAL_TRANSACTIONS);
    return INITIAL_TRANSACTIONS;
  }

  function saveTransactions(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Gagal menyimpan transaksi ke localStorage:', e);
    }
  }

  function addTransaction(tx) {
    const list = getTransactions();
    const newTx = {
      id: Date.now(),
      arus: tx.arus || 'pengeluaran',
      tanggal: tx.tanggal || new Date().toISOString().replace('T', ' ').substring(0, 19),
      jenis: tx.jenis || (tx.arus === 'pemasukan' ? 'Transfer Masuk' : 'Pembayaran Lainnya'),
      tujuan: tx.tujuan || 'Transaksi',
      nominal: Number(tx.nominal) || 0,
      biaya_admin: Number(tx.biaya_admin) || 0,
      total: Number(tx.total) || (Number(tx.nominal) + Number(tx.biaya_admin || 0)),
      no_referensi: tx.no_referensi || '',
      bukti_gambar: tx.bukti_gambar || '',
      teks_mentah: tx.teks_mentah || ''
    };
    list.unshift(newTx);
    saveTransactions(list);

    // Otomatisasi: Jika ada transaksi di bulan yang lebih baru, otomatis jadikan bulan aktif
    if (newTx.tanggal) {
      const txMonth = newTx.tanggal.substring(0, 7);
      if (txMonth && txMonth > getActiveMonthKey()) {
        try {
          localStorage.setItem(ACTIVE_MONTH_STORAGE_KEY, txMonth);
        } catch (e) {}
      }
    }

    return newTx;
  }

  function deleteTransaction(id) {
    let list = getTransactions();
    list = list.filter(t => t.id !== id);
    saveTransactions(list);
    return list;
  }

  function resetToDefaultSeed() {
    saveTransactions(INITIAL_TRANSACTIONS);
    localStorage.removeItem('grimoire_simulated_month_offset_v1');
    localStorage.removeItem('grimoire_current_active_month_v1');
    return INITIAL_TRANSACTIONS;
  }

  /* =========================================================
     MANAJEMEN SIKLUS MULTI-BULAN & PERGANTIAN BULAN OTOMATIS
     ========================================================= */

  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const ACTIVE_MONTH_STORAGE_KEY = 'grimoire_current_active_month_v1';
  const SIMULATED_OFFSET_KEY = 'grimoire_simulated_month_offset_v1';

  function getSimulatedOffset() {
    try {
      const v = localStorage.getItem(SIMULATED_OFFSET_KEY);
      return v !== null ? parseInt(v, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function setSimulatedOffset(offset) {
    try {
      localStorage.setItem(SIMULATED_OFFSET_KEY, String(offset));
    } catch (e) {
      console.error(e);
    }
  }

  function getEffectiveDate() {
    const now = new Date();
    const offset = getSimulatedOffset();
    if (offset !== 0) {
      // Tambahkan bulan offset ke tanggal sekarang
      return new Date(now.getFullYear(), now.getMonth() + offset, 1);
    }
    return now;
  }

  function formatYearMonth(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function getActiveMonthKey() {
    return formatYearMonth(getEffectiveDate());
  }

  function formatMonthLabel(yearMonthKey) {
    if (!yearMonthKey) return '-';
    const parts = yearMonthKey.split('-');
    if (parts.length < 2) return yearMonthKey;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const name = MONTH_NAMES[m] || parts[1];
    return `${name} ${y}`;
  }

  /**
   * Logika Pemeriksaan Pergantian Bulan Otomatis:
   * Saat bulan kalender berganti (atau simulasi maju), bulan yang telah berlalu
   * otomatis diarsipkan ke History dan dibiarkan utuh tanpa dihapus,
   * lalu bulan baru berikutnya diaktifkan sebagai periode berjalan.
   */
  function checkAndApplyMonthRollover() {
    const currentActive = getActiveMonthKey();
    let lastKnown = null;
    try {
      lastKnown = localStorage.getItem(ACTIVE_MONTH_STORAGE_KEY);
    } catch (e) {
      lastKnown = null;
    }

    if (!lastKnown) {
      // Inisialisasi awal
      try {
        localStorage.setItem(ACTIVE_MONTH_STORAGE_KEY, currentActive);
      } catch (e) {}
      return {
        rolledOver: false,
        activeMonth: currentActive,
        activeLabel: formatMonthLabel(currentActive),
        previousMonth: null
      };
    }

    if (lastKnown !== currentActive) {
      // Bulan telah berganti secara otomatis!
      try {
        localStorage.setItem(ACTIVE_MONTH_STORAGE_KEY, currentActive);
      } catch (e) {}
      return {
        rolledOver: true,
        activeMonth: currentActive,
        activeLabel: formatMonthLabel(currentActive),
        previousMonth: lastKnown,
        previousLabel: formatMonthLabel(lastKnown)
      };
    }

    return {
      rolledOver: false,
      activeMonth: currentActive,
      activeLabel: formatMonthLabel(currentActive),
      previousMonth: null
    };
  }

  /**
   * Mengumpulkan semua bulan yang ada di database transaksi,
   * ditambahkan bulan aktif saat ini (meskipun belum ada transaksi).
   * Menghasilkan ringkasan multi-bulan komprehensif.
   */
  function getAvailableMonths() {
    const transactions = getTransactions();
    const activeKey = getActiveMonthKey();
    const monthMap = {};

    // Pastikan bulan aktif selalu ada di map
    monthMap[activeKey] = {
      key: activeKey,
      label: formatMonthLabel(activeKey),
      isActive: true,
      isHistory: false,
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
      transactions: []
    };

    transactions.forEach(t => {
      if (!t.tanggal) return;
      const key = t.tanggal.substring(0, 7); // 'YYYY-MM'
      if (!monthMap[key]) {
        monthMap[key] = {
          key: key,
          label: formatMonthLabel(key),
          isActive: (key === activeKey),
          isHistory: (key < activeKey),
          income: 0,
          expense: 0,
          net: 0,
          count: 0,
          transactions: []
        };
      }

      const amt = Number(t.total || 0);
      if (t.arus === 'pemasukan') {
        monthMap[key].income += amt;
      } else {
        monthMap[key].expense += amt;
      }
      monthMap[key].count += 1;
      monthMap[key].transactions.push(t);
    });

    // Urutkan kunci bulan secara kronologis
    const sortedKeys = Object.keys(monthMap).sort();

    const months = sortedKeys.map(key => {
      const item = monthMap[key];
      item.isActive = (key === activeKey);
      item.isHistory = (key < activeKey);
      item.net = item.income - item.expense;
      return item;
    });

    return {
      months,
      activeMonthKey: activeKey,
      activeMonthLabel: formatMonthLabel(activeKey)
    };
  }

  /**
   * Simulasi Pergantian Bulan (Testing / Demo Interaktif)
   */
  function simulateAdvanceMonth() {
    const currentOffset = getSimulatedOffset();
    setSimulatedOffset(currentOffset + 1);
    return checkAndApplyMonthRollover();
  }

  function simulateResetMonth() {
    setSimulatedOffset(0);
    return checkAndApplyMonthRollover();
  }

  const api = {
    getTransactions,
    saveTransactions,
    addTransaction,
    deleteTransaction,
    resetToDefaultSeed,
    // Month Cycle & Comparison API
    getActiveMonthKey,
    formatMonthLabel,
    checkAndApplyMonthRollover,
    getAvailableMonths,
    getSimulatedOffset,
    simulateAdvanceMonth,
    simulateResetMonth,
    INITIAL_TRANSACTIONS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.KeuanganStorage = api;
  }
})(typeof window !== 'undefined' ? window : this);
