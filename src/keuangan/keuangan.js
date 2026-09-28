/* =========================================================
   FITUR: PENCATATAN KEUANGAN (MONEY / CASHFLOW TRACKER)
   Controller Dashboard Standalone: Dual Cashflow (Pemasukan & Pengeluaran),
   Chart.js Dual Bar, Parser, Image Proof & Lightbox Modal
   ========================================================= */

(function initKeuanganModule() {
  let focusedChartInstance = null;
  let activeChartInstance = null;
  let currentParsedData = null;
  let currentImageProof = '';
  let searchFilterQuery = '';
  let currentStreamFilter = 'all'; // 'all' | 'pemasukan' | 'pengeluaran'

  /**
   * Format Rupiah Helper
   */
  function formatRupiah(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Update Live Topbar Clock
  function updateTopbarClock() {
    const clockEl = document.getElementById('topbarClock');
    if (!clockEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;
  }

  /**
   * Kompresi dan Pembacaan File Gambar via Canvas
   */
  function processAndCompressImage(file, callback) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateTopbarClock, 1000);
    updateTopbarClock();

    // Elements - Review Card
    const parsedReviewCard = document.getElementById('parsedReviewCard');
    const reviewTotalVal = document.getElementById('reviewTotalVal');
    const reviewMerchantVal = document.getElementById('reviewMerchantVal');
    const reviewDateVal = document.getElementById('reviewDateVal');
    const btnSaveParsedTx = document.getElementById('btnSaveParsedTx');
    const btnClearParsedTx = document.getElementById('btnClearParsedTx');
    const btnToggleIncome = document.getElementById('btnToggleIncome');
    const btnToggleExpense = document.getElementById('btnToggleExpense');

    // Table & Filters
    const txTableBody = document.getElementById('txTableBody');
    const txSearchInput = document.getElementById('txSearchInput');
    const tableStatsCount = document.getElementById('tableStatsCount');
    const filterTabBtns = document.querySelectorAll('.filter-tab-btn');

    // Image Upload & Paste Elements
    const receiptDropzone = document.getElementById('receiptDropzone');
    const dropzoneNormalState = document.getElementById('dropzoneNormalState');
    const ocrProgressWrap = document.getElementById('ocrProgressWrap');
    const ocrStatusText = document.getElementById('ocrStatusText');
    const ocrStatusSub = document.getElementById('ocrStatusSub');
    const ocrPercentBadge = document.getElementById('ocrPercentBadge');
    const ocrProgressBar = document.getElementById('ocrProgressBar');
    const receiptFileInput = document.getElementById('receiptFileInput');
    const btnBrowseFile = document.getElementById('btnBrowseFile');
    const btnPasteClipboard = document.getElementById('btnPasteClipboard');
    const reviewImagePreview = document.getElementById('reviewImagePreview');
    const reviewImageThumb = document.getElementById('reviewImageThumb');
    const btnRemoveThumb = document.getElementById('btnRemoveThumb');

    // Lightbox Modal Elements
    const imageModal = document.getElementById('imageModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const modalFullImage = document.getElementById('modalFullImage');
    const modalTxTitle = document.getElementById('modalTxTitle');
    const modalTxSubtitle = document.getElementById('modalTxSubtitle');
    const modalTxRef = document.getElementById('modalTxRef');
    const modalTxAmount = document.getElementById('modalTxAmount');

    // State Periode Multi-Bulan
    let selectedMonthKey = null; // null = otomatis bulan aktif
    let txPeriodScope = 'selected'; // 'selected' | 'all'

    // Elemen Komparasi Dua Kotak (Kotak Kiri Fokus & Kotak Kanan 'b' Aktif)
    const btnFocusPrev = document.getElementById('btnFocusPrev');
    const focusMonthDropdown = document.getElementById('focusMonthDropdown');
    const btnFocusNext = document.getElementById('btnFocusNext');
    const activeBoxTitle = document.getElementById('activeBoxTitle');
    const focusStatPill = document.getElementById('focusStatPill');
    const activeStatPill = document.getElementById('activeStatPill');

    // Dynamic Period Labels
    const kpiIncomeLabel = document.getElementById('kpiIncomeLabel');
    const kpiExpenseLabel = document.getElementById('kpiExpenseLabel');
    const kpiIncomePeriod = document.getElementById('kpiIncomePeriod');
    const kpiExpensePeriod = document.getElementById('kpiExpensePeriod');
    const kpiNetPeriod = document.getElementById('kpiNetPeriod');
    const kpiTxPeriod = document.getElementById('kpiTxPeriod');
    const chartMonthSubTitle = document.getElementById('chartMonthSubTitle');
    const chartActiveNote = document.getElementById('chartActiveNote');

    // Table Scope & History Banner
    const txPeriodScopeSelect = document.getElementById('txPeriodScope');
    const historyBanner = document.getElementById('historyBanner');
    const historyBannerMonthName = document.getElementById('historyBannerMonthName');
    const btnBackToActiveFromBanner = document.getElementById('btnBackToActiveFromBanner');

    // Rollover Toast Notification
    const rolloverToast = document.getElementById('rolloverToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const btnCloseToast = document.getElementById('btnCloseToast');

    // Multi-Month Comparison Modal
    const multiMonthModal = document.getElementById('multiMonthModal');
    const btnCloseMultiMonthModal = document.getElementById('btnCloseMultiMonthModal');
    const btnCloseMultiMonthBtn = document.getElementById('btnCloseMultiMonthBtn');
    const multiMonthTableBody = document.getElementById('multiMonthTableBody');
    const multiMonthSummaryCards = document.getElementById('multiMonthSummaryCards');

    // KPI Elements (Executive Dual-Stream Cashflow)
    const kpiTotalIncome = document.getElementById('kpiTotalIncome');
    const kpiTotalExpense = document.getElementById('kpiTotalExpense');
    const kpiNetCashflow = document.getElementById('kpiNetCashflow');
    const kpiNetBadge = document.getElementById('kpiNetBadge');
    const kpiTxCount = document.getElementById('kpiTxCount');

    // Helper: Update Cashflow Switcher State
    function setReviewCardArus(arus) {
      if (!currentParsedData) return;
      currentParsedData.arus = arus;

      if (arus === 'pemasukan') {
        if (btnToggleIncome) btnToggleIncome.classList.add('active');
        if (btnToggleExpense) btnToggleExpense.classList.remove('active');
        if (reviewTotalVal) {
          reviewTotalVal.className = 'review-amount-text text-income';
          reviewTotalVal.textContent = '+ ' + formatRupiah(currentParsedData.total);
        }
      } else {
        if (btnToggleExpense) btnToggleExpense.classList.add('active');
        if (btnToggleIncome) btnToggleIncome.classList.remove('active');
        if (reviewTotalVal) {
          reviewTotalVal.className = 'review-amount-text text-expense';
          reviewTotalVal.textContent = '- ' + formatRupiah(currentParsedData.total);
        }
      }
    }

    if (btnToggleIncome) {
      btnToggleIncome.addEventListener('click', () => setReviewCardArus('pemasukan'));
    }
    if (btnToggleExpense) {
      btnToggleExpense.addEventListener('click', () => setReviewCardArus('pengeluaran'));
    }

    // Set preview image helper
    function setProofImage(dataUrl) {
      currentImageProof = dataUrl || '';
      if (currentImageProof && reviewImagePreview && reviewImageThumb) {
        reviewImageThumb.src = currentImageProof;
        reviewImagePreview.style.display = 'flex';
      } else if (reviewImagePreview) {
        reviewImagePreview.style.display = 'none';
      }
    }

    if (btnRemoveThumb) {
      btnRemoveThumb.addEventListener('click', (e) => {
        e.stopPropagation();
        setProofImage('');
      });
    }

    // Drag & Drop & Click Handlers
    if (receiptDropzone && receiptFileInput) {
      if (btnBrowseFile) {
        btnBrowseFile.addEventListener('click', (e) => {
          e.stopPropagation();
          receiptFileInput.click();
        });
      }

      // Tombol Tempel dari Clipboard (Ctrl + V)
      if (btnPasteClipboard) {
        btnPasteClipboard.addEventListener('click', async (e) => {
          e.stopPropagation();
          await pasteFromClipboard();
        });
      }

      receiptDropzone.addEventListener('click', (e) => {
        if (
          e.target !== btnBrowseFile &&
          !e.target.closest('#btnPasteClipboard') &&
          !e.target.closest('#btnBrowseFile') &&
          !e.target.closest('#ocrProgressWrap')
        ) {
          receiptFileInput.click();
        }
      });

      receiptDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        receiptDropzone.classList.add('dragover');
      });

      receiptDropzone.addEventListener('dragleave', () => {
        receiptDropzone.classList.remove('dragover');
      });

      receiptDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        receiptDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFile(e.dataTransfer.files[0]);
        }
      });

      receiptFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImageFile(e.target.files[0]);
        }
      });
    }

    /**
     * Pembacaan Clipboard Otomatis
     */
    async function pasteFromClipboard() {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) {
          alert('Silakan tekan kombinasi tombol Ctrl + V pada keyboard Anda untuk menempelkan gambar.');
          return;
        }
        const clipboardItems = await navigator.clipboard.read();
        let foundImage = false;
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              handleImageFile(blob);
              foundImage = true;
              break;
            }
          }
          if (foundImage) break;
        }
        if (!foundImage) {
          alert('Tidak ditemukan gambar di clipboard. Ambil screenshot terlebih dahulu (misal: Win+Shift+S atau Salin Gambar), lalu tekan Ctrl+V.');
        }
      } catch (err) {
        console.warn('Clipboard read notice:', err);
        alert('Izin akses clipboard dibatasi browser. Silakan langsung tekan kombinasi tombol Ctrl + V pada keyboard untuk menempelkan gambar.');
      }
    }

    // Global Clipboard Paste (Ctrl+V Gambar Struk/Bukti Transfer di mana saja pada layar)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageFile(blob);
            break;
          }
        }
      }
    });

    /**
     * Otomatisasi Ekstraksi Struk via AI OCR Vision (Tesseract.js)
     */
    function handleImageFile(file) {
      if (!file) return;

      processAndCompressImage(file, (compressedDataUrl) => {
        // 1. Simpan foto bukti transaksi
        setProofImage(compressedDataUrl);

        // 2. Jika Tesseract.js tersedia, pindai teks langsung dari gambar secara otomatis
        if (typeof Tesseract !== 'undefined') {
          if (ocrProgressWrap) ocrProgressWrap.style.display = 'flex';
          if (dropzoneNormalState) dropzoneNormalState.style.display = 'none';
          if (ocrProgressBar) ocrProgressBar.style.width = '10%';
          if (ocrPercentBadge) ocrPercentBadge.textContent = '10%';
          if (ocrStatusText) ocrStatusText.textContent = 'Mempersiapkan AI OCR Vision...';
          if (ocrStatusSub) ocrStatusSub.textContent = 'Memindai nominal uang & rincian pembayaran dari gambar...';

          Tesseract.recognize(compressedDataUrl, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                const pct = Math.min(99, Math.round((m.progress || 0) * 100));
                if (ocrProgressBar) ocrProgressBar.style.width = `${pct}%`;
                if (ocrPercentBadge) ocrPercentBadge.textContent = `${pct}%`;
                if (ocrStatusText) ocrStatusText.textContent = `Membaca Teks Bukti (${pct}%)...`;
              } else if (m.status) {
                if (ocrStatusText) ocrStatusText.textContent = `Memuat model AI (${m.status})...`;
              }
            }
          })
          .then((result) => {
            const ocrText = (result && result.data && result.data.text) ? result.data.text.trim() : '';

            if (ocrProgressBar) ocrProgressBar.style.width = '100%';
            if (ocrPercentBadge) ocrPercentBadge.textContent = '100%';
            if (ocrStatusText) ocrStatusText.innerHTML = '✨ <span style="color: #4ade80;">Bukti Berhasil Dibaca Otomatis!</span>';
            if (ocrStatusSub) ocrStatusSub.textContent = 'Nominal, pihak terlibat, dan tanggal diekstrak tanpa ketik manual.';

            if (ocrText) {
              handleTextParsing(ocrText);
            }

            if (typeof playMagicChime === 'function') {
              playMagicChime();
            }

            setTimeout(() => {
              if (ocrProgressWrap) ocrProgressWrap.style.display = 'none';
              if (dropzoneNormalState) dropzoneNormalState.style.display = 'flex';
            }, 1800);
          })
          .catch((err) => {
            console.error('OCR Processing Error:', err);
            if (ocrStatusText) ocrStatusText.textContent = 'Gagal memindai otomatis. Silakan coba unggah ulang.';
            setTimeout(() => {
              if (ocrProgressWrap) ocrProgressWrap.style.display = 'none';
              if (dropzoneNormalState) dropzoneNormalState.style.display = 'flex';
            }, 2500);

            // Fallback parsing draft dengan nominal 0
            handleTextParsing(`Bukti Transaksi (${file.name || 'Foto'})\nTOTAL PEMBAYARAN: Rp 0`);
          });
        } else {
          // Fallback jika Tesseract offline
          handleTextParsing(`Bukti Transaksi (${file.name || 'Foto'})\nTOTAL PEMBAYARAN: Rp 0`);
        }
      });
    }

    function handleTextParsing(text) {
      if (!window.ReceiptParser) return;
      const parsed = window.ReceiptParser.parseReceiptText(text);

      if (parsed && (parsed.total > 0 || currentImageProof)) {
        currentParsedData = parsed;

        // Set arus switcher & text color
        setReviewCardArus(parsed.arus || 'pengeluaran');

        if (reviewMerchantVal) {
          reviewMerchantVal.textContent = parsed.tujuan || (parsed.arus === 'pemasukan' ? 'Pengirim / Sumber Dana' : 'Tanpa Nama Merchant');
        }
        if (reviewDateVal) {
          reviewDateVal.textContent = parsed.tanggal;
        }

        if (parsedReviewCard) parsedReviewCard.style.display = 'flex';
      } else {
        currentParsedData = null;
        if (parsedReviewCard) parsedReviewCard.style.display = 'none';
      }
    }

    // Simpan Transaksi
    if (btnSaveParsedTx) {
      btnSaveParsedTx.addEventListener('click', () => {
        if (!currentParsedData) return;

        // Ambil nilai pihak / keterangan jika diedit langsung oleh pengguna di kartu pratinjau
        if (reviewMerchantVal) {
          const editedTujuan = reviewMerchantVal.textContent.trim();
          if (editedTujuan && editedTujuan !== '-') {
            currentParsedData.tujuan = editedTujuan;
          }
        }

        // Ambil nilai tanggal transaksi jika diedit langsung oleh pengguna
        if (reviewDateVal) {
          const editedDate = reviewDateVal.textContent.trim();
          if (editedDate && editedDate !== '-') {
            currentParsedData.tanggal = editedDate;
          }
        }

        // Lampirkan foto bukti transaksi
        currentParsedData.bukti_gambar = currentImageProof || '';

        window.KeuanganStorage.addTransaction(currentParsedData);

        // Feedback audio
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }

        // Fokuskan tampilan ke bulan transaksi yang baru disimpan
        if (currentParsedData.tanggal) {
          selectedMonthKey = currentParsedData.tanggal.substring(0, 7);
        }

        // Reset input & render ulang
        setProofImage('');
        currentParsedData = null;
        if (parsedReviewCard) parsedReviewCard.style.display = 'none';
        renderDashboard();
      });
    }

    // Batal Input
    if (btnClearParsedTx) {
      btnClearParsedTx.addEventListener('click', () => {
        setProofImage('');
        currentParsedData = null;
        if (parsedReviewCard) parsedReviewCard.style.display = 'none';
      });
    }

    // Search Input
    if (txSearchInput) {
      txSearchInput.addEventListener('input', (e) => {
        searchFilterQuery = e.target.value.toLowerCase().trim();
        renderTransactionTable(window.KeuanganStorage.getTransactions(), getSelectedMonthData());
      });
    }

    // Filter Tab Buttons (Semua | Pemasukan | Pengeluaran)
    filterTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStreamFilter = btn.getAttribute('data-filter') || 'all';
        renderTransactionTable(window.KeuanganStorage.getTransactions(), getSelectedMonthData());
      });
    });

    // Lingkup Periode Tabel (Hanya Bulan Terpilih vs Semua Bulan)
    if (txPeriodScopeSelect) {
      txPeriodScopeSelect.addEventListener('change', (e) => {
        txPeriodScope = e.target.value;
        renderTransactionTable(window.KeuanganStorage.getTransactions(), getSelectedMonthData());
      });
    }

    // Toast Notifikasi Auto-Rollover
    function showRolloverToast(title, message) {
      if (!rolloverToast) return;
      if (toastTitle) toastTitle.textContent = title;
      if (toastMessage) toastMessage.textContent = message;
      rolloverToast.style.display = 'flex';
      if (typeof playMagicChime === 'function') {
        playMagicChime();
      }
      setTimeout(() => {
        if (rolloverToast) rolloverToast.style.display = 'none';
      }, 7000);
    }

    if (btnCloseToast) {
      btnCloseToast.addEventListener('click', () => {
        if (rolloverToast) rolloverToast.style.display = 'none';
      });
    }

    // Modal Lightbox Handlers
    function openImageModal(imgSrc, title, amount, date, ref, isIncome) {
      if (!imageModal || !modalFullImage) return;
      modalFullImage.src = imgSrc;
      if (modalTxTitle) modalTxTitle.textContent = title || 'Bukti Transaksi';
      if (modalTxSubtitle) modalTxSubtitle.textContent = date || '-';
      if (modalTxRef) modalTxRef.textContent = `Ref: ${ref || '-'}`;
      if (modalTxAmount) {
        modalTxAmount.textContent = (isIncome ? '+ ' : '- ') + amount;
        modalTxAmount.className = 'modal-footer-amount ' + (isIncome ? 'text-income' : 'text-expense');
      }
      imageModal.style.display = 'flex';
    }

    function closeImageModal() {
      if (imageModal) imageModal.style.display = 'none';
      if (modalFullImage) modalFullImage.src = '';
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeImageModal);
    if (imageModal) {
      imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) closeImageModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeImageModal();
        closeMultiMonthModal();
      }
    });

    // Helper data bulan yang sedang dipilih
    function getSelectedMonthData() {
      if (!window.KeuanganStorage) return null;
      const { months, activeMonthKey } = window.KeuanganStorage.getAvailableMonths();
      const currentKey = selectedMonthKey || activeMonthKey;
      return months.find(m => m.key === currentKey) || {
        key: currentKey,
        label: window.KeuanganStorage.formatMonthLabel(currentKey),
        isActive: (currentKey === activeMonthKey),
        isHistory: (currentKey < activeMonthKey),
        income: 0,
        expense: 0,
        net: 0,
        count: 0,
        transactions: []
      };
    }

    // =========================================================
    // RENDER DASHBOARD (KOTAK KIRI FOKUS & KOTAK KANAN BULAN AKTIF)
    // =========================================================
    function renderDashboard() {
      if (!window.KeuanganStorage) return;

      const transactions = window.KeuanganStorage.getTransactions();
      const { months, activeMonthKey, activeMonthLabel } = window.KeuanganStorage.getAvailableMonths();

      // Jika belum ada bulan yang dipilih, arahkan ke Bulan Aktif
      if (!selectedMonthKey) {
        selectedMonthKey = activeMonthKey;
      }

      // Pastikan selectedMonthKey valid di list
      let focusedMonthObj = months.find(m => m.key === selectedMonthKey);
      if (!focusedMonthObj) {
        focusedMonthObj = months.find(m => m.key === activeMonthKey) || months[0] || {
          key: selectedMonthKey,
          label: window.KeuanganStorage.formatMonthLabel(selectedMonthKey),
          isActive: (selectedMonthKey === activeMonthKey),
          isHistory: (selectedMonthKey < activeMonthKey),
          income: 0,
          expense: 0,
          net: 0,
          count: 0,
          transactions: []
        };
        selectedMonthKey = focusedMonthObj.key;
      }

      const activeMonthObj = months.find(m => m.key === activeMonthKey) || focusedMonthObj;
      const isViewingActive = focusedMonthObj.isActive;
      const isViewingHistory = focusedMonthObj.isHistory;

      // 1. UPDATE KPI CARDS (Berdasarkan Bulan Terfokus)
      if (kpiTotalIncome) kpiTotalIncome.textContent = '+ ' + formatRupiah(focusedMonthObj.income);
      if (kpiTotalExpense) kpiTotalExpense.textContent = '- ' + formatRupiah(focusedMonthObj.expense);

      if (kpiNetCashflow) {
        kpiNetCashflow.textContent = (focusedMonthObj.net >= 0 ? '+ ' : '- ') + formatRupiah(Math.abs(focusedMonthObj.net));
        kpiNetCashflow.className = 'stat-card-value ' + (focusedMonthObj.net >= 0 ? 'text-income' : 'text-expense');
      }

      if (kpiNetBadge) {
        if (focusedMonthObj.net >= 0) {
          kpiNetBadge.className = 'trend-badge positive';
          kpiNetBadge.style.background = 'rgba(34, 197, 94, 0.18)';
          kpiNetBadge.style.color = '#4ade80';
          kpiNetBadge.style.border = '1px solid rgba(74, 222, 128, 0.35)';
          kpiNetBadge.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> Surplus';
        } else {
          kpiNetBadge.className = 'trend-badge';
          kpiNetBadge.style.background = 'rgba(239, 68, 68, 0.18)';
          kpiNetBadge.style.color = '#f87171';
          kpiNetBadge.style.border = '1px solid rgba(248, 113, 113, 0.35)';
          kpiNetBadge.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i> Defisit';
        }
      }

      if (kpiTxCount) kpiTxCount.textContent = `${focusedMonthObj.count}`;

      // Update Subtitles & Labels
      const periodStatusText = isViewingActive ? 'Bulan Aktif (Berjalan)' : 'History (Telah Berlalu)';
      if (kpiIncomeLabel) kpiIncomeLabel.textContent = `Pemasukan (${focusedMonthObj.label})`;
      if (kpiExpenseLabel) kpiExpenseLabel.textContent = `Pengeluaran (${focusedMonthObj.label})`;
      if (kpiIncomePeriod) kpiIncomePeriod.textContent = `${focusedMonthObj.label} • ${periodStatusText}`;
      if (kpiExpensePeriod) kpiExpensePeriod.textContent = `${focusedMonthObj.label} • ${periodStatusText}`;
      if (kpiNetPeriod) kpiNetPeriod.textContent = `${focusedMonthObj.label} • Saldo Bersih`;
      if (kpiTxPeriod) kpiTxPeriod.textContent = `${focusedMonthObj.count} Transaksi Terdata`;

      // 2. UPDATE KONTROL KOTAK KIRI (FOKUS & DROPDOWN RIWAYAT)
      if (focusMonthDropdown) {
        focusMonthDropdown.innerHTML = '';
        months.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.key;
          const statusTag = m.isActive ? ' [Bulan Aktif]' : ' [History]';
          opt.textContent = `${m.label}${statusTag}`;
          if (m.key === selectedMonthKey) {
            opt.selected = true;
          }
          focusMonthDropdown.appendChild(opt);
        });
        focusMonthDropdown.value = selectedMonthKey;
      }

      const currentIndex = months.findIndex(m => m.key === selectedMonthKey);
      if (btnFocusPrev) btnFocusPrev.disabled = (currentIndex <= 0);
      if (btnFocusNext) btnFocusNext.disabled = (currentIndex >= months.length - 1);

      if (focusStatPill) {
        const netF = focusedMonthObj.net;
        focusStatPill.textContent = (netF >= 0 ? '+ Surplus ' : '- Defisit ') + formatRupiah(Math.abs(netF));
        focusStatPill.className = 'box-stat-pill ' + (netF >= 0 ? 'positive' : 'negative');
      }

      // 3. UPDATE KOTAK KANAN ('b' - BULAN AKTIF BERJALAN)
      if (activeBoxTitle) {
        activeBoxTitle.textContent = `${activeMonthObj.label} (Aktif)`;
      }

      if (activeStatPill) {
        const netA = activeMonthObj.net;
        activeStatPill.textContent = (netA >= 0 ? '+ Surplus ' : '- Defisit ') + formatRupiah(Math.abs(netA));
        activeStatPill.className = 'box-stat-pill ' + (netA >= 0 ? 'positive' : 'negative');
      }

      // Banner Riwayat pada Tabel Transaksi
      if (historyBanner) {
        if (isViewingHistory) {
          historyBanner.style.display = 'flex';
          if (historyBannerMonthName) historyBannerMonthName.textContent = focusedMonthObj.label;
        } else {
          historyBanner.style.display = 'none';
        }
      }

      // 4. RENDER TABEL & GRAFIK DUA KOTAK
      renderTransactionTable(transactions, focusedMonthObj);
      renderDualCharts(focusedMonthObj, activeMonthObj);

      // Jika modal multi-bulan sedang terbuka, update juga tabelnya
      if (multiMonthModal && multiMonthModal.style.display === 'flex') {
        renderMultiMonthModal(months, activeMonthKey);
      }
    }

    // =========================================================
    // RENDER TABEL TRANSAKSI
    // =========================================================
    function renderTransactionTable(transactions, currentMonthData) {
      if (!txTableBody) return;
      txTableBody.innerHTML = '';

      const targetKey = selectedMonthKey || window.KeuanganStorage.getActiveMonthKey();

      const filtered = transactions.filter(t => {
        // Lingkup Periode: Hanya Bulan Terpilih atau Semua Bulan
        if (txPeriodScope === 'selected' && t.tanggal) {
          if (t.tanggal.substring(0, 7) !== targetKey) return false;
        }

        // Filter Arus (Semua | Pemasukan | Pengeluaran)
        if (currentStreamFilter !== 'all') {
          const tArus = t.arus || 'pengeluaran';
          if (tArus !== currentStreamFilter) return false;
        }

        // Pencarian Teks
        if (!searchFilterQuery) return true;
        const q = searchFilterQuery;
        return (
          (t.tujuan && t.tujuan.toLowerCase().includes(q)) ||
          (t.jenis && t.jenis.toLowerCase().includes(q)) ||
          (t.arus && t.arus.toLowerCase().includes(q)) ||
          (t.tanggal && t.tanggal.includes(q)) ||
          String(t.total).includes(q)
        );
      });

      if (tableStatsCount) {
        const scopeLabel = txPeriodScope === 'selected'
          ? (currentMonthData ? currentMonthData.label : 'Bulan Ini')
          : 'Semua Periode Riwayat';
        tableStatsCount.textContent = `Menampilkan ${filtered.length} transaksi (${scopeLabel})`;
      }

      if (filtered.length === 0) {
        txTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">
              <i class="fa-solid fa-scroll" style="font-size: 1.8rem; margin-bottom: 10px; display:block; opacity: 0.5; color: var(--border-gold-glow);"></i>
              Tidak ada catatan transaksi pada ${txPeriodScope === 'selected' ? (currentMonthData ? currentMonthData.label : 'bulan ini') : 'kriteria ini'}.
            </td>
          </tr>
        `;
        return;
      }

      filtered.forEach(t => {
        const isIncome = t.arus === 'pemasukan';
        let proofHtml = '<span class="no-proof-pill">-</span>';
        if (t.bukti_gambar) {
          proofHtml = `
            <button type="button" class="btn-proof-preview" title="Klik untuk memperbesar bukti">
              <img class="proof-mini-thumb" src="${t.bukti_gambar}" alt="Bukti" />
              <span>Lihat</span>
            </button>
          `;
        }

        const streamBadgeHtml = isIncome
          ? `<span class="badge-stream-income"><i class="fa-solid fa-arrow-down-long"></i> Masuk</span>`
          : `<span class="badge-stream-expense"><i class="fa-solid fa-arrow-up-long"></i> Keluar</span>`;

        const amountClass = isIncome ? 'tx-amount-inflow' : 'tx-amount-outflow';
        const amountPrefix = isIncome ? '+ ' : '- ';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="white-space:nowrap; color: var(--text-muted); font-size: 0.74rem;">
            ${t.tanggal || '-'}
          </td>
          <td>
            <span class="merchant-name-cell">${escapeHtml(t.tujuan)}</span>
            <span class="ref-subtext">Ref: ${escapeHtml(t.no_referensi || '-')}</span>
          </td>
          <td style="text-align: center;">
            ${streamBadgeHtml}
          </td>
          <td style="color: var(--text-muted); font-size: 0.74rem;">
            ${t.jenis || 'Transaksi'}
          </td>
          <td style="text-align: center;">
            ${proofHtml}
          </td>
          <td class="tx-amount-bold ${amountClass}">
            ${amountPrefix}${formatRupiah(t.total)}
          </td>
          <td style="text-align: center;">
            <button class="btn-table-del" data-id="${t.id}" title="Hapus transaksi ini">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        `;

        // Event Klik Lihat Bukti
        const btnProof = row.querySelector('.btn-proof-preview');
        if (btnProof) {
          btnProof.addEventListener('click', () => {
            openImageModal(
              t.bukti_gambar,
              t.tujuan,
              formatRupiah(t.total),
              t.tanggal,
              t.no_referensi,
              isIncome
            );
          });
        }

        // Event Hapus Transaksi
        const btnDel = row.querySelector('.btn-table-del');
        btnDel.addEventListener('click', () => {
          if (confirm(`Hapus transaksi "${t.tujuan}" (${amountPrefix}${formatRupiah(t.total)})?`)) {
            window.KeuanganStorage.deleteTransaction(t.id);
            renderDashboard();
          }
        });

        txTableBody.appendChild(row);
      });
    }

    // =========================================================
    // RENDER DUAL CHARTS (KOTAK KIRI: FOKUS, KOTAK KANAN: AKTIF)
    // =========================================================
    function createSingleMonthChart(canvasId, monthData, existingInstance) {
      if (!monthData) return existingInstance;
      const ctx = document.getElementById(canvasId);
      if (!ctx) return existingInstance;

      if (existingInstance) {
        existingInstance.destroy();
      }

      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Pemasukan (+)', 'Pengeluaran (-)'],
          datasets: [
            {
              data: [monthData.income, monthData.expense],
              backgroundColor: [
                'rgba(34, 197, 94, 0.88)',
                'rgba(239, 68, 68, 0.88)'
              ],
              borderColor: [
                '#4ade80',
                '#f87171'
              ],
              borderWidth: 1.5,
              borderRadius: 6,
              barPercentage: 0.65
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function(items) {
                  return `${monthData.label} • ${items[0].label}`;
                },
                label: function(item) {
                  return ` Nominal: ${formatRupiah(item.raw)}`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                font: { size: 10, family: 'Plus Jakarta Sans', weight: '600' },
                color: '#9eb8a1'
              },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: { size: 8 },
                color: '#9eb8a1',
                callback: function(val) {
                  if (val >= 1000000) return (val / 1000000) + 'jt';
                  if (val >= 1000) return (val / 1000) + 'k';
                  return val;
                }
              },
              grid: {
                color: 'rgba(229, 193, 88, 0.09)'
              }
            }
          }
        }
      });
    }

    function renderDualCharts(focusedData, activeData) {
      if (typeof Chart === 'undefined') return;
      focusedChartInstance = createSingleMonthChart('chartFocusedMonth', focusedData, focusedChartInstance);
      activeChartInstance = createSingleMonthChart('chartActiveMonth', activeData, activeChartInstance);
    }

    // =========================================================
    // MODAL PERBANDINGAN MULTI-BULAN (TABEL ARSIP HISTORIS)
    // =========================================================
    function openMultiMonthModal() {
      if (!multiMonthModal) return;
      const { months, activeMonthKey } = window.KeuanganStorage.getAvailableMonths();
      renderMultiMonthModal(months, activeMonthKey);
      multiMonthModal.style.display = 'flex';
    }

    function closeMultiMonthModal() {
      if (multiMonthModal) multiMonthModal.style.display = 'none';
    }

    function renderMultiMonthModal(months, activeMonthKey) {
      if (!multiMonthTableBody) return;
      multiMonthTableBody.innerHTML = '';

      let grandIncome = 0;
      let grandExpense = 0;

      months.forEach(m => {
        grandIncome += m.income;
        grandExpense += m.expense;

        const isCurrentActive = (m.key === activeMonthKey);
        const isSelected = (m.key === selectedMonthKey);

        const statusBadge = isCurrentActive
          ? `<span class="badge-month-status-pill active"><span class="status-pulse-dot" style="width:6px;height:6px;"></span> Aktif (Berjalan)</span>`
          : `<span class="badge-month-status-pill history"><i class="fa-solid fa-box-archive"></i> History</span>`;

        const netClass = m.net >= 0 ? 'text-income' : 'text-expense';
        const netPrefix = m.net >= 0 ? '+ ' : '- ';

        const tr = document.createElement('tr');
        if (isSelected) {
          tr.style.background = 'rgba(229, 193, 88, 0.08)';
        }

        tr.innerHTML = `
          <td>
            <strong style="color: ${isSelected ? 'var(--gold-primary)' : 'inherit'}; font-family: var(--font-title); font-size: 0.82rem;">
              ${m.label}
            </strong>
          </td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: right; color: #4ade80; font-weight: 600;">+ ${formatRupiah(m.income)}</td>
          <td style="text-align: right; color: #f87171; font-weight: 600;">- ${formatRupiah(m.expense)}</td>
          <td style="text-align: right; font-weight: 700;" class="${netClass}">${netPrefix}${formatRupiah(Math.abs(m.net))}</td>
          <td style="text-align: center; color: var(--text-muted); font-size: 0.74rem;">${m.count}</td>
          <td style="text-align: center;">
            <button type="button" class="btn-select-month-row" data-key="${m.key}">
              ${isSelected ? '<i class="fa-solid fa-check"></i> Sedang Dilihat' : 'Fokuskan'}
            </button>
          </td>
        `;

        const btnSelect = tr.querySelector('.btn-select-month-row');
        if (btnSelect) {
          btnSelect.addEventListener('click', () => {
            selectedMonthKey = m.key;
            closeMultiMonthModal();
            renderDashboard();
            if (typeof playMagicChime === 'function') {
              playMagicChime();
            }
          });
        }

        multiMonthTableBody.appendChild(tr);
      });

      // Update Ringkasan Akumulasi di Modal
      if (multiMonthSummaryCards) {
        const grandNet = grandIncome - grandExpense;
        multiMonthSummaryCards.innerHTML = `
          <div class="comp-kpi-box">
            <span class="comp-kpi-label">Akumulasi Pemasukan</span>
            <span class="comp-kpi-value text-income">+ ${formatRupiah(grandIncome)}</span>
          </div>
          <div class="comp-kpi-box">
            <span class="comp-kpi-label">Akumulasi Pengeluaran</span>
            <span class="comp-kpi-value text-expense">- ${formatRupiah(grandExpense)}</span>
          </div>
          <div class="comp-kpi-box">
            <span class="comp-kpi-label">Akumulasi Saldo Bersih</span>
            <span class="comp-kpi-value ${grandNet >= 0 ? 'text-income' : 'text-expense'}">
              ${grandNet >= 0 ? '+ ' : '- '}${formatRupiah(Math.abs(grandNet))}
            </span>
          </div>
          <div class="comp-kpi-box">
            <span class="comp-kpi-label">Total Bulan Tercatat</span>
            <span class="comp-kpi-value" style="color: var(--gold-primary);">
              ${months.length} Bulan (${months.filter(m => !m.isActive).length} History)
            </span>
          </div>
        `;
      }
    }

    const btnOpenMultiMonthModal = document.getElementById('btnOpenMultiMonthModal');
    if (btnOpenMultiMonthModal) {
      btnOpenMultiMonthModal.addEventListener('click', openMultiMonthModal);
    }
    if (btnCloseMultiMonthModal) {
      btnCloseMultiMonthModal.addEventListener('click', closeMultiMonthModal);
    }
    if (btnCloseMultiMonthBtn) {
      btnCloseMultiMonthBtn.addEventListener('click', closeMultiMonthModal);
    }
    if (multiMonthModal) {
      multiMonthModal.addEventListener('click', (e) => {
        if (e.target === multiMonthModal) closeMultiMonthModal();
      });
    }

    // =========================================================
    // EVENT LISTENERS KONTROL PERGANTIAN BULAN KOTAK KIRI
    // =========================================================

    // Dropdown Pilih Cepat Bulan Riwayat
    if (focusMonthDropdown) {
      focusMonthDropdown.addEventListener('change', (e) => {
        selectedMonthKey = e.target.value;
        renderDashboard();
        if (typeof playMagicChime === 'function') playMagicChime();
      });
    }

    // Geser ke Bulan Sebelumnya via Panah Kiri
    if (btnFocusPrev) {
      btnFocusPrev.addEventListener('click', () => {
        const { months } = window.KeuanganStorage.getAvailableMonths();
        const currentIndex = months.findIndex(m => m.key === selectedMonthKey);
        if (currentIndex > 0) {
          selectedMonthKey = months[currentIndex - 1].key;
          renderDashboard();
          if (typeof playMagicChime === 'function') playMagicChime();
        }
      });
    }

    // Geser ke Bulan Berikutnya via Panah Kanan
    if (btnFocusNext) {
      btnFocusNext.addEventListener('click', () => {
        const { months } = window.KeuanganStorage.getAvailableMonths();
        const currentIndex = months.findIndex(m => m.key === selectedMonthKey);
        if (currentIndex < months.length - 1) {
          selectedMonthKey = months[currentIndex + 1].key;
          renderDashboard();
          if (typeof playMagicChime === 'function') playMagicChime();
        }
      });
    }

    if (btnBackToActiveFromBanner) {
      btnBackToActiveFromBanner.addEventListener('click', () => {
        selectedMonthKey = window.KeuanganStorage.getActiveMonthKey();
        renderDashboard();
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }
      });
    }

    // =========================================================
    // INISIALISASI AWAL & AUTO-ROLLOVER CHECK
    // =========================================================
    const initialRollover = window.KeuanganStorage.checkAndApplyMonthRollover();
    selectedMonthKey = initialRollover.activeMonth;

    if (initialRollover.rolledOver && initialRollover.previousMonth) {
      showRolloverToast(
        'Pergantian Bulan Otomatis Terdeteksi!',
        `Selamat datang di ${initialRollover.activeLabel}! Data pengeluaran & pemasukan bulan ${initialRollover.previousLabel} telah tersimpan aman di History.`
      );
    }

    renderDashboard();
  });
})();

