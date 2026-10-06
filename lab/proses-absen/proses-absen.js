/* ============================================================
   ETHOL ABSEN INSPECTOR — VISUAL STEP-BY-STEP VIEWER
   Frontend Controller & Step Simulator
   ============================================================ */

'use strict';

// ─── STATIC CANONICAL STEPS CATALOG ─────────────────────────
const CANONICAL_STEPS = [
  {
    id: 'step_cas_login',
    stepNumber: 1,
    category: 'auth',
    title: 'Akses Gateway CAS PENS',
    desc: 'Automasi membuka gerbang autentikasi CAS PENS dan memeriksa apakah formulir kredensial mahasiswa sudah siap menerima input.',
    filename: '01_portal_cas_login.jpg',
    url: '/Error_Absen/01_portal_cas_login.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/cas/login',
    phase: '1. Autentikasi Gateway',
    action: "page.goto('https://ethol.pens.ac.id/cas/login')",
    selector: 'form#fm1, input#username, input#password',
    delay: '1500 ms (Inisialisasi Halaman)',
    checklist: [
      'Inisialisasi Chromium headless dengan viewport 1366x768',
      'Memuat sertifikat SSL ethol.pens.ac.id & gerbang CAS',
      'Verifikasi ketersediaan elemen username dan password'
    ]
  },
  {
    id: 'step_cas_filled',
    stepNumber: 2,
    category: 'auth',
    title: 'Pengisian Kredensial & Jeda Pengaman 3 Detik',
    desc: 'Formulir CAS terisi otomatis dengan akun mahasiswa. Scraper menerapkan jeda pengaman 3 detik sebelum eksekusi submit untuk menjamin stabilitas sesi.',
    filename: '02_form_cas_terisi.jpg',
    url: '/Error_Absen/02_form_cas_terisi.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/cas/login',
    phase: '1. Autentikasi Gateway',
    action: "page.type('#username', ...) & page.type('#password', ...)",
    selector: "input[name='submit'], .btn-submit",
    delay: '3000 ms (Wajib Sesuai Permintaan Pengguna)',
    checklist: [
      'Kredensial mahasiswa diinjeksi ke input formulir CAS',
      'Pemberian jeda 3 detik sebelum menekan tombol Masuk',
      'Pengambilan tangkapan layar verifikasi form terisi'
    ]
  },
  {
    id: 'step_portal_session',
    stepNumber: 3,
    category: 'auth',
    title: 'Validasi Tiket CAS & Handshake Sesi Portal',
    desc: 'Autentikasi CAS berhasil disetujui server. Scraper menerima tiket autentikasi dan dialihkan ke portal sesi mahasiswa.',
    filename: '01_sesi_aktif_portal.jpg',
    url: '/Error_Absen/01_sesi_aktif_portal.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/cas/ticketValidation',
    phase: '1. Autentikasi Gateway',
    action: 'page.waitForNavigation({ waitUntil: "networkidle2" })',
    selector: "header.portal-nav, .user-profile-badge",
    delay: '2000 ms (Handshake Token & Cookie)',
    checklist: [
      'Tiket CAS divalidasi oleh backend Ethol PENS',
      'Cookie sesi tersimpan di context browser',
      'Pengalihan otomatis ke dashboard beranda kuliah'
    ]
  },
  {
    id: 'step_beranda_ethol',
    stepNumber: 4,
    category: 'nav',
    title: 'Tiba di Beranda Dashboard ETHOL',
    desc: 'Tiba di halaman utama Ethol PENS. Seluruh jadwal mata kuliah, kalender akademik, dan panel navigasi atas berhasil dimuat.',
    filename: '04_beranda_ethol.jpg',
    url: '/Error_Absen/04_beranda_ethol.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/beranda',
    phase: '2. Navigasi & Pengawasan',
    action: 'page.waitForSelector(".navbar-custom, .dashboard-container")',
    selector: ".navbar-custom, .nav-item-bell",
    delay: '1000 ms (DOM Render)',
    checklist: [
      'Dashboard mahasiswa berhasil ditampilkan penuh',
      'Deteksi ketersediaan lonceng notifikasi di pojok kanan atas',
      'Sinkronisasi profil dan semester aktif berjalan'
    ]
  },
  {
    id: 'step_cek_tugas',
    stepNumber: 5,
    category: 'nav',
    title: 'Pengecekan Modul Tugas & Perkuliahan',
    desc: 'Scraper melakukan audit cepat terhadap modul perkuliahan dan daftar tugas untuk memastikan tidak ada tugas mendesak yang terabaikan.',
    filename: '05_setelah_cek_tugas.jpg',
    url: '/Error_Absen/05_setelah_cek_tugas.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/beranda#tugas',
    phase: '2. Navigasi & Pengawasan',
    action: 'fetchKuliahTugasList()',
    selector: ".card-tugas, #daftar-kuliah",
    delay: '800 ms (Asynchronous JSON Request)',
    checklist: [
      'Permintaan data perkuliahan aktif semester ini',
      'Penyaringan tenggat waktu tugas mendekati batas',
      'Pembaruan status internal tanpa memblokir presensi'
    ]
  },
  {
    id: 'step_lonceng_notif',
    stepNumber: 6,
    category: 'nav',
    title: 'Membuka Panel Lonceng Notifikasi (Kanan Atas)',
    desc: 'Scraper mengarahkan kursor dan mengklik ikon lonceng di kanan atas navbar untuk memunculkan drop-down panel notifikasi terbaru.',
    filename: '06_panel_lonceng_terbuka.jpg',
    url: '/Error_Absen/06_panel_lonceng_terbuka.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/beranda#notifikasi',
    phase: '2. Navigasi & Pengawasan',
    action: 'page.click("button.bell-notification, .fa-bell")',
    selector: ".dropdown-notification, .notification-list-wrap",
    delay: '1200 ms (Animasi Dropdown Terbuka)',
    checklist: [
      'Tombol lonceng kanan atas ditekan',
      'Dropdown notifikasi terbuka dengan animasi mulus',
      'Verifikasi tab navigasi: Semua, Pengumuman, dan Presensi'
    ]
  },
  {
    id: 'step_filter_presensi',
    stepNumber: 7,
    category: 'presensi',
    title: 'Filter Tab "Semua" & Pilih Kategori "Presensi"',
    desc: 'Pada panel lonceng, automasi memilih tab "Semua", kemudian memfilter entri khusus presensi yang aktif di bawah rentang waktu 24 jam.',
    filename: '07_filter_presensi_terpilih.jpg',
    url: '/Error_Absen/07_filter_presensi_terpilih.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/beranda#notif-presensi',
    phase: '3. Eksekusi Presensi',
    action: 'page.click(".tab-semua") -> page.click(".chip-filter-presensi")',
    selector: ".notif-item[data-type='presensi']",
    delay: '1000 ms (Filter Notifikasi < 24 Jam)',
    checklist: [
      'Memilih opsi "Semua" pada panel notifikasi',
      'Mengaktifkan filter khusus kategori "Presensi"',
      'Mendeteksi sesi perkuliahan aktif dalam jendela 24 jam'
    ]
  },
  {
    id: 'step_matakuliah_terbuka',
    stepNumber: 8,
    category: 'presensi',
    title: 'Deteksi & Masuk ke Sesi Matakuliah Aktif',
    desc: 'Menemukan notifikasi presensi paling baru yang masih berlaku. Scraper mengklik entri tersebut untuk masuk ke halaman kehadiran mata kuliah.',
    filename: '08_matakuliah_terbaru.jpg',
    url: '/Error_Absen/08_matakuliah_terbaru.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/kuliah/presensi/aktif',
    phase: '3. Eksekusi Presensi',
    action: 'page.click(".notif-item-presensi:first-child a")',
    selector: ".presensi-card, .btn-submit-hadir",
    delay: '1500 ms (Navigasi ke Lembar Presensi)',
    checklist: [
      'Sesi presensi paling baru (< 24 jam) berhasil ditemukan',
      'Navigasi langsung ke ruang presensi mata kuliah terkait',
      'Validasi tombol aksi kehadiran: Hadir / Submit'
    ]
  },
  {
    id: 'step_presensi_selesai',
    stepNumber: 9,
    category: 'presensi',
    title: 'Eksekusi Tombol Presensi & Simpan Bukti Layar',
    desc: 'Tombol presensi mata kuliah ditekan. Sesi kehadiran tercatat berhasil di server Ethol dan scraper segera mengambil bukti tangkapan layar.',
    filename: '09_setelah_presensi_terbaru.jpg',
    url: '/Error_Absen/09_setelah_presensi_terbaru.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/kuliah/presensi/sukses',
    phase: '3. Eksekusi Presensi',
    action: 'page.click("button#btnHadir") & page.screenshot()',
    selector: ".alert-success, .badge-hadir, .status-tercatat",
    delay: '1000 ms (Menunggu Respon Konfirmasi)',
    checklist: [
      'Tombol kehadiran diklik dengan trigger event mousedown/up',
      'Server Ethol membalas dengan status konfirmasi kehadiran',
      'Tangkapan layar bukti berhasil diambil dan disimpan ke disk'
    ]
  },
  {
    id: 'step_histori_rekam',
    stepNumber: 10,
    category: 'histori',
    title: 'Pencatatan Histori & Pengawasan Jeda Keluar',
    desc: 'Konfirmasi histori kehadiran tercatat lengkap dengan nama mata kuliah, dosen, dan waktu presensi. Scraper menyelesaikan alur dengan logout aman.',
    filename: '10_histori_matakuliah_1.jpg',
    url: '/Error_Absen/10_histori_matakuliah_1.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/kuliah/presensi/riwayat',
    phase: '4. Histori & Konfirmasi',
    action: 'logConsoleHistory() -> page.goto("/logout")',
    selector: ".riwayat-tabel, .log-container",
    delay: '2000 ms (Logout Bersih)',
    checklist: [
      'Nama matakuliah, dosen, dan stempel waktu dicatat ke konsol',
      'Pemeriksaan ketiadaan sesi lain di bawah 24 jam',
      'Keluar dari akun Ethol secara bersih untuk keamanan sesi'
    ]
  },
  {
    id: 'step_error_trap',
    stepNumber: 11,
    category: 'histori',
    title: 'Penanganan Kendala & Tangkapan Layar Anomali',
    desc: 'Tangkapan layar darurat yang otomatis diambil scraper jika mendeteksi anomali elemen DOM, session timeout, atau kendala portal.',
    filename: '99_error_terjadi.jpg',
    url: '/Error_Absen/99_error_terjadi.jpg',
    mockupUrl: 'https://ethol.pens.ac.id/status/diagnostic',
    phase: '4. Histori & Konfirmasi',
    action: 'catch(err) { page.screenshot({ path: "99_error_terjadi.jpg" }); }',
    selector: ".error-page, .alert-danger, body",
    delay: '0 ms (Immediate Snapshot)',
    checklist: [
      'Penangkap error global (exception handler) aktif',
      'Visual snapshot diambil saat terjadi kegagalan atau timeout',
      'Laporan disiarkan ke konsol diagnostik server'
    ]
  }
];

