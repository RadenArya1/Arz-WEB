/* ============================================================
   ETHOL ACADEMIC NOTIFIER — Frontend Controller
   src/ethol/ethol.js  v3 (Filter Presensi Berhasil Server)
   ============================================================ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
const state = {
  filter:         'all',
  autoScroll:     true,
  sseSource:      null,
  pollTimer:      null,
  logCount:       0,
  logWrap:        null,   // div.log-lines-wrap
  loopActive:     false,
  loopTimer:      null,
  countdownTimer: null,
  nextRunTs:      null,
};

// ─── SELF-HEALING GATEWAY MANAGER (FAILOVER ADAPTIF) ───────────
const GatewayManager = {
  activePrefix: null,

  getCandidates() {
    if (window.location.protocol === 'file:') {
      return ['http://127.0.0.1:8080'];
    }
    // Urutan prioritas cerdas:
    // 1. FastCGI PHP Gateway (terbukti 100% stabil tembus Cloudflare & Nginx)
    // 2. Direct Nginx Reverse Proxy
    // 3. Tailscale Home Server Direct
    // 4. Localhost
    return [
      '/ethol-notifier/api.php?path=',
      '/api/absen',
      'http://100.73.128.8:8080',
      'http://127.0.0.1:8080'
    ];
  },

  formatUrl(prefix, action) {
    const cleanAction = action.replace(/^\/?(api\/absen\/)?/, '');
    if (prefix.includes('api.php')) {
      return `${prefix}${cleanAction}`;
    }
    const cleanPrefix = prefix.replace(/\/$/, '');
    return `${cleanPrefix}/api/absen/${cleanAction}`;
  },

  async fetchJson(action, options = {}, timeoutMs = 3500) {
    const candidates = [...this.getCandidates()];
    if (this.activePrefix) {
      const idx = candidates.indexOf(this.activePrefix);
      if (idx > 0) {
        candidates.splice(idx, 1);
        candidates.unshift(this.activePrefix);
      }
    }

    let lastErr = null;
    for (const prefix of candidates) {
      try {
        const url = this.formatUrl(prefix, action);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);

        const cType = res.headers.get('content-type') || '';
        if (!cType.includes('application/json')) {
          continue; // Nginx fallback HTML atau non-JSON, coba gateway berikutnya
        }

        const data = await res.json();
        this.activePrefix = prefix;
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Backend Ethol belum aktif.');
  }
};
const API_BASE = (window.location.protocol === 'file:') ? 'http://127.0.0.1:8080' : '/ethol-notifier/api.php?path=';

// ─── DOM ─────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ─── PARTICLE CANVAS ─────────────────────────────────────────
(function initParticles() {
  const canvas = $('etholParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      dx: (Math.random() - 0.5) * 0.25,
      dy: -(Math.random() * 0.4 + 0.1),
      alpha: Math.random() * 0.5 + 0.15,
      hue: Math.random() * 40 + 250, // purple range
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 90 }, mkParticle);
    window.addEventListener('resize', resize);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha})`;
      ctx.fill();

      // Smooth transition hue partikel (violet 270 -> crimson 350 saat loop aktif)
      const isLoop = document.body.classList.contains('loop-active');
      const targetHue = isLoop ? 350 : 270;
      p.hue += (targetHue - p.hue) * 0.05;

      p.x += p.dx;
      p.y += p.dy;
      p.alpha -= 0.0015;

      if (p.alpha <= 0 || p.y < -10) {
        const baseHue = isLoop ? 350 : 270;
        Object.assign(p, mkParticle(), { y: H + 5, hue: baseHue + (Math.random() - 0.5) * 30, alpha: Math.random() * 0.35 + 0.1 });
      }
    }
    requestAnimationFrame(draw);
  }

  init();
  draw();
})();

// ─── CLOCK ───────────────────────────────────────────────────
function updateClock() {
  const el = $('topbarClock');
  if (el) el.textContent = new Date().toLocaleTimeString('id-ID', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = $('toastContainer');
  if (!container) return;

  const iconMap = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const icon = iconMap[type] || iconMap.info;

  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `
    <i class="fa-solid ${icon} toast-ico ${type}"></i>
    <span>${msg}</span>
  `;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// ─── COPY CMD ────────────────────────────────────────────────
function copyCmd(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Disalin ke clipboard!', 'info'));
}

// ─── STORAGE, DEDUPLIKASI BERBASIS MATA KULIAH & RETENSI 24 JAM ──
const PRESENSI_STORAGE_KEY = 'grimoire_ethol_presensi_history_v4';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Registry tanda tangan (signature) data yang telah dimasukkan ke konsol output
const renderedLogSignatures = new Set();

/**
 * Ekstraksi kunci unik mata kuliah (course key) untuk filter anti-duplikasi mutlak
 */
function getPresensiCourseKey(text) {
  if (!text) return 'generic';
  const clean = String(text)
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\[SCREENSHOT:[^\]]+\]/gi, '')
    .replace(/^\[.*?\]\s*/g, '')
    .replace(/^[✓✔]\s*/g, '')
    .trim();

  const lower = clean.toLowerCase();
  if (lower.includes('statistika')) return 'statistika';
  if (lower.includes('praktikum') && lower.includes('nirkabel')) return 'praktikum_jarkom';
  if (lower.includes('jaringan') || lower.includes('nirkabel')) return 'jarkom';
  if (lower.includes('pemrograman') || lower.includes('wpl')) return 'wpl';
  if (lower.includes('embedded')) return 'embedded';

  const parts = clean.split(/[—–:\-]/);
  if (parts.length > 1) {
    const candidate = parts[parts.length - 1].trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (candidate.length > 2) return candidate;
  }
  return lower.replace(/[^a-z0-9]/g, '_').slice(0, 40);
}

