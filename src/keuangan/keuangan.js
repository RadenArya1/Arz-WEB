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
    const reviewAmountPrefix = document.getElementById('reviewAmountPrefix');
    const reviewJenisSelect = document.getElementById('reviewJenisSelect');
    const reviewMerchantVal = document.getElementById('reviewMerchantVal');
    const reviewDateVal = document.getElementById('reviewDateVal');
    const btnSaveParsedTx = document.getElementById('btnSaveParsedTx');
    const btnClearParsedTx = document.getElementById('btnClearParsedTx');
    const btnToggleIncome = document.getElementById('btnToggleIncome');
    const btnToggleExpense = document.getElementById('btnToggleExpense');

    // Elements - Gmail Sync UI & Review Card Extensions
    const gmailSyncStrip = document.getElementById('gmailSyncStrip');
    const gmailAccountEmail = document.getElementById('gmailAccountEmail');
    const gmailStatusTitle = document.getElementById('gmailStatusTitle');
    const gmailStatusSub = document.getElementById('gmailStatusSub');
    const gmailStatusIcon = document.getElementById('gmailStatusIcon');
    const btnGmailConnect = document.getElementById('btnGmailConnect');
    const btnGmailConfig = document.getElementById('btnGmailConfig');
    const btnGmailSync = document.getElementById('btnGmailSync');
    const gmailLoopBadge = document.getElementById('gmailLoopBadge');
    const btnGmailReview = document.getElementById('btnGmailReview');
    const btnGmailReviewText = document.getElementById('btnGmailReviewText');
    const btnGmailDisconnect = document.getElementById('btnGmailDisconnect');

    // Elements - Gmail Connect Pop-up Modal
    const gmailConnectModal = document.getElementById('gmailConnectModal');
    const btnCloseGmailModal = document.getElementById('btnCloseGmailModal');
    const btnCancelGmailModal = document.getElementById('btnCancelGmailModal');
    const btnStartGoogleLogin = document.getElementById('btnStartGoogleLogin');
    const gmailClientIdInput = document.getElementById('gmailClientIdInput');
    const btnPasteClientId = document.getElementById('btnPasteClientId');
    const btnCopyOrigin = document.getElementById('btnCopyOrigin');
    const copyOriginText = document.getElementById('copyOriginText');
    const currentOriginDisplay = document.getElementById('currentOriginDisplay');
    const gmailModalAlert = document.getElementById('gmailModalAlert');
    const gmailModalAlertText = document.getElementById('gmailModalAlertText');
    const gmailModalAlertIcon = document.getElementById('gmailModalAlertIcon');
    const gmailConnectedAccountBox = document.getElementById('gmailConnectedAccountBox');
    const gmailConnectedEmailDisplay = document.getElementById('gmailConnectedEmailDisplay');
    const btnGmailSwitchAccount = document.getElementById('btnGmailSwitchAccount');

    const reviewCardTitle = document.getElementById('reviewCardTitle');
    const reviewCardIcon = document.getElementById('reviewCardIcon');
    const reviewSourceBadge = document.getElementById('reviewSourceBadge');
    const reviewQueueCounter = document.getElementById('reviewQueueCounter');
    const reviewWarningsBox = document.getElementById('reviewWarningsBox');
    const btnSkipParsedTx = document.getElementById('btnSkipParsedTx');
    const btnDismissParsedTx = document.getElementById('btnDismissParsedTx');
    const btnSaveAllParsedTx = document.getElementById('btnSaveAllParsedTx');
    const btnSaveAllParsedTxText = document.getElementById('btnSaveAllParsedTxText');
    const chkGmailAutoInput = document.getElementById('chkGmailAutoInput');
    const chkGmailAutoLoop = document.getElementById('chkGmailAutoLoop');

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

    // Helper: Format Angka Ribuan Bersih (tanpa 'Rp' dan tanpa tanda +/-)
    function formatNominalRibuan(num) {
      if (!num || isNaN(num)) return '0';
      return Math.round(Math.abs(num)).toLocaleString('id-ID');
    }

    // Helper: Update Cashflow Switcher State (Pemasukan vs Pengeluaran)
    function setReviewCardArus(arus, keepJenis = false) {
      if (!currentParsedData) return;
      currentParsedData.arus = arus;

      if (arus === 'pemasukan') {
        if (btnToggleIncome) btnToggleIncome.classList.add('active');
        if (btnToggleExpense) btnToggleExpense.classList.remove('active');
        if (reviewAmountPrefix) {
          reviewAmountPrefix.textContent = '+';
          reviewAmountPrefix.className = 'review-amount-prefix text-income';
        }
        if (reviewTotalVal) {
          reviewTotalVal.className = 'review-amount-val editable-field text-income';
        }

        // Otomatisasi Penyesuaian Jenis Transaksi jika sebelumnya jenis pengeluaran
        if (!keepJenis && reviewJenisSelect) {
          const curJenis = reviewJenisSelect.value;
          const isExpenseSpecific = [
            'Pembayaran QR', 'Transfer Bank', 'Transfer (BI FAST)', 
            'Tarik Tunai (ATM)', 'Belanja & Konsumsi', 'Makanan & Minuman', 
            'Pembayaran Tagihan'
          ].includes(curJenis);
          if (isExpenseSpecific || !curJenis || curJenis === 'Pembayaran Lainnya') {
            reviewJenisSelect.value = 'Transfer Masuk';
            currentParsedData.jenis = 'Transfer Masuk';
          }
        }
      } else {
        if (btnToggleExpense) btnToggleExpense.classList.add('active');
        if (btnToggleIncome) btnToggleIncome.classList.remove('active');
        if (reviewAmountPrefix) {
          reviewAmountPrefix.textContent = '-';
          reviewAmountPrefix.className = 'review-amount-prefix text-expense';
        }
        if (reviewTotalVal) {
          reviewTotalVal.className = 'review-amount-val editable-field text-expense';
        }

        // Otomatisasi Penyesuaian Jenis Transaksi jika sebelumnya pemasukan
        if (!keepJenis && reviewJenisSelect) {
          const curJenis = reviewJenisSelect.value;
          if (curJenis === 'Transfer Masuk' || curJenis === 'Gaji / Pendapatan') {
            reviewJenisSelect.value = 'Transfer Bank';
            currentParsedData.jenis = 'Transfer Bank';
          }
        }
      }

      if (reviewTotalVal) {
        reviewTotalVal.textContent = formatNominalRibuan(currentParsedData.total || 0);
      }
    }

    if (btnToggleIncome) {
      btnToggleIncome.addEventListener('click', () => setReviewCardArus('pemasukan'));
    }
    if (btnToggleExpense) {
      btnToggleExpense.addEventListener('click', () => setReviewCardArus('pengeluaran'));
    }

    // Interaktivitas Dropdown Jenis Transaksi
    if (reviewJenisSelect) {
      reviewJenisSelect.addEventListener('change', () => {
        if (!currentParsedData) return;
        const selectedJenis = reviewJenisSelect.value;
        currentParsedData.jenis = selectedJenis;

        // Jika user memilih 'Transfer Masuk' atau 'Gaji / Pendapatan', otomatis ubah arus ke Pemasukan (+)
        if (selectedJenis === 'Transfer Masuk' || selectedJenis === 'Gaji / Pendapatan') {
          setReviewCardArus('pemasukan', true);
        } else {
          // Jika memilih jenis pengeluaran (QRIS, ATM, Belanja, dll), otomatis ubah arus ke Pengeluaran (-)
          setReviewCardArus('pengeluaran', true);
        }
      });
    }

    // Interaktivitas Input / Edit Nominal Langsung
    if (reviewTotalVal) {
      reviewTotalVal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          reviewTotalVal.blur();
        }
      });

      reviewTotalVal.addEventListener('blur', () => {
        if (!currentParsedData) return;
        const raw = reviewTotalVal.textContent.trim();
        let cleaned = 0;
        if (window.ReceiptParser && typeof window.ReceiptParser.cleanNominal === 'function') {
          cleaned = window.ReceiptParser.cleanNominal(raw);
        } else {
          cleaned = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
        }
        currentParsedData.total = cleaned;
        currentParsedData.nominal = Math.max(0, cleaned - (currentParsedData.biaya_admin || 0));
        reviewTotalVal.textContent = formatNominalRibuan(cleaned);
      });
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

    function resetReviewCardForOcr() {
      if (reviewCardTitle) reviewCardTitle.textContent = 'Hasil Ekstraksi Struk Digital';
      if (reviewCardIcon) reviewCardIcon.className = 'fa-solid fa-receipt';
      if (reviewSourceBadge) reviewSourceBadge.style.display = 'none';
      if (reviewQueueCounter) reviewQueueCounter.style.display = 'none';
      if (reviewWarningsBox) {
        reviewWarningsBox.style.display = 'none';
        reviewWarningsBox.innerHTML = '';
      }
      if (btnSkipParsedTx) btnSkipParsedTx.style.display = 'none';
      if (btnDismissParsedTx) btnDismissParsedTx.style.display = 'none';
      if (btnSaveAllParsedTx) btnSaveAllParsedTx.style.display = 'none';
      if (btnClearParsedTx) btnClearParsedTx.style.display = 'inline-flex';
    }

    function handleTextParsing(text) {
      if (!window.ReceiptParser) return;
      const parsed = window.ReceiptParser.parseReceiptText(text);

      if (parsed && (parsed.total > 0 || currentImageProof)) {
        currentParsedData = parsed;
        resetReviewCardForOcr();

        // 1. Sinkronisasi Jenis Transaksi yang Terdeteksi
        if (reviewJenisSelect) {
          const detectedJenis = parsed.jenis || 'Pembayaran Lainnya';
          let matchFound = false;
          for (let i = 0; i < reviewJenisSelect.options.length; i++) {
            if (reviewJenisSelect.options[i].value.toLowerCase() === detectedJenis.toLowerCase()) {
              reviewJenisSelect.selectedIndex = i;
              matchFound = true;
              break;
            }
          }
          if (!matchFound) {
            const newOpt = document.createElement('option');
            newOpt.value = detectedJenis;
            newOpt.textContent = `⚡ ${detectedJenis}`;
            newOpt.selected = true;
            reviewJenisSelect.appendChild(newOpt);
          }
        }

        // 2. Set arus switcher, nominal terformat, & text color
        setReviewCardArus(parsed.arus || 'pengeluaran', true);

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

    /**
     * Menampilkan item transaksi dari antrean Gmail pada Review Card yang sudah ada
     */
    function displayGmailQueueItem() {
      if (typeof window.GmailSync === 'undefined') return;
      const currentItem = window.GmailSync.getCurrentItem();
      const queue = window.GmailSync.getQueue();

      if (!currentItem) {
        currentParsedData = null;
        if (parsedReviewCard) parsedReviewCard.style.display = 'none';
        return;
      }

      // Proteksi: jangan menimpa jika pengguna sedang memeriksa hasil scan OCR struk yang belum disimpan
      if (currentParsedData && currentParsedData.sumber !== 'gmail' && (currentParsedData.total > 0 || currentImageProof)) {
        const switchConfirm = confirm('Terdapat data struk foto yang sedang ditinjau. Beralih ke antrean transaksi Gmail?');
        if (!switchConfirm) return;
      }

      currentParsedData = Object.assign({}, currentItem.tx);
      currentImageProof = '';

      // Sembunyikan lampiran thumbnail foto struk karena Gmail tidak membawa foto struk
      if (reviewImagePreview) reviewImagePreview.style.display = 'none';

      // 1. Sinkronisasi Jenis Transaksi dari Gmail
      if (reviewJenisSelect) {
        const detectedJenis = currentParsedData.jenis || 'Transaksi BCA';
        let matchFound = false;
        for (let i = 0; i < reviewJenisSelect.options.length; i++) {
          if (reviewJenisSelect.options[i].value.toLowerCase() === detectedJenis.toLowerCase()) {
            reviewJenisSelect.selectedIndex = i;
            matchFound = true;
            break;
          }
        }
        if (!matchFound) {
          const newOpt = document.createElement('option');
          newOpt.value = detectedJenis;
          newOpt.textContent = `📧 ${detectedJenis}`;
          newOpt.selected = true;
          reviewJenisSelect.appendChild(newOpt);
        }
      }

      // 2. Set toggle arus & nominal
      setReviewCardArus(currentParsedData.arus || 'pengeluaran', true);

      if (reviewMerchantVal) {
        reviewMerchantVal.textContent = currentParsedData.tujuan || '-';
      }
      if (reviewDateVal) {
        reviewDateVal.textContent = currentParsedData.tanggal || '-';
      }

      // Perbarui header review card & identitas sumber Gmail
      if (reviewCardTitle) reviewCardTitle.textContent = 'Hasil Deteksi Transaksi BCA';
      if (reviewCardIcon) reviewCardIcon.className = 'fa-solid fa-envelope';
      if (reviewSourceBadge) reviewSourceBadge.style.display = 'inline-flex';

      const currentIndex = queue.findIndex(q => q.messageId === currentItem.messageId);
      if (reviewQueueCounter) {
        reviewQueueCounter.style.display = 'inline-flex';
        reviewQueueCounter.textContent = `${currentIndex >= 0 ? currentIndex + 1 : 1} dari ${queue.length}`;
      }

      // Tampilkan daftar peringatan (warnings) jika ada
      if (reviewWarningsBox) {
        if (currentItem.warnings && currentItem.warnings.length > 0) {
          reviewWarningsBox.innerHTML = currentItem.warnings
            .map(w => `<div class="review-warning-item"><i class="fa-solid fa-triangle-exclamation"></i> <span>${escapeHtml(w)}</span></div>`)
            .join('');
          reviewWarningsBox.style.display = 'flex';
        } else {
          reviewWarningsBox.style.display = 'none';
          reviewWarningsBox.innerHTML = '';
        }
      }

      // Tampilkan tombol kontrol antrean Gmail
      if (btnSkipParsedTx) btnSkipParsedTx.style.display = queue.length > 1 ? 'inline-flex' : 'none';
      if (btnDismissParsedTx) btnDismissParsedTx.style.display = 'inline-flex';
      if (btnClearParsedTx) btnClearParsedTx.style.display = 'inline-flex';
      if (btnSaveAllParsedTx) {
        btnSaveAllParsedTx.style.display = queue.length > 1 ? 'inline-flex' : 'none';
        if (btnSaveAllParsedTxText) {
          btnSaveAllParsedTxText.textContent = `Simpan Semua (${queue.length})`;
        }
      }

      if (parsedReviewCard) {
        parsedReviewCard.style.display = 'flex';
        parsedReviewCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Simpan Transaksi (OCR Struk maupun Gmail)
    if (btnSaveParsedTx) {
      btnSaveParsedTx.addEventListener('click', () => {
        if (!currentParsedData) return;

        // Ambil nominal terkini jika diedit di #reviewTotalVal
        if (reviewTotalVal) {
          const raw = reviewTotalVal.textContent.trim();
          let cleaned = 0;
          if (window.ReceiptParser && typeof window.ReceiptParser.cleanNominal === 'function') {
            cleaned = window.ReceiptParser.cleanNominal(raw);
          } else {
            cleaned = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
          }
          currentParsedData.total = cleaned;
          currentParsedData.nominal = Math.max(0, cleaned - (currentParsedData.biaya_admin || 0));
        }

        // Ambil jenis transaksi terkini dari dropdown
        if (reviewJenisSelect) {
          currentParsedData.jenis = reviewJenisSelect.value;
        }

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

        // Lampirkan foto bukti transaksi (jika ada dari OCR)
        currentParsedData.bukti_gambar = currentImageProof || '';

        const isGmailSource = (currentParsedData.sumber === 'gmail');
        const gmailMsgId = isGmailSource ? currentParsedData.gmail_message_id : null;

        window.KeuanganStorage.addTransaction(currentParsedData);

        // Feedback audio
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }

        // Fokuskan tampilan ke bulan transaksi yang baru disimpan
        if (currentParsedData.tanggal) {
          selectedMonthKey = currentParsedData.tanggal.substring(0, 7);
        }

        // Jika transaksi dari Gmail, tandai 'saved' di processed map
        if (isGmailSource && gmailMsgId && window.GmailSync) {
          window.GmailSync.markItemSaved(gmailMsgId);
        }

        // Reset input & render ulang
        setProofImage('');
        currentParsedData = null;

        // Jika masih ada item tersisa di antrean Gmail, langsung tampilkan berikutnya otomatis
        if (isGmailSource && window.GmailSync && window.GmailSync.getQueue().length > 0) {
          renderDashboard();
          displayGmailQueueItem();
        } else {
          if (parsedReviewCard) parsedReviewCard.style.display = 'none';
          renderDashboard();
        }
      });
    }

    // Tombol Abaikan Transaksi Gmail (Menandai 'dismissed')
    if (btnDismissParsedTx) {
      btnDismissParsedTx.addEventListener('click', () => {
        if (!currentParsedData) return;
        if (currentParsedData.sumber === 'gmail' && currentParsedData.gmail_message_id && window.GmailSync) {
          window.GmailSync.markItemDismissed(currentParsedData.gmail_message_id);
          if (window.GmailSync.getQueue().length > 0) {
            displayGmailQueueItem();
          } else {
            currentParsedData = null;
            if (parsedReviewCard) parsedReviewCard.style.display = 'none';
          }
        }
      });
    }

    // Tombol Simpan Semua Transaksi Gmail Sekaligus
    if (btnSaveAllParsedTx) {
      btnSaveAllParsedTx.addEventListener('click', () => {
        if (window.GmailSync && typeof window.GmailSync.saveAllQueueItems === 'function') {
          const count = window.GmailSync.saveAllQueueItems();
          if (count > 0) {
            currentParsedData = null;
            if (parsedReviewCard) parsedReviewCard.style.display = 'none';
            renderDashboard();
            if (typeof playMagicChime === 'function') playMagicChime();
          }
        }
      });
    }

    // Tombol Lewati Transaksi Gmail (Pindah ke item berikutnya tanpa menghapus antrean)
    if (btnSkipParsedTx) {
      btnSkipParsedTx.addEventListener('click', () => {
        if (!currentParsedData) return;
        if (currentParsedData.sumber === 'gmail' && window.GmailSync) {
          window.GmailSync.skipItem();
          displayGmailQueueItem();
        }
      });
    }

    // Batal Input (Tutup Review Card)
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

    // Modal & Accessible Focus Management
    let lastActiveTrigger = null;
    let pendingDeleteTxId = null;

    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteTxName = document.getElementById('deleteTxName');
    const deleteTxDate = document.getElementById('deleteTxDate');
    const deleteTxAmount = document.getElementById('deleteTxAmount');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');

    function trapModalFocus(modalEl, e) {
      if (!modalEl || modalEl.style.display !== 'flex') return;
      const focusable = modalEl.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }

    // Modal Lightbox Handlers
    function openImageModal(imgSrc, title, amount, date, ref, isIncome) {
      if (!imageModal || !modalFullImage) return;
      lastActiveTrigger = document.activeElement;
      modalFullImage.src = imgSrc;
      if (modalTxTitle) modalTxTitle.textContent = title || 'Bukti Transaksi';
      if (modalTxSubtitle) modalTxSubtitle.textContent = date || '-';
      if (modalTxRef) modalTxRef.textContent = `Ref: ${ref || '-'}`;
      if (modalTxAmount) {
        modalTxAmount.textContent = (isIncome ? '+ ' : '- ') + amount;
        modalTxAmount.className = 'modal-footer-amount ' + (isIncome ? 'text-income' : 'text-expense');
      }
      imageModal.style.display = 'flex';
      if (btnCloseModal) btnCloseModal.focus();
    }

    function closeImageModal() {
      if (imageModal) imageModal.style.display = 'none';
      if (modalFullImage) modalFullImage.src = '';
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
    }

    // Modal Konfirmasi Hapus Handlers
    function openDeleteConfirmModal(t) {
      if (!deleteConfirmModal) {
        if (confirm(`Hapus transaksi "${t.tujuan}"?`)) {
          window.KeuanganStorage.deleteTransaction(t.id);
          renderDashboard();
        }
        return;
      }
      lastActiveTrigger = document.activeElement;
      pendingDeleteTxId = t.id;
      if (deleteTxName) deleteTxName.textContent = t.tujuan || 'Tanpa Keterangan';
      if (deleteTxDate) deleteTxDate.textContent = t.tanggal || '-';
      if (deleteTxAmount) {
        const isInc = t.arus === 'pemasukan';
        deleteTxAmount.textContent = (isInc ? '+ ' : '- ') + formatRupiah(t.total);
        deleteTxAmount.className = 'delete-tx-amount ' + (isInc ? 'text-income' : 'text-expense');
      }
      deleteConfirmModal.style.display = 'flex';
      if (btnCancelDelete) btnCancelDelete.focus();
    }

    function closeDeleteConfirmModal() {
      if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
      pendingDeleteTxId = null;
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
    }

    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', () => {
        if (pendingDeleteTxId) {
          window.KeuanganStorage.deleteTransaction(pendingDeleteTxId);
          closeDeleteConfirmModal();
          renderDashboard();
        }
      });
    }

    if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteConfirmModal);
    if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener('click', closeDeleteConfirmModal);
    if (deleteConfirmModal) {
      deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) closeDeleteConfirmModal();
      });
    }

    // Modal Hubungkan Gmail Handlers
    function showGmailModalAlert(message, type = 'warning') {
      if (!gmailModalAlert || !gmailModalAlertText) return;
      gmailModalAlertText.innerHTML = message;
      gmailModalAlert.className = 'gmail-modal-alert ' + type;
      if (gmailModalAlertIcon) {
        if (type === 'error') {
          gmailModalAlertIcon.className = 'fa-solid fa-triangle-exclamation';
        } else if (type === 'success') {
          gmailModalAlertIcon.className = 'fa-solid fa-circle-check';
        } else {
          gmailModalAlertIcon.className = 'fa-solid fa-circle-info';
        }
      }
      gmailModalAlert.style.display = 'flex';
      setTimeout(() => {
        gmailModalAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }

    function hideGmailModalAlert() {
      if (gmailModalAlert) {
        gmailModalAlert.style.display = 'none';
      }
    }

    function openGmailConnectModal(initialAlertMsg = '', alertType = 'warning') {
      if (!gmailConnectModal) return;
      lastActiveTrigger = document.activeElement;

      // Sinkronkan origin browser saat ini
      if (currentOriginDisplay) {
        currentOriginDisplay.textContent = window.location.origin;
      }

      // Ambil Client ID yang sudah tersimpan jika ada
      if (gmailClientIdInput && window.GmailConfig) {
        const curId = window.GmailConfig.getClientId ? window.GmailConfig.getClientId() : '';
        gmailClientIdInput.value = curId || '';
      }

      // Sinkronkan state checkbox auto-input
      if (chkGmailAutoInput && window.GmailSync && typeof window.GmailSync.isAutoInputEnabled === 'function') {
        chkGmailAutoInput.checked = window.GmailSync.isAutoInputEnabled();
      }

      // Sinkronkan state checkbox auto-check berkala (seperti auto absen)
      if (chkGmailAutoLoop && window.GmailSync && typeof window.GmailSync.isAutoSyncLoopEnabled === 'function') {
        chkGmailAutoLoop.checked = window.GmailSync.isAutoSyncLoopEnabled();
      }

      // Periksa apakah akun sudah terhubung & terkunci permanen
      if (gmailConnectedAccountBox && gmailConnectedEmailDisplay) {
        const connState = window.GmailSync && typeof window.GmailSync.getConnectionState === 'function'
          ? window.GmailSync.getConnectionState()
          : { connected: false };
        if (connState.connected && (connState.email || connState.login_hint)) {
          const lockedEmail = connState.email || connState.login_hint;
          gmailConnectedAccountBox.style.display = 'flex';
          gmailConnectedEmailDisplay.textContent = lockedEmail;
          if (btnStartGoogleLogin) {
            btnStartGoogleLogin.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> <span>Sinkronkan Akun Ini</span>';
          }
        } else {
          gmailConnectedAccountBox.style.display = 'none';
          if (btnStartGoogleLogin) {
            btnStartGoogleLogin.innerHTML = '<i class="fa-brands fa-google"></i> <span>Buka Pop-up Login Google</span>';
          }
        }
      }

      if (initialAlertMsg) {
        showGmailModalAlert(initialAlertMsg, alertType);
      } else {
        hideGmailModalAlert();
      }

      gmailConnectModal.style.display = 'flex';
      if (btnStartGoogleLogin) {
        btnStartGoogleLogin.focus();
      }
    }

    function closeGmailConnectModal() {
      if (gmailConnectModal) {
        gmailConnectModal.style.display = 'none';
      }
      hideGmailModalAlert();
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
    }

    if (btnCloseGmailModal) btnCloseGmailModal.addEventListener('click', closeGmailConnectModal);
    if (btnCancelGmailModal) btnCancelGmailModal.addEventListener('click', closeGmailConnectModal);
    if (gmailConnectModal) {
      gmailConnectModal.addEventListener('click', (e) => {
        if (e.target === gmailConnectModal) closeGmailConnectModal();
      });
    }

    if (btnCopyOrigin) {
      btnCopyOrigin.addEventListener('click', () => {
        const origin = window.location.origin;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(origin).then(() => {
            if (copyOriginText) copyOriginText.textContent = 'Tersalin!';
            setTimeout(() => { if (copyOriginText) copyOriginText.textContent = 'Salin'; }, 2000);
          }).catch(() => {
            if (copyOriginText) copyOriginText.textContent = 'Tersalin!';
          });
        } else {
          if (copyOriginText) copyOriginText.textContent = 'Tersalin!';
        }
      });
    }

    if (btnPasteClientId) {
      btnPasteClientId.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(text => {
            if (text && text.trim() && gmailClientIdInput) {
              gmailClientIdInput.value = text.trim();
              gmailClientIdInput.focus();
              hideGmailModalAlert();
            }
          }).catch(() => {});
        }
      });
    }

    if (chkGmailAutoInput) {
      chkGmailAutoInput.addEventListener('change', () => {
        if (window.GmailSync && typeof window.GmailSync.setAutoInputEnabled === 'function') {
          window.GmailSync.setAutoInputEnabled(chkGmailAutoInput.checked);
        }
      });
    }

    if (chkGmailAutoLoop) {
      chkGmailAutoLoop.addEventListener('change', () => {
        if (window.GmailSync && typeof window.GmailSync.setAutoSyncLoopEnabled === 'function') {
          window.GmailSync.setAutoSyncLoopEnabled(chkGmailAutoLoop.checked);
        }
      });
    }

    if (btnGmailSwitchAccount) {
      btnGmailSwitchAccount.addEventListener('click', () => {
        if (confirm('Apakah Anda ingin berganti ke akun Google yang lain?')) {
          showGmailModalAlert('Membuka dialog pemilihan akun Google...', 'info');
          if (window.GmailSync && typeof window.GmailSync.switchAccount === 'function') {
            window.GmailSync.switchAccount();
          }
        }
      });
    }

    if (btnStartGoogleLogin) {
      btnStartGoogleLogin.addEventListener('click', () => {
        let inputId = gmailClientIdInput ? gmailClientIdInput.value.trim() : '';
        if (!inputId && window.GmailConfig && typeof window.GmailConfig.getClientId === 'function') {
          inputId = window.GmailConfig.getClientId();
        }
        if (!inputId || inputId === 'GANTI_DENGAN_CLIENT_ID' || inputId.length < 10) {
          showGmailModalAlert('Silakan tempel atau masukkan OAuth Client ID Google Anda terlebih dahulu.', 'warning');
          if (gmailClientIdInput) gmailClientIdInput.focus();
          return;
        }

        // Simpan Client ID ke localStorage
        if (window.GmailConfig && typeof window.GmailConfig.setClientId === 'function') {
          window.GmailConfig.setClientId(inputId);
        }

        showGmailModalAlert('Menyambungkan ke akun Google...', 'success');

        // Buka Pop-up Otorisasi Google langsung dalam thread event klik ini (tanpa ganti akun)
        if (window.GmailSync) {
          window.GmailSync.loginWithGoogle({ forceSelectAccount: false });
        }
      });
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeImageModal);
    if (imageModal) {
      imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) closeImageModal();
      });
    }

    // Global Modal Escape & Focus Trap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeImageModal();
        closeMultiMonthModal();
        closeDeleteConfirmModal();
        closeGmailConnectModal();
      } else if (e.key === 'Tab') {
        trapModalFocus(imageModal, e);
        trapModalFocus(multiMonthModal, e);
        trapModalFocus(deleteConfirmModal, e);
        trapModalFocus(gmailConnectModal, e);
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
        const isSelectedMonth = txPeriodScope === 'selected';
        const emptyLabel = isSelectedMonth ? (currentMonthData ? currentMonthData.label : 'bulan terpilih') : 'filter yang diterapkan';
        txTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-state-cell">
              <div class="table-empty-container">
                <div class="empty-icon-ring">
                  <i class="fa-solid fa-receipt"></i>
                </div>
                <h4 class="empty-title">Belum Ada Catatan Transaksi</h4>
                <p class="empty-desc">
                  Tidak ada transaksi yang tercatat pada <strong>${escapeHtml(emptyLabel)}</strong>. Unggah atau tempel struk bukti transfer untuk mulai mencatat secara otomatis.
                </p>
                <button type="button" class="btn-empty-cta" id="btnEmptyCtaPaste">
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                  <span>Unggah Struk Sekarang</span>
                </button>
              </div>
            </td>
          </tr>
        `;
        const btnCta = txTableBody.querySelector('#btnEmptyCtaPaste');
        if (btnCta) {
          btnCta.addEventListener('click', () => {
            const dropzone = document.getElementById('receiptDropzone');
            if (dropzone) {
              dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
              dropzone.focus();
            }
          });
        }
        return;
      }

      filtered.forEach(t => {
        const isIncome = t.arus === 'pemasukan';

        const streamBadgeHtml = isIncome
          ? `<span class="badge-stream-income"><i class="fa-solid fa-arrow-down-long"></i> Masuk</span>`
          : `<span class="badge-stream-expense"><i class="fa-solid fa-arrow-up-long"></i> Keluar</span>`;

        const amountClass = isIncome ? 'tx-amount-inflow' : 'tx-amount-outflow';
        const amountPrefix = isIncome ? '+ ' : '- ';

        let jenisIcon = 'fa-receipt';
        const jLower = (t.jenis || '').toLowerCase();
        if (jLower.includes('qr') || jLower.includes('qris')) jenisIcon = 'fa-qrcode';
        else if (jLower.includes('atm') || jLower.includes('tarik tunai')) jenisIcon = 'fa-money-bill-wave';
        else if (jLower.includes('bi fast') || jLower.includes('bi-fast')) jenisIcon = 'fa-bolt';
        else if (jLower.includes('masuk')) jenisIcon = 'fa-arrow-down-left';
        else if (jLower.includes('transfer')) jenisIcon = 'fa-money-bill-transfer';
        else if (jLower.includes('belanja')) jenisIcon = 'fa-bag-shopping';
        else if (jLower.includes('makan') || jLower.includes('cafe') || jLower.includes('kopi')) jenisIcon = 'fa-utensils';
        else if (jLower.includes('tagihan') || jLower.includes('pln') || jLower.includes('pulsa')) jenisIcon = 'fa-file-invoice-dollar';
        else if (jLower.includes('gaji') || jLower.includes('salary')) jenisIcon = 'fa-briefcase';

        const jenisBadgeHtml = `
          <span class="tx-jenis-badge" title="Kategori: ${escapeHtml(t.jenis || 'Transaksi')}">
            <i class="fa-solid ${jenisIcon}"></i> ${escapeHtml(t.jenis || 'Transaksi')}
          </span>
        `;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="white-space:nowrap; color: var(--text-muted); font-size: 0.74rem;">
            ${t.tanggal || '-'}
          </td>
          <td>
            <span class="merchant-name-cell">${escapeHtml(t.tujuan)}</span>
            ${t.sumber === 'gmail' ? '<span class="source-tag-gmail" title="Terdeteksi otomatis dari Gmail BCA"><i class="fa-solid fa-envelope"></i> Gmail</span>' : ''}
            ${t.bukti_gambar ? '<button type="button" class="btn-proof-preview proof-mini-badge" title="Lihat foto bukti struk"><i class="fa-solid fa-image"></i> Struk</button>' : ''}
          </td>
          <td style="text-align: center;">
            ${streamBadgeHtml}
          </td>
          <td style="font-size: 0.74rem;">
            ${jenisBadgeHtml}
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

        // Event Hapus Transaksi (Konfirmasi Modal Halus)
        const btnDel = row.querySelector('.btn-table-del');
        btnDel.addEventListener('click', () => {
          openDeleteConfirmModal(t);
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
                'rgba(16, 185, 129, 0.85)',
                'rgba(239, 68, 68, 0.85)'
              ],
              borderColor: [
                '#34d399',
                '#f87171'
              ],
              borderWidth: 1.5,
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: 0.58
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(6, 16, 10, 0.95)',
              titleColor: '#f0fdf4',
              titleFont: { size: 12, family: 'Plus Jakarta Sans', weight: '700' },
              bodyColor: '#e2e8f0',
              bodyFont: { size: 12, family: 'JetBrains Mono', weight: '600' },
              borderColor: 'rgba(52, 211, 153, 0.35)',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              boxPadding: 4,
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
                color: '#94a3b8'
              },
              grid: { display: false },
              border: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: { size: 9, family: 'JetBrains Mono' },
                color: '#64748b',
                callback: function(val) {
                  if (val >= 1000000) return (val / 1000000) + 'jt';
                  if (val >= 1000) return (val / 1000) + 'k';
                  return val;
                }
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.04)'
              },
              border: { display: false }
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
      lastActiveTrigger = document.activeElement;
      const { months, activeMonthKey } = window.KeuanganStorage.getAvailableMonths();
      renderMultiMonthModal(months, activeMonthKey);
      multiMonthModal.style.display = 'flex';
      if (btnCloseMultiMonthModal) btnCloseMultiMonthModal.focus();
    }

    function closeMultiMonthModal() {
      if (multiMonthModal) multiMonthModal.style.display = 'none';
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
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

    // =========================================================
    // INISIALISASI INTEGRASI GMAIL SYNC (ADITIF & TAHAN GAGAL)
    // =========================================================
    if (typeof window.GmailSync !== 'undefined') {
      if (typeof window.GmailSync.setModalHandler === 'function') {
        window.GmailSync.setModalHandler((msg) => openGmailConnectModal(msg, 'warning'));
      }

      if (typeof window.GmailSync.onConnectSuccess === 'function') {
        window.GmailSync.onConnectSuccess(() => {
          closeGmailConnectModal();
        });
      }

      if (typeof window.GmailSync.onConnectError === 'function') {
        window.GmailSync.onConnectError((err) => {
          const msg = typeof err === 'string' ? err : 'Pop-up Google diblokir browser. Izinkan pop-up pada bilah URL atas.';
          showGmailModalAlert(msg, 'error');
        });
      }

      if (btnGmailConnect) {
        btnGmailConnect.addEventListener('click', () => {
          openGmailConnectModal();
        });
      }

      if (btnGmailConfig) {
        btnGmailConfig.addEventListener('click', () => {
          openGmailConnectModal();
        });
      }

      if (btnGmailSync) {
        btnGmailSync.addEventListener('click', () => {
          window.GmailSync.syncNow();
        });
      }

      if (btnGmailReview) {
        btnGmailReview.addEventListener('click', () => {
          displayGmailQueueItem();
        });
      }

      if (btnGmailDisconnect) {
        btnGmailDisconnect.addEventListener('click', () => {
          if (confirm('Apakah Anda yakin ingin memutuskan integrasi dengan Gmail?')) {
            window.GmailSync.disconnect();
          }
        });
      }

      if (typeof window.GmailSync.setModalHandler === 'function') {
        window.GmailSync.setModalHandler((msg) => {
          openGmailConnectModal(msg, 'warning');
        });
      }

      if (typeof window.GmailSync.onConnectError === 'function') {
        window.GmailSync.onConnectError((err) => {
          showGmailModalAlert(err, 'error');
        });
      }

      if (typeof window.GmailSync.onConnectSuccess === 'function') {
        window.GmailSync.onConnectSuccess(() => {
          closeGmailConnectModal();
        });
      }

      window.GmailSync.onStatusChange(({ state, message, details }) => {
        const connState = window.GmailSync && typeof window.GmailSync.getConnectionState === 'function'
          ? window.GmailSync.getConnectionState()
          : { connected: false };
        const activeEmail = (details && details.email) || connState.email || connState.login_hint || '';
        const emailTag = activeEmail ? ` (${activeEmail})` : '';

        if (gmailAccountEmail) {
          if (isConnectedState && activeEmail) {
            gmailAccountEmail.textContent = activeEmail;
            gmailAccountEmail.style.display = 'inline-block';
            gmailAccountEmail.title = `Akun Gmail Terhubung: ${activeEmail}`;
          } else {
            gmailAccountEmail.style.display = 'none';
          }
        }

        if (gmailStatusTitle) {
          if (state === 'connected' || state === 'idle' || state === 'has_items') {
            gmailStatusTitle.textContent = activeEmail || 'Terhubung';
          } else if (state === 'syncing' || state === 'silent_syncing') {
            gmailStatusTitle.textContent = activeEmail || 'Menyinkronkan...';
          } else if (state === 'unconfigured') {
            gmailStatusTitle.textContent = 'Menunggu Setup';
          } else if (connState.connected) {
            gmailStatusTitle.textContent = activeEmail || 'Terhubung';
          } else {
            gmailStatusTitle.textContent = 'Belum Terhubung';
          }
        }

        if (gmailStatusSub && message) {
          gmailStatusSub.textContent = message;
        }

        const isConnectedState = Boolean(connState.connected || state === 'connected' || state === 'idle' || state === 'has_items' || state === 'syncing' || state === 'silent_syncing');

        if (gmailSyncStrip) {
          gmailSyncStrip.classList.toggle('connected', isConnectedState);
        }

        if (btnGmailConnect) {
          btnGmailConnect.style.display = isConnectedState ? 'none' : 'inline-flex';
        }
        if (btnGmailSync) {
          btnGmailSync.style.display = isConnectedState ? 'inline-flex' : 'none';
        }
        if (btnGmailDisconnect) {
          btnGmailDisconnect.style.display = isConnectedState ? 'inline-flex' : 'none';
        }
      });

      window.GmailSync.onQueueChange(({ count }) => {
        if (btnGmailReview) {
          btnGmailReview.style.display = count > 0 ? 'inline-flex' : 'none';
          if (btnGmailReviewText) {
            btnGmailReviewText.textContent = `Tinjau (${count})`;
          }
        }
        if (gmailSyncStrip) {
          gmailSyncStrip.classList.toggle('has-queue', count > 0);
        }
        // Jika terdapat transaksi dalam antrean dan review card belum terisi OCR aktif, buka otomatis
        if (count > 0 && (!currentParsedData || currentParsedData.sumber === 'gmail')) {
          displayGmailQueueItem();
        }
      });

      if (typeof window.GmailSync.onLoopStatusChange === 'function') {
        window.GmailSync.onLoopStatusChange(({ active }) => {
          if (gmailLoopBadge) {
            gmailLoopBadge.style.display = active ? 'inline-flex' : 'none';
          }
        });
      }

      if (typeof window.GmailSync.onAutoSave === 'function') {
        window.GmailSync.onAutoSave((count) => {
          renderDashboard();
          showRolloverToast(
            '⚡ Transaksi BCA Masuk Otomatis!',
            `${count} transaksi baru berhasil diekstrak dari Gmail BCA dan langsung dicatat ke kas.`
          );
        });
      }

      // Picu sinkronisasi senyap otomatis jika pengguna pernah terhubung
      window.GmailSync.trySilentSync();
    }
  });
})();