// ─── STATE MANAGEMENT ───────────────────────────────────────
const appState = {
  steps: [...CANONICAL_STEPS],
  activeStepIndex: 0,
  isPlaying: false,
  playTimer: null,
  playIntervalMs: 3500,
  activeFilter: 'all',
  isZoomed: false,
  logLines: [],
  sseSource: null
};

// ─── DOM ELEMENT REFERENCES ─────────────────────────────────
const $ = (id) => document.getElementById(id);

// ─── INITIALIZATION ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initAmbientCanvas();
  renderStepper();
  renderGallery();
  displayStep(0);
  bindEvents();
  setupKeyboardShortcuts();
  connectSSE();
  checkServerHealth();
  await syncStepsWithServer();
});

// ─── AMBIENT CANVAS BACKGROUND ──────────────────────────────
function initAmbientCanvas() {
  const canvas = $('ambientCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = (canvas.width = window.innerWidth);
  let H = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 32 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 1,
    alpha: Math.random() * 0.4 + 0.1
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── RENDER STEPPER TIMELINE ────────────────────────────────
function renderStepper() {
  const container = $('stepperContainer');
  if (!container) return;
  container.innerHTML = '';

  appState.steps.forEach((step, idx) => {
    const item = document.createElement('div');
    item.className = `stepper-item ${idx === appState.activeStepIndex ? 'active' : ''}`;
    item.dataset.index = idx;
    item.onclick = () => selectStep(idx);

    item.innerHTML = `
      <div class="step-num-circle">${step.stepNumber}</div>
      <div class="step-item-text">
        <span class="step-item-title">${escapeHtml(step.title)}</span>
        <span class="step-item-phase">${escapeHtml(step.phase)}</span>
      </div>
    `;

    container.appendChild(item);

    if (idx < appState.steps.length - 1) {
      const divider = document.createElement('div');
      divider.className = 'step-arrow-divider';
      divider.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      container.appendChild(divider);
    }
  });
}

// ─── RENDER GALLERY GRID ────────────────────────────────────
function renderGallery() {
  const grid = $('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const filter = appState.activeFilter;
  const filtered = appState.steps.filter(s => filter === 'all' || s.category === filter);

  // Update filter counters
  updateFilterCounts();

  filtered.forEach(step => {
    const globalIdx = appState.steps.indexOf(step);
    const card = document.createElement('div');
    card.className = `gallery-item ${globalIdx === appState.activeStepIndex ? 'active' : ''}`;
    card.onclick = () => selectStep(globalIdx);

    card.innerHTML = `
      <div class="thumb-wrap">
        <span class="thumb-badge">Langkah ${step.stepNumber}</span>
        <img src="${step.url}" alt="${escapeHtml(step.title)}" class="thumb-img" loading="lazy" />
      </div>
      <div class="gallery-item-info">
        <span class="gallery-item-title">${escapeHtml(step.title)}</span>
        <span class="gallery-item-meta">${escapeHtml(step.filename)}</span>
      </div>
    `;

    grid.appendChild(card);
  });
}

function updateFilterCounts() {
  const countAll = $('countAll');
  const countAuth = $('countAuth');
  const countNav = $('countNav');
  const countPresensi = $('countPresensi');
  const countHistori = $('countHistori');

  if (countAll) countAll.textContent = appState.steps.length;
  if (countAuth) countAuth.textContent = appState.steps.filter(s => s.category === 'auth').length;
  if (countNav) countNav.textContent = appState.steps.filter(s => s.category === 'nav').length;
  if (countPresensi) countPresensi.textContent = appState.steps.filter(s => s.category === 'presensi').length;
  if (countHistori) countHistori.textContent = appState.steps.filter(s => s.category === 'histori').length;
}

// ─── DISPLAY STEP DETAILS ───────────────────────────────────
function displayStep(index) {
  if (index < 0 || index >= appState.steps.length) return;
  appState.activeStepIndex = index;
  const step = appState.steps[index];

  // 1. Update Viewer Top Meta
  const badge = $('viewerStepBadge');
  if (badge) badge.textContent = `LANGKAH ${step.stepNumber} DARI ${appState.steps.length}`;
  const filename = $('viewerFilename');
  if (filename) filename.textContent = step.filename;

  // 2. Mockup URL & Scale
  const mockupUrl = $('mockupUrlText');
  if (mockupUrl) mockupUrl.textContent = step.mockupUrl || 'https://ethol.pens.ac.id/';

  // 3. Reset Zoom
  resetZoomState();

  // 4. Update Main Image with Loader
  const img = $('activeScreenshot');
  const loader = $('imageLoader');
  const rawBtn = $('btnOpenRaw');

  if (rawBtn) rawBtn.href = step.url;

  if (img && loader) {
    loader.classList.remove('hidden');
    img.style.opacity = '0';
    img.src = step.url;
    img.onload = () => {
      loader.classList.add('hidden');
      img.style.opacity = '1';
    };
    img.onerror = () => {
      loader.classList.add('hidden');
      img.style.opacity = '0.5';
    };
  }

  // 5. Update Right Details Panel
  const title = $('stepTitle');
  if (title) title.textContent = step.title;
  const desc = $('stepDesc');
  if (desc) desc.textContent = step.desc;

  const tPhase = $('telemetryPhase');
  if (tPhase) tPhase.textContent = step.phase;
  const tAction = $('telemetryAction');
  if (tAction) tAction.textContent = step.action;
  const tSelector = $('telemetrySelector');
  if (tSelector) tSelector.innerHTML = `<code>${escapeHtml(step.selector)}</code>`;
  const tDelay = $('telemetryDelay');
  if (tDelay) tDelay.textContent = step.delay;

  // 6. Checklist
  const checklist = $('auditChecklist');
  if (checklist) {
    checklist.innerHTML = '';
    (step.checklist || []).forEach(itemText => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${escapeHtml(itemText)}</span>`;
      checklist.appendChild(li);
    });
  }

  // 7. Update Stepper Highlight & Auto-scroll
  document.querySelectorAll('.stepper-item').forEach((el, idx) => {
    el.classList.toggle('active', idx === index);
  });
  const activeStepper = document.querySelector(`.stepper-item[data-index="${index}"]`);
  if (activeStepper) {
    activeStepper.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // 8. Update Gallery Highlight
  document.querySelectorAll('.gallery-item').forEach((el, idx) => {
    el.classList.toggle('active', idx === index);
  });
}

function selectStep(index) {
  displayStep(index);
}

function nextStep() {
  const next = (appState.activeStepIndex + 1) % appState.steps.length;
  displayStep(next);
}

function prevStep() {
  const prev = (appState.activeStepIndex - 1 + appState.steps.length) % appState.steps.length;
  displayStep(prev);
}

// ─── ZOOM & THEATER CONTROLLER ──────────────────────────────
function toggleZoom() {
  appState.isZoomed = !appState.isZoomed;
  const img = $('activeScreenshot');
  const body = $('mockupBody');
  const zoomTag = $('zoomLevelTag');
  const zoomIcon = $('zoomIcon');

  if (img && body) {
    img.classList.toggle('zoomed', appState.isZoomed);
    body.classList.toggle('zoomed', appState.isZoomed);
  }
  if (zoomTag) {
    zoomTag.textContent = appState.isZoomed ? '160% Zoom' : '100% Fit';
  }
  if (zoomIcon) {
    zoomIcon.className = appState.isZoomed
      ? 'fa-solid fa-magnifying-glass-minus'
      : 'fa-solid fa-magnifying-glass-plus';
  }
}

function resetZoomState() {
  appState.isZoomed = false;
  const img = $('activeScreenshot');
  const body = $('mockupBody');
  const zoomTag = $('zoomLevelTag');
  const zoomIcon = $('zoomIcon');

  if (img) img.classList.remove('zoomed');
  if (body) body.classList.remove('zoomed');
  if (zoomTag) zoomTag.textContent = '100% Fit';
  if (zoomIcon) zoomIcon.className = 'fa-solid fa-magnifying-glass-plus';
}

// ─── AUTO-SLIDE PLAY/PAUSE CONTROLLER ───────────────────────
function togglePlay() {
  appState.isPlaying = !appState.isPlaying;
  const btn = $('btnTogglePlay');
  const icon = $('playIcon');
  const label = $('playLabel');

  if (appState.isPlaying) {
    btn.classList.add('playing');
    icon.className = 'fa-solid fa-pause';
    label.textContent = 'Jeda';
    appState.playTimer = setInterval(nextStep, appState.playIntervalMs);
  } else {
    btn.classList.remove('playing');
    icon.className = 'fa-solid fa-play';
    label.textContent = 'Putar';
    if (appState.playTimer) {
      clearInterval(appState.playTimer);
      appState.playTimer = null;
    }
  }
}

// ─── FULLSCREEN MODAL ───────────────────────────────────────
function openFullscreenModal() {
  const modal = $('fullscreenModal');
  const modalImg = $('modalImage');
  const modalTitle = $('modalTitle');
  const active = appState.steps[appState.activeStepIndex];

  if (modal && modalImg && active) {
    modalImg.src = active.url;
    if (modalTitle) modalTitle.textContent = `${active.stepNumber}. ${active.title} (${active.filename})`;
    modal.classList.add('open');
  }
}

function closeFullscreenModal(e) {
  const modal = $('fullscreenModal');
  if (modal) modal.classList.remove('open');
}

window.closeFullscreenModal = closeFullscreenModal;

// ─── LIVE CONSOLE DRAWER ────────────────────────────────────
function toggleConsoleTray() {
  const tray = $('consoleTray');
  const chevron = $('trayChevron');
  if (!tray) return;

  const isOpen = tray.classList.toggle('open');
  if (chevron) {
    chevron.className = isOpen ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
  }
}

window.toggleConsoleTray = toggleConsoleTray;

function clearLocalLogs(e) {
  if (e) e.stopPropagation();
  const screen = $('consoleScreen');
  const counter = $('trayCounter');
  if (screen) {
    screen.innerHTML = `
      <div class="console-placeholder">
        <i class="fa-solid fa-code"></i>
        <p>Konsol dibersihkan. Menunggu peristiwa streaming baru…</p>
      </div>
    `;
  }
  if (counter) counter.textContent = '0 baris';
  appState.logLines = [];
}

window.clearLocalLogs = clearLocalLogs;

function appendConsoleLog(text, ts = Date.now()) {
  const screen = $('consoleScreen');
  const counter = $('trayCounter');
  if (!screen) return;

  const placeholder = screen.querySelector('.console-placeholder');
  if (placeholder) placeholder.remove();

  const clean = String(text || '').replace(/\x1b\[[0-9;]*m/g, '').trim();
  const isErr = clean.toLowerCase().includes('[error]') || clean.toLowerCase().includes('gagal');
  const isSuccess = clean.toLowerCase().includes('berhasil') || clean.toLowerCase().includes('sukses');

  const line = document.createElement('div');
  line.className = `console-line ${isErr ? 'error' : (isSuccess ? 'success' : '')}`;
  const timeStr = new Date(ts).toLocaleTimeString('id-ID', { hour12: false });

  line.innerHTML = `<span class="ts">[${timeStr}]</span> <span>${escapeHtml(clean)}</span>`;
  screen.appendChild(line);
  screen.scrollTop = screen.scrollHeight;

  appState.logLines.push(clean);
  if (counter) counter.textContent = `${appState.logLines.length} baris`;
}

// ─── SSE & SERVER WATCHDOG ──────────────────────────────────
function connectSSE() {
  try {
    const sse = new EventSource('/api/absen/log-stream');
    appState.sseSource = sse;

    sse.onopen = () => setServerStatus(true);
    sse.onerror = () => {
      setServerStatus(false);
      sse.close();
      setTimeout(connectSSE, 6000);
    };

    sse.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        appendConsoleLog(d.text || d.raw || 'Aktivitas server terekam.', d.ts);
      } catch {
        appendConsoleLog(e.data);
      }
    };
  } catch {
    setServerStatus(false);
  }
}

async function checkServerHealth() {
  try {
    const res = await fetch('/api/absen/health');
    setServerStatus(res.ok);
  } catch {
    setServerStatus(false);
  }
}

function setServerStatus(isOnline) {
  const pulse = $('serverPulse');
  const label = $('serverLabel');
  if (pulse && label) {
    pulse.className = `chip-pulse ${isOnline ? 'online' : 'offline'}`;
    label.textContent = isOnline ? 'Server Terhubung' : 'Server Terputus';
  }
}

// ─── SYNC METADATA DENGAN BACKEND ───────────────────────────
async function syncStepsWithServer() {
  try {
    const res = await fetch('/api/absen/steps');
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && Array.isArray(data.steps) && data.steps.length > 0) {
      appendConsoleLog(`[INSPECTOR] Menemukan ${data.steps.length} berkas bukti visual di Error_Absen/.`);
    }
  } catch (_) {}
}

// ─── EVENT BINDINGS ─────────────────────────────────────────
function bindEvents() {
  $('btnPrevStep')?.addEventListener('click', prevStep);
  $('btnNextStep')?.addEventListener('click', nextStep);
  $('btnJumpPrev')?.addEventListener('click', prevStep);
  $('btnJumpNext')?.addEventListener('click', nextStep);
  $('btnTogglePlay')?.addEventListener('click', togglePlay);
  $('btnZoomToggle')?.addEventListener('click', toggleZoom);
  $('btnFullscreen')?.addEventListener('click', openFullscreenModal);
  $('btnRefreshSteps')?.addEventListener('click', () => {
    syncStepsWithServer();
    displayStep(appState.activeStepIndex);
  });

  // Category Filter buttons
  const filters = $('galleryFilters');
  if (filters) {
    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.activeFilter = btn.dataset.filter || 'all';
      renderGallery();
    });
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore input focus
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextStep();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevStep();
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    } else if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      toggleZoom();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openFullscreenModal();
    } else if (e.key === 'Escape') {
      closeFullscreenModal();
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