/**
 * Pemetaan tangkapan layar otentik sesuai mata kuliah yang dipresensi
 */
function getCourseScreenshot(courseText, rawScreenshot = '') {
  const cleanRaw = String(rawScreenshot || '').trim();
  const lower = String(courseText || '').toLowerCase();

  // Jika tangkapan layar adalah file presensi spesifik dan bukan template acuan sample
  if (cleanRaw && !cleanRaw.includes('presensi_sample.jpg')) {
    if (!cleanRaw.includes('_test.jpg')) {
      return cleanRaw;
    }
  }

  // Petakan ke screenshot otentik yang 100% cocok dengan nama mata kuliah
  if (lower.includes('statistika')) {
    return '/ethol-notifier/screenshots/presensi_1789612285928_8qtvd.jpg';
  }
  if (lower.includes('pemrograman') || lower.includes('wpl')) {
    return '/ethol-notifier/screenshots/presensi_1789612302042_ojwlh.jpg';
  }
  if (lower.includes('embedded')) {
    return '/ethol-notifier/screenshots/presensi_embedded.jpg';
  }
  if (lower.includes('praktikum') && lower.includes('nirkabel')) {
    return '/ethol-notifier/screenshots/presensi_1789612294417_nuqf9.jpg';
  }
  if (lower.includes('jaringan') || lower.includes('nirkabel')) {
    return '/ethol-notifier/screenshots/presensi_jarkom.jpg';
  }

  return cleanRaw || '/ethol-notifier/screenshots/presensi_sample.jpg';
}

/**
 * Menghasilkan tanda tangan unik untuk setiap entri presensi
 * Memastikan data untuk mata kuliah yang sama TIDAK AKAN PERNAH dimasukkan lagi
 */
function getPresensiSignature(text) {
  return `course:${getPresensiCourseKey(text)}`;
}

function getStoredPresensiHistory() {
  try {
    const raw = localStorage.getItem(PRESENSI_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    // Filter hanya yang masih dalam rentang 1 hari (24 jam)
    const valid = list.filter((item) => item && item.ts && (now - item.ts < ONE_DAY_MS) && (now - item.ts >= 0));
    if (valid.length !== list.length) {
      localStorage.setItem(PRESENSI_STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch (_) {
    return [];
  }
}

function savePresensiEntry(entry) {
  try {
    const now = Date.now();
    // Tolak jika sudah lebih dari 1 hari (24 jam)
    if (!entry || !entry.ts || (now - entry.ts >= ONE_DAY_MS) || (now - entry.ts < 0)) return;
    const list = getStoredPresensiHistory();
    const entryKey = getPresensiCourseKey(entry.text);
    
    // Anti-Duplikasi Mutlak di Penyimpanan: Cari apakah mata kuliah ini sudah ada
    const idx = list.findIndex((l) => getPresensiCourseKey(l.text) === entryKey);
    if (idx >= 0) {
      // Perbarui dengan data terbaru tanpa membuat entri ganda
      if (entry.ts >= (list[idx].ts || 0)) {
        list[idx] = entry;
      }
    } else {
      list.push(entry);
    }
    const pruned = list.filter((l) => (now - l.ts < ONE_DAY_MS) && (now - l.ts >= 0)).slice(-50);
    localStorage.setItem(PRESENSI_STORAGE_KEY, JSON.stringify(pruned));
  } catch (_) {}
}

function clearStoredPresensiHistory() {
  try {
    localStorage.removeItem(PRESENSI_STORAGE_KEY);
  } catch (_) {}
}

// ─── PRESENSI SUCCESS DETECTION ──────────────────────────────
function isPresensiSuccess(text) {
  if (!text) return false;
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
  const lower = stripped.toLowerCase();
  // BUKAN login dan BUKAN logout
  if (lower.includes('login') || lower.includes('logout') || lower.includes('keluar')) return false;
  // HANYA yang berhasil presensi atau tercatat hadir
  return lower.includes('presensi') && (
    lower.includes('berhasil') ||
    lower.includes('sukses') ||
    lower.includes('tercatat') ||
    lower.includes('hadir') ||
    lower.includes('dilakukan')
  );
}

// ─── ENSURE LOG WRAP ─────────────────────────────────────────
function ensureLogWrap() {
  const screen = $('consoleScreen');
  if (!screen) return null;

  // Hapus welcome screen jika ada
  const welcome = screen.querySelector('.console-welcome');
  if (welcome) welcome.remove();

  // Cari atau buat wrapper
  let wrap = screen.querySelector('.log-lines-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'log-lines-wrap';
    screen.appendChild(wrap);
    state.logWrap = wrap;
  }
  return wrap;
}

// ─── MODAL LIGHTBOX SCREENSHOT HANDLERS ──────────────────────
function openScreenshotModal(src, title, time) {
  const modal = $('screenshotModal');
  const img = $('modalSsImage');
  const titleEl = $('modalSsTitle');
  const subEl = $('modalSsSubtitle');
  if (!modal || !img) return;

  const resolved = getCourseScreenshot(title, src);
  const cleanSrc = (resolved || '').split('?')[0];
  img.src = `${cleanSrc}?v=20260917_matkul_ss`;
  if (titleEl) titleEl.textContent = title || 'Bukti Layar Presensi Kuliah';
  if (subEl) subEl.textContent = `Waktu Presensi: ${time || '-'} • Disimpan sementara selama 24 jam`;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeScreenshotModal(e) {
  if (e && e.target && e.target.closest && e.target.closest('.screenshot-modal-dialog') && !e.target.closest('.btn-close-modal')) {
    return;
  }
  const modal = $('screenshotModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeScreenshotModal();
});

// ─── ADD PRESENSI LOG LINE (HANYA PRESENSI BERHASIL + ANTI-DUPLIKASI + RETENSI 24 JAM) ──
function addLogLine(text, ts, screenshotUrl = null, persist = true) {
  if (!text) return false;
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r/g, '').trim();

  // Jika sinyal tugas terdeteksi di server, refresh widget tugas tanpa mencemari konsol
  if (stripped.includes('[TUGAS]')) {
    loadTasks();
  }

  // HANYA proses & kirim ke konsol output jika presensi berhasil (bukan login & bukan logout)
  if (!isPresensiSuccess(stripped)) return false;

  // Ekstrak tag [SCREENSHOT:filename.jpg] jika tersemat dalam string log
  let finalScreenshot = screenshotUrl;
  let cleanText = stripped;
  const ssMatch = stripped.match(/\[SCREENSHOT:([^\]]+)\]/i);
  if (ssMatch) {
    const rawSs = ssMatch[1].trim();
    finalScreenshot = (rawSs.startsWith('http') || rawSs.startsWith('/'))
      ? rawSs
      : `/ethol-notifier/screenshots/${rawSs}`;
    cleanText = stripped.replace(/\[SCREENSHOT:[^\]]+\]/i, '').trim();
  }

  const cleanMsg = cleanText
    .replace(/^\[.*?\]\s*/g, '')
    .replace(/^[✓✔]\s*/g, '')
    .trim();

  // Sinkronkan tangkapan layar otentik sesuai nama mata kuliah yang dipresensi
  finalScreenshot = getCourseScreenshot(cleanMsg, finalScreenshot);

  const itemTs = ts ? Number(ts) : Date.now();
  const now = Date.now();
  const elapsedMs = now - itemTs;

  // Filter ketat: HANYA tampilkan presensi baru dalam rentang waktu 1 hari (24 jam)
  // Jangan tampilkan jika sudah lebih dari 1 hari atau timestamp tidak valid
  if (isNaN(itemTs) || elapsedMs < 0 || elapsedMs >= ONE_DAY_MS) {
    return false;
  }

  // ── FILTER ANTI-DUPLIKASI MUTLAK: Data mata kuliah yang sudah ada di konsol TIDAK BOLEH dimasukkan lagi ──
  const courseKey = getPresensiCourseKey(cleanMsg);
  const sig = `course:${courseKey}`;

  const wrap = ensureLogWrap();
  if (!wrap) return false;

  const timeStr = new Date(itemTs).toLocaleTimeString('id-ID', { hour12: false });
  const dateStr = new Date(itemTs).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const remainingHours = Math.max(1, Math.ceil((ONE_DAY_MS - elapsedMs) / (60 * 60 * 1000)));

  // Cek langsung pada DOM apakah mata kuliah ini sudah pernah dirender di konsol output
  const existingLine = wrap.querySelector(`.log-line[data-sig="${CSS.escape ? CSS.escape(sig) : sig}"]`);
  if (existingLine) {
    renderedLogSignatures.add(sig);
    // Jika data baru memiliki timestamp lebih baru atau screenshot terbaru, perbarui elemen tanpa menduplikasi baris
    const oldTs = Number(existingLine.dataset.ts || 0);
    if (itemTs >= oldTs) {
      existingLine.dataset.ts = itemTs;
      const tsEl = existingLine.querySelector('.log-ts');
      if (tsEl) tsEl.textContent = `${dateStr} ${timeStr}`;
      const expiryBadge = existingLine.querySelector('.presensi-expiry-badge');
      if (expiryBadge) expiryBadge.innerHTML = `<i class="fa-regular fa-clock"></i> Sisa ${remainingHours} Jam`;
      const img = existingLine.querySelector('.log-screenshot-img');
      if (img && finalScreenshot) {
        img.src = `${finalScreenshot}?v=20260917_matkul_ss`;
      }
      const cardEl = existingLine.querySelector('.log-screenshot-card');
      if (cardEl && finalScreenshot) {
        cardEl.onclick = () => openScreenshotModal(finalScreenshot, cleanMsg, `${dateStr} ${timeStr}`);
      }
      if (persist) {
        savePresensiEntry({ text: cleanMsg, ts: itemTs, screenshot: finalScreenshot });
      }
    }
    return false;
  }

  // Daftarkan tanda tangan mata kuliah ini ke registry
  renderedLogSignatures.add(sig);

  const line = document.createElement('div');
  line.className = 'log-line level-sukses';
  line.dataset.level = 'sukses';
  line.dataset.ts = itemTs;
  line.dataset.sig = sig;

  // Baris Meta (Timestamp, Badge Sukses, Badge 24 Jam)
  const metaRow = document.createElement('div');
  metaRow.className = 'log-meta-row';

  const tsEl = document.createElement('span');
  tsEl.className = 'log-ts';
  tsEl.textContent = `${dateStr} ${timeStr}`;

  const isTercatat = cleanText.toLowerCase().includes('tercatat') || cleanText.toLowerCase().includes('hadir');
  const badgeEl = document.createElement('span');
  badgeEl.className = 'presensi-success-badge';
  badgeEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${isTercatat ? 'PRESENSI TERCATAT' : 'PRESENSI BERHASIL'}`;

  const expiryBadge = document.createElement('span');
  expiryBadge.className = 'presensi-expiry-badge';
  expiryBadge.title = 'Tersimpan sementara selama 24 jam di konsol ini';
  expiryBadge.innerHTML = `<i class="fa-regular fa-clock"></i> Sisa ${remainingHours} Jam`;

  metaRow.appendChild(tsEl);
  metaRow.appendChild(badgeEl);
  metaRow.appendChild(expiryBadge);

  // Teks Mata Kuliah
  const textEl = document.createElement('div');
  textEl.className = 'log-text';
  textEl.textContent = cleanMsg;

  line.appendChild(metaRow);
  line.appendChild(textEl);

  // Kartu Screenshot Bukti Presensi (Jika tersedia)
  if (finalScreenshot) {
    const cardEl = document.createElement('div');
    cardEl.className = 'log-screenshot-card';
    cardEl.onclick = () => openScreenshotModal(finalScreenshot, cleanMsg, `${dateStr} ${timeStr}`);

    const safeCourse = cleanMsg.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    cardEl.innerHTML = `
      <div class="log-screenshot-preview">
        <img class="log-screenshot-img" src="${finalScreenshot}?v=20260917_matkul_ss" alt="Bukti Presensi" loading="lazy" onerror="this.onerror=null; this.src=getCourseScreenshot('${safeCourse}');" />
        <div class="log-screenshot-hover-overlay">
          <span class="hover-btn"><i class="fa-solid fa-magnifying-glass-plus"></i> Perbesar Bukti Layar</span>
        </div>
      </div>
      <div class="log-screenshot-info">
        <span class="ss-info-label"><i class="fa-solid fa-camera"></i> Screenshot Bukti Presensi Server</span>
        <span class="ss-info-timer"><i class="fa-regular fa-hourglass-half"></i> Terhapus dlm ${remainingHours} jam</span>
      </div>
    `;
    line.appendChild(cardEl);
  }

  wrap.appendChild(line);

  state.logCount++;
  const logDisp = $('logCountDisplay');
  if (logDisp) logDisp.textContent = state.logCount;

  // Auto-scroll
  if (state.autoScroll) {
    const screen = $('consoleScreen');
    if (screen) screen.scrollTop = screen.scrollHeight;
  }

  // Simpan ke local temporary storage (akan bertahan selama 24 jam)
  if (persist) {
    savePresensiEntry({
      text: cleanMsg,
      ts: itemTs,
      screenshot: finalScreenshot
    });
  }
  return true;
}

// ─── CLEAR CONSOLE ────────────────────────────────────────────
function clearConsole(silent = false) {
  renderedLogSignatures.clear();
  const screen = $('consoleScreen');
  if (!screen) return;
  screen.innerHTML = `
    <div class="console-welcome" id="consoleWelcome">
      <div class="welcome-glow-ring">
        <div class="welcome-icon-wrap"><i class="fa-solid fa-graduation-cap"></i></div>
      </div>
      <div class="welcome-content">
        <h3 class="welcome-title">Konsol Presensi Ethol</h3>
        <p class="welcome-desc">Monitoring presensi otomatis ETHOL PENS di server.<br/>Hanya presensi yang berhasil diverifikasi akan dikirim ke konsol output ini.</p>
        <div class="welcome-prereq">
          <i class="fa-solid fa-circle-check"></i>
          Status Server:&nbsp;
          <code>Presensi Listener Aktif</code>
        </div>
      </div>
    </div>`;
  state.logCount = 0;
  state.logWrap  = null;
  const logDisp = $('logCountDisplay');
  if (logDisp) logDisp.textContent = '0';
  lastRenderedCount = 0;

  if (!silent) {
    clearStoredPresensiHistory();
    // Sinkronkan pembersihan buffer server
    GatewayManager.fetchJson('clear-log', { method: 'POST' }).catch(() => {});
    showToast('Konsol output telah dibersihkan.', 'info');
  }
}

// ─── FILTER ───────────────────────────────────────────────────
function setFilter(f) {
  state.filter = f || 'all';
}

// ─── AUTO SCROLL (DISABLED TOGGLE) ───────────────────────────
function toggleAutoScroll() {}

// ─── RESTORE ACTIVE PRESENSI (TEMPORARY 24 JAM) ───────────────
function restoreActivePresensiConsole() {
  const history = getStoredPresensiHistory();
  if (history && history.length > 0) {
    history.forEach((item) => {
      addLogLine(item.text, item.ts, item.screenshot, false);
    });
  } else {
    clearConsole(true);
  }
}

// ─── AUTO-PRUNE EXPIRED LOGS (> 1 HARI / 24 JAM) ──────────────
function pruneExpiredPresensiLines() {
  const screen = $('consoleScreen');
  if (!screen) return;
  const wrap = screen.querySelector('.log-lines-wrap');
  if (!wrap) return;

  const now = Date.now();
  const lines = wrap.querySelectorAll('.log-line');
  let removedAny = false;
  lines.forEach((line) => {
    const ts = Number(line.dataset.ts);
    if (!ts || isNaN(ts) || (now - ts >= ONE_DAY_MS) || (now - ts < 0)) {
      if (line.dataset.sig) renderedLogSignatures.delete(line.dataset.sig);
      line.remove();
      removedAny = true;
    }
  });

  const remaining = wrap.querySelectorAll('.log-line');
  state.logCount = remaining.length;
  const logDisp = $('logCountDisplay');
  if (logDisp) logDisp.textContent = state.logCount;

  if (remaining.length === 0 && removedAny) {
    clearConsole(true);
  }
}

// ─── SSE LOG STREAM ───────────────────────────────────────────
let lastRenderedCount = 0;
let activeLogSyncTimer = null;

async function syncLogs() {
  try {
    pruneExpiredPresensiLines();
    const res = await GatewayManager.fetchJson('logs', {}, 3000);
    if (!res.ok) return;
    const lines = res.data;
    if (!Array.isArray(lines)) return;
    const now = Date.now();
    for (let i = 0; i < lines.length; i++) {
      const item = lines[i];
      const itemTs = item.ts ? Number(item.ts) : now;
      // Hanya proses presensi yang masih baru dalam rentang 1 hari (24 jam)
      if (now - itemTs >= ONE_DAY_MS || now - itemTs < 0) continue;
      if (isPresensiSuccess(item.text)) {
        const added = addLogLine(item.text, item.ts, item.screenshot);
        if (added) {
          const cleanMsg = item.text.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\[.*?\]\s*/g, '').replace(/^[✓✔]\s*/g, '').trim();
          sendDeviceNotification('✅ Presensi Ethol Berhasil', cleanMsg, true);
          playSuccessChime();
        }
      } else if (item.text && item.text.includes('[TUGAS]')) {
        loadTasks();
      }
    }
    lastRenderedCount = lines.length;
  } catch (_) {}
}

function startActiveLogSync() {
  if (activeLogSyncTimer) return;
  syncLogs();
  activeLogSyncTimer = setInterval(syncLogs, 1500);
}

function stopActiveLogSync() {
  if (activeLogSyncTimer) {
    clearInterval(activeLogSyncTimer);
    activeLogSyncTimer = null;
  }
}

function connectSSE() {
  if (state.sseSource) { state.sseSource.close(); state.sseSource = null; }

  // Di mobile browser / web hosting, SSE sering di-terminate oleh browser saat tab background.
  // Gunakan sinkronisasi log terpadu: connect SSE jika memungkinkan, serta fast log sync
  startActiveLogSync();

  try {
    const sseUrl = window.location.protocol === 'file:'
      ? 'http://127.0.0.1:8080/api/absen/log-stream'
      : '/ethol-notifier/api.php?path=log-stream';

    const sse = new EventSource(sseUrl);
    state.sseSource = sse;

    sse.onopen = () => setServerStatus(true);
    sse.onerror = () => {
      sse.close();
      state.sseSource = null;
      // Jangan langsung set status Offline jika SSE terputus sementara (sering di HP), biarkan pollStatus memverifikasi
      setTimeout(connectSSE, 8000);
    };
    sse.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        const now = Date.now();
        const itemTs = d.ts ? Number(d.ts) : now;
        // Tolak presensi yang sudah lebih dari 1 hari (24 jam)
        if (now - itemTs >= ONE_DAY_MS || now - itemTs < 0) return;
        if (isPresensiSuccess(d.text)) {
          const added = addLogLine(d.text, d.ts, d.screenshot);
          if (added) {
            const cleanMsg = d.text.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\[.*?\]\s*/g, '').replace(/^[✓✔]\s*/g, '').trim();
            sendDeviceNotification('✅ Presensi Ethol Berhasil', cleanMsg, true);
            playSuccessChime();
          }
        } else if (d.text && d.text.includes('[TUGAS]')) {
          loadTasks();
        }
      } catch {}
    };
  } catch {
    setTimeout(connectSSE, 8000);
  }
}

// ─── SERVER STATUS ────────────────────────────────────────────
function setServerStatus(online) {
  const dot   = $('serverDot');
  const label = $('serverLabel');
  const pill  = $('serverPill');
  if (!dot || !label) return;

  if (online) {
    dot.className = 's-dot online';
    label.textContent = 'Online';
    if (pill) { pill.style.color = 'var(--accent-green)'; pill.style.borderColor = 'rgba(52,211,153,0.3)'; }
  } else {
    dot.className = 's-dot offline';
    label.textContent = 'Offline';
    if (pill) { pill.style.color = 'var(--accent-red)'; pill.style.borderColor = 'rgba(248,113,113,0.3)'; }
  }
}

// ─── POLL STATUS (SELF-HEALING) ──────────────────────────────
async function pollStatus() {
  try {
    const res = await GatewayManager.fetchJson('status', {}, 3000);
    if (!res.ok || res.data.error) {
      throw new Error(res.data.message || 'Node offline');
    }
    setServerStatus(true);
    updateKpiFromStatus(res.data);

    // Jika sedang dibuka via file://, alihkan otomatis ke URL server lokal resmi
    if (window.location.protocol === 'file:') {
      window.location.replace('http://127.0.0.1:8080/ethol-notifier/index.html');
      return;
    }
  } catch (_) {
    setServerStatus(false);
  }
}

function updateKpiFromStatus(data) {
  const isRunning = data.running;
  const btnRun    = $('btnRunNow');
  if (btnRun) btnRun.disabled = isRunning;

  const kpiStatus = $('kpiAgentStatus');
  const kpiBadge  = $('kpiAgentBadge');
  const statIcon    = $('statIconAgent');
  const statIconI   = $('statIconAgentI');

  if (isRunning) {
    if (kpiStatus) kpiStatus.textContent = 'RUNNING';
    if (kpiBadge) {
      kpiBadge.className = 'trend-pill pill-running';
      kpiBadge.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Berjalan';
    }
    if (statIcon)    statIcon.className    = 'stat-icon icon-running';
    if (statIconI)   { statIconI.className = 'fa-solid fa-circle-notch fa-spin'; }
  } else {
    const lastResult = data.lastRunResult;
    if (kpiStatus) kpiStatus.textContent = lastResult ? lastResult.toUpperCase() : 'IDLE';
    if (statIcon)  statIcon.className    = 'stat-icon icon-agent';
    if (statIconI) statIconI.className   = 'fa-solid fa-robot';

    if (lastResult === 'selesai') {
      if (kpiBadge) { kpiBadge.className = 'trend-pill pill-success'; kpiBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Selesai'; }
    } else if (lastResult === 'error') {
      if (kpiBadge) { kpiBadge.className = 'trend-pill pill-error'; kpiBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Error'; }
    } else {
      if (kpiBadge) { kpiBadge.className = 'trend-pill pill-idle'; kpiBadge.innerHTML = '<i class="fa-solid fa-circle-pause"></i> Menunggu'; }
    }
  }

  // Last run time
  const kpiLast   = $('kpiLastRun');
  const kpiResult = $('kpiLastResult');
  if (data.lastRunTs && kpiLast) {
    kpiLast.textContent = new Date(data.lastRunTs).toLocaleTimeString('id-ID');
  }
  if (data.lastRunResult && kpiResult) {
    kpiResult.textContent = data.lastRunResult;
  }

  // Sinkronisasi status Loop backend (agar loop tetap aktif walau web ditutup)
  if (data.loopActive !== undefined) {
    syncLoopUI(data.loopActive, data.loopNextRunTs);
  }
}

// ─── RUN ABSEN (SELF-HEALING) ────────────────────────────────
async function runAbsen() {
  try {
    showToast('Menghubungi backend presensi...', 'info');
    const res = await GatewayManager.fetchJson('run', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    }, 6000);

    const data = res.data || {};
    if (res.ok && data.ok) {
      showToast('Agent presensi dimulai di server...', 'success');
    } else {
      showToast(data.msg || data.message || 'Gagal memulai agent.', 'error');
    }
    await pollStatus();
  } catch (err) {
    const msg = err && err.message ? err.message : 'Backend Ethol belum aktif.';
    showToast(msg, 'error');
  }
}

// ─── LOOP MODE (PERSISTEN DI LATAR BELAKANG SERVER) ──────────
function updateCountdownDisplay() {
  const box  = $('loopCountdownBox');
  const text = $('loopCountdownText');
  if (!state.loopActive || !state.nextRunTs) {
    if (box) box.style.display = 'none';
    return;
  }

  const diffMs = state.nextRunTs - Date.now();
  if (diffMs <= 0) {
    if (text) text.textContent = 'Menjalankan presensi di server...';
    return;
  }

  const totalSec = Math.ceil(diffMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  if (text) {
    text.textContent = `Jadwal berikutnya: ${timeStr} (acak 3-5 mnt)`;
  }
}

function syncLoopUI(active, nextRunTs = null) {
  const stateChanged = state.loopActive !== active;
  state.loopActive = active;
  if (nextRunTs) state.nextRunTs = nextRunTs;

  const btn   = $('btnToggleLoop');
  const lbl   = $('loopBtnLabel');
  const box   = $('loopCountdownBox');
  const icon  = $('loopIcon');

  if (active) {
    document.body.classList.add('loop-active');
    if (stateChanged) setFilter('sukses');

    if (btn)   btn.classList.add('active');
    if (lbl)   lbl.textContent = 'Hentikan Loop';
    if (box)   box.style.display = 'flex';
    if (icon)  icon.className = 'fa-solid fa-arrows-rotate fa-spin btn-icon-left';

    if (!state.countdownTimer) {
      state.countdownTimer = setInterval(updateCountdownDisplay, 1000);
    }
    updateCountdownDisplay();
  } else {
    document.body.classList.remove('loop-active');
    if (stateChanged) setFilter('all');

    if (btn)   btn.classList.remove('active');
    if (lbl)   lbl.textContent = 'Mulai Loop Otomatis';
    if (box)   box.style.display = 'none';
    if (icon)  icon.className = 'fa-solid fa-arrows-rotate btn-icon-left';

    if (state.countdownTimer) {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }
    state.nextRunTs = null;
  }
}

async function startLoopMode() {
  try {
    syncLoopUI(true, Date.now() + 180000);
    showToast('Memulai Loop di server background...', 'info');

    const res = await GatewayManager.fetchJson('loop/start', { method: 'POST' }, 5000);
    const data = res.data || {};
    if (res.ok && data.ok) {
      syncLoopUI(true, data.nextRunTs || state.nextRunTs);
      showToast('Mode Loop Aktif di latar belakang! Aman keluar web kapan saja.', 'success');
    } else {
      syncLoopUI(false);
      showToast(data.msg || data.message || 'Gagal mengaktifkan loop server.', 'error');
    }
    await pollStatus();
  } catch (err) {
    syncLoopUI(false);
    showToast(err && err.message ? err.message : 'Server tidak merespons.', 'error');
  }
}

async function stopLoopMode() {
  try {
    syncLoopUI(false);
    showToast('Menghentikan Loop di server...', 'info');

    const res = await GatewayManager.fetchJson('loop/stop', { method: 'POST' }, 5000);
    const data = res.data || {};
    if (res.ok && data.ok) {
      syncLoopUI(false);
      showToast('Mode Loop server dinonaktifkan. UI kembali normal.', 'info');
    } else {
      showToast(data.msg || data.message || 'Gagal menghentikan loop.', 'error');
    }
    await pollStatus();
  } catch (err) {
    showToast(err && err.message ? err.message : 'Server tidak merespons.', 'error');
  }
}

function toggleLoopMode() {
  if (state.loopActive) {
    stopLoopMode();
  } else {
    startLoopMode();
  }
}

// ─── KEYBOARD SHORTCUT ───────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    const btn = $('btnRunNow');
    if (btn && !btn.disabled) runAbsen();
  }
});

// ─── TEST STREAM PRESENSI & SCREENSHOT ────────────────────────
async function testPresensiStream() {
  try {
    showToast('Menguji pengambilan screenshot presensi di server...', 'info');
    const res = await GatewayManager.fetchJson('test-presensi', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({})
    }, 6000);
    if (res.ok) {
      showToast('Presensi & screenshot bukti berhasil dikirim ke konsol!', 'success');
    }
  } catch (err) {
    showToast(err && err.message ? err.message : 'Gagal memicu pengujian presensi.', 'error');
  }
}

// Expose globals immediately (for inline onclick handlers)
window.runAbsen            = runAbsen;
window.clearConsole        = clearConsole;
window.setFilter           = setFilter;
window.toggleAutoScroll    = toggleAutoScroll;
window.copyCmd             = copyCmd;
window.toggleLoopMode      = toggleLoopMode;
window.testPresensiStream  = testPresensiStream;
window.loadTasks           = loadTasks;

// ─── LOAD & RENDER PENGINGAT TUGAS (OPSI B) ─────────────────
async function loadTasks() {
  const container = $('taskListContainer');
  const badge     = $('taskCountBadge');
  if (!container) return;

  try {
    const res = await GatewayManager.fetchJson('tugas', {}, 4000);
    if (!res.ok) return;
    const data = res.data || {};
    const tasks = data.tasks || [];

    if (badge) {
      badge.textContent = `${tasks.length} Tugas`;
      badge.className   = tasks.length > 0 ? 'trend-pill pill-warning' : 'trend-pill pill-success';
    }

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="task-empty-box">
          <i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>
          <span>Semua tugas kuliah aman / sudah dikumpulkan.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const isToday = t.hTag === 'Hari Ini';
      const itemClass = isToday ? 'task-card-item urgent-today' : 'task-card-item';
      const badgeClass = isToday ? 'task-badge-h badge-today' : 'task-badge-h';
      const badgeIcon = isToday ? '<i class="fa-solid fa-fire"></i>' : '<i class="fa-solid fa-hourglass-half"></i>';

      return `
        <div class="${itemClass}">
          <div class="task-card-header">
            <h4 class="task-card-title">${escapeHtml(t.title)}</h4>
            <span class="${badgeClass}">${badgeIcon} ${escapeHtml(t.hTag)}</span>
          </div>
          <div class="task-card-course">
            <i class="fa-solid fa-book-bookmark"></i>
            <span>${escapeHtml(t.matakuliah)}</span>
          </div>
          <div class="task-card-deadline">
            <i class="fa-regular fa-clock"></i>
            <span>Batas: <span class="dl-highlight">${escapeHtml(t.deadline_indonesia || t.deadline)}</span></span>
          </div>
          <div class="task-card-footer">
            <span class="task-card-dosen" title="${escapeHtml(t.dosen)}">
              <i class="fa-solid fa-user-tie"></i> ${escapeHtml(t.dosen || 'Dosen Pengampu')}
            </span>
            <span class="task-card-status-label">
              <i class="fa-solid fa-circle-exclamation"></i> Belum Selesai
            </span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    if (badge) badge.textContent = 'Offline';
    container.innerHTML = `
      <div class="task-empty-box">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red);"></i>
        <span>Gagal membaca data tugas.</span>
      </div>
    `;
  }
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

// ─── INIT ────────────────────────────────────────────────────
function init() {
  // Pulihkan entri presensi aktif dari penyimpanan 24 jam terakhir (atau welcome card jika kosong)
  restoreActivePresensiConsole();

  // Start SSE connection
  connectSSE();

  // Load pengingat tugas kuliah
  loadTasks();

  // Inisialisasi Integrasi Perangkat Langsung (HP ⇄ Laptop)
  initDeviceIntegration();

  // Poll status every 4s
  pollStatus();
  state.pollTimer = setInterval(pollStatus, 4000);

  // Auto-prune berkala untuk membersihkan presensi yang melewati 1 hari (24 jam)
  setInterval(pruneExpiredPresensiLines, 30000);
}

// ─── INTEGRASI LANGSUNG HP & LAPTOP (DEVICE PRESENCE, NOTIFIKASI & SYNC) ───
let deviceNotifGranted = false;

function initDeviceIntegration() {
  // 1. Registrasi Service Worker PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // 2. Deteksi Jenis Perangkat (HP vs Laptop)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const laptopTitle  = $('laptopNodeTitle');
  const phoneTitle   = $('phoneNodeTitle');
  const phoneStatus  = $('phoneSyncStatus');
  const laptopStatus = $('laptopSyncStatus');

  if (isMobile) {
    if (phoneTitle) phoneTitle.textContent = 'HP Anda (Aktif)';
    if (phoneStatus) phoneStatus.textContent = 'Mode Remote Siap (Live Stream)';
    if (laptopTitle) laptopTitle.textContent = 'Laptop Raden';
    if (laptopStatus) laptopStatus.textContent = 'Master Engine Terhubung';
  } else {
    if (laptopTitle) laptopTitle.textContent = 'Laptop Ini (Master Engine)';
    if (laptopStatus) laptopStatus.textContent = 'Daemon Aktif (Puppeteer Ready)';
    if (phoneTitle) phoneTitle.textContent = 'Mobile Client (HP)';
    if (phoneStatus) phoneStatus.textContent = 'Tersinkronisasi Otomatis';
  }

  // 3. Status Awal Notifikasi Web
  if ('Notification' in window && Notification.permission === 'granted') {
    deviceNotifGranted = true;
    updateNotifButtonUI(true);
  }

  // 4. Handler Tombol Notifikasi HP
  const btnNotif = $('btnToggleHpNotif');
  if (btnNotif) {
    btnNotif.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        showToast('Browser ini tidak mendukung Web Notification API.', 'warn');
        return;
      }
      if (Notification.permission === 'granted') {
        showToast('Notifikasi HP sudah aktif! Mengirim sinyal uji coba...', 'info');
        sendDeviceNotification('🔔 Uji Coba Notifikasi Ethol', 'Integrasi HP dan Laptop aktif! Anda akan menerima getar & pemberitahuan presensi.', true);
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        deviceNotifGranted = true;
        updateNotifButtonUI(true);
        showToast('Notifikasi HP berhasil diaktifkan!', 'success');
        sendDeviceNotification('🎓 Ethol Notifier Terhubung', 'Perangkat HP dan Laptop kini terintegrasi secara langsung.', true);
      } else {
        deviceNotifGranted = false;
        updateNotifButtonUI(false);
        showToast('Izin notifikasi ditolak di browser.', 'warn');
      }
    });
  }

  // 5. Handler Modal QR Code Hubungkan HP
  const btnOpenQr  = $('btnOpenQrModal');
  const btnCloseQr = $('btnCloseQrModal');
  const modalQr    = $('qrModalBackdrop');
  const btnCopyUrl = $('btnCopyEtholUrl');

  if (btnOpenQr && modalQr) {
    btnOpenQr.addEventListener('click', () => {
      modalQr.style.display = 'flex';
    });
  }
  if (btnCloseQr && modalQr) {
    btnCloseQr.addEventListener('click', () => {
      modalQr.style.display = 'none';
    });
  }
  if (modalQr) {
    modalQr.addEventListener('click', (e) => {
      if (e.target === modalQr) modalQr.style.display = 'none';
    });
  }
  if (btnCopyUrl) {
    btnCopyUrl.addEventListener('click', () => {
      const url = 'https://dashboard.raidenarya.my.id/ethol-notifier/';
      navigator.clipboard.writeText(url).then(() => {
        showToast('URL berhasil disalin ke clipboard!', 'success');
      }).catch(() => {
        showToast('Gagal menyalin URL.', 'warn');
      });
    });
  }
}

function updateNotifButtonUI(active) {
  const btn = $('btnToggleHpNotif');
  const lbl = $('hpNotifLabel');
  const ico = $('hpNotifIcon');
  if (!btn) return;
  if (active) {
    btn.classList.add('active');
    if (lbl) lbl.textContent = 'Notif HP Aktif';
    if (ico) ico.className = 'fa-solid fa-bell';
  } else {
    btn.classList.remove('active');
    if (lbl) lbl.textContent = 'Notifikasi HP';
    if (ico) ico.className = 'fa-regular fa-bell';
  }
}

function sendDeviceNotification(title, body, urgent = false) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Getar smartphone jika didukung Vibration API
  if (navigator.vibrate) {
    try {
      navigator.vibrate(urgent ? [300, 150, 300, 150, 300] : [200, 100, 200]);
    } catch (_) {}
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        icon: '../src/sampul/book_cover.png',
        vibrate: urgent ? [300, 150, 300, 150, 300] : [200, 100, 200],
      });
    } else {
      new Notification(title, {
        body,
        icon: '../src/sampul/book_cover.png',
        badge: '../src/sampul/book_cover.png',
        vibrate: [200, 100, 200],
        tag: 'ethol-device-alert',
      });
    }
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', init);

// ─── INTEGRASI LANGSUNG HP ⇄ LAPTOP (TELEMETRI & PING) ─────────────────────
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch (_) {}
}

async function testDeviceIntegration() {
  const icon = $('iconSyncTest');
  const label = $('labelSyncTest');
  const latencyBadge = $('syncLatency');
  const badgeText = $('integrationBadgeText');
  const laptopName = $('deviceLaptopName');
  const laptopStatus = $('deviceLaptopStatus');
  const tailscaleIp = $('valTailscaleIp');

  if (icon) icon.classList.add('fa-spin');
  if (label) label.textContent = 'Menguji Sinkronisasi...';

  const startTime = Date.now();
  try {
    const res = await fetch(getApiEndpoint('ping'), { signal: AbortSignal.timeout(6500) });
    const cType = res.headers.get('content-type') || '';
    if (!res.ok || !cType.includes('application/json')) {
      throw new Error('Gagal menghubungi node laptop.');
    }
    const data = await res.json();
    const roundtrip = Date.now() - startTime;
    const reportedLatency = data.latencyMs || roundtrip;

    if (latencyBadge) latencyBadge.textContent = `${reportedLatency} ms`;
    if (badgeText) badgeText.textContent = 'Sinkron Langsung';
    if (data.device) {
      if (laptopName) laptopName.textContent = `Laptop (${data.device.hostname || 'Raden'})`;
      if (laptopStatus) laptopStatus.textContent = 'Host Online';
      if (tailscaleIp && data.device.tailscaleIp) tailscaleIp.textContent = `${data.device.tailscaleIp}:8080`;
    }

    playSuccessChime();
    showToast(`✨ Integrasi HP ⇄ Laptop Berhasil! Latensi: ${reportedLatency}ms`, 'success');
  } catch (err) {
    if (latencyBadge) latencyBadge.textContent = 'Offline';
    if (badgeText) badgeText.textContent = 'Terputus';
    if (laptopStatus) laptopStatus.textContent = 'Offline';
    showToast(`Koneksi ke laptop gagal: ${err.message}`, 'error');
  } finally {
    if (icon) icon.classList.remove('fa-spin');
    if (label) label.textContent = 'Uji Sinkronisasi HP ⇄ Laptop';
  }
}