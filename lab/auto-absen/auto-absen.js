/* ============================================================
   AUTO ABSEN — Executive Presensi Deck
   Frontend Controller (Backend: Node.js serve.js on port 8080)
   Master Frontend Studio × Master Humanizer Implementation
   ============================================================ */

'use strict';

// ─── STATE MANAGEMENT ───────────────────────────────────────
const state = {
  sseSource:        null,
  pollTimer:        null,
  loopActive:       false,
  loopDurationSec:  240, // default ~4 mins in seconds
  countdownTimer:   null,
  nextRunTs:        null,
  logCount:         0,
  presensiList:     [],
  diagnosticsOpen:  false
};

const RING_CIRCUMFERENCE = 326.73; // 2 * PI * 52

// ─── GATEWAY MANAGER (Resilient Failover) ───────────────────
const GatewayManager = {
  activePrefix: null,

  getCandidates() {
    if (window.location.protocol === 'file:') {
      return ['http://127.0.0.1:8080'];
    }
    return [
      '/ethol-notifier/api.php?path=',
      '/api/absen',
      'http://100.73.128.8:8080',
      'http://127.0.0.1:8080'
    ];
  },

  formatUrl(prefix, action) {
    const cleanAction = action.replace(/^\/?(?:api\/absen\/)?/, '');
    if (prefix.includes('api.php')) return `${prefix}${cleanAction}`;
    return `${prefix.replace(/\/$/, '')}/api/absen/${cleanAction}`;
  },

  async fetchJson(action, options = {}, timeoutMs = 3500) {
    const candidates = [...this.getCandidates()];
    if (this.activePrefix) {
      const idx = candidates.indexOf(this.activePrefix);
      if (idx > 0) { candidates.splice(idx, 1); candidates.unshift(this.activePrefix); }
    }

    let lastErr = null;
    for (const prefix of candidates) {
      try {
        const url = this.formatUrl(prefix, action);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(url, { ...options, signal: ctrl.signal });
        clearTimeout(timer);

        if (!(res.headers.get('content-type') || '').includes('application/json')) continue;
        const data = await res.json();
        this.activePrefix = prefix;
        return { ok: res.ok, status: res.status, data };
      } catch (err) { lastErr = err; }
    }
    throw lastErr || new Error('Backend tidak aktif.');
  }
};

// ─── DOM HELPERS ────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── AMBIENT PARTICLE BACKGROUND ────────────────────────────
(function initAmbientCanvas() {
  const canvas = $('ambientCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.4,
      dx: (Math.random() - 0.5) * 0.25,
      dy: -(Math.random() * 0.4 + 0.1),
      alpha: Math.random() * 0.4 + 0.15,
      hue: Math.random() * 25 + 185, // Cyan-Teal
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 65 }, createParticle);
    window.addEventListener('resize', resize);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    const isLoop = state.loopActive;

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, ${p.alpha})`;
      ctx.fill();

      p.x += p.dx;
      p.y += p.dy;
      p.alpha -= 0.0012;

      const targetHue = isLoop ? 160 : 190; // Emerald if loop, Cyan if idle
      p.hue += (targetHue - p.hue) * 0.03;

      if (p.alpha <= 0 || p.y < -10) {
        Object.assign(p, createParticle(), {
          y: H + 5,
          hue: (isLoop ? 160 : 190) + (Math.random() - 0.5) * 20,
          alpha: Math.random() * 0.35 + 0.1
        });
      }
    }
    requestAnimationFrame(render);
  }

  init();
  render();
})();

// ─── CLOCK ──────────────────────────────────────────────────
function updateClock() {
  const el = $('topbarClock');
  if (el) el.textContent = new Date().toLocaleTimeString('id-ID', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ─── TOAST NOTIFICATIONS ────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = $('toastContainer');
  if (!container) return;
  const iconMap = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    info:    'fa-circle-info'
  };
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.innerHTML = `<i class="fa-solid ${iconMap[type] || iconMap.info} toast-ico ${type}"></i><span>${msg}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// ─── PRESENSI LOCAL RETENTION (24 Hours) ─────────────────────
const STORAGE_KEY = 'auto_absen_deck_v2';
const ONE_DAY_MS  = 86400000;
const renderedSigs = new Set();

function getCourseKey(text) {
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
    const c = parts[parts.length - 1].trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (c.length > 2) return c;
  }
  return lower.replace(/[^a-z0-9]/g, '_').slice(0, 40);
}

function getCourseScreenshot(courseText, raw = '') {
  const cleanRaw = String(raw || '').trim();
  const lower = String(courseText || '').toLowerCase();
  if (cleanRaw && !cleanRaw.includes('presensi_sample.jpg') && !cleanRaw.includes('_test.jpg')) return cleanRaw;
  if (lower.includes('statistika')) return '/ethol-notifier/screenshots/presensi_1789612285928_8qtvd.jpg';
  if (lower.includes('pemrograman') || lower.includes('wpl')) return '/ethol-notifier/screenshots/presensi_1789612302042_ojwlh.jpg';
  if (lower.includes('embedded')) return '/ethol-notifier/screenshots/presensi_embedded.jpg';
  if (lower.includes('praktikum') && lower.includes('nirkabel')) return '/ethol-notifier/screenshots/presensi_1789612294417_nuqf9.jpg';
  if (lower.includes('jaringan') || lower.includes('nirkabel')) return '/ethol-notifier/screenshots/presensi_jarkom.jpg';
  return cleanRaw || '/ethol-notifier/screenshots/presensi_sample.jpg';
}

function getStoredHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list.filter(i => i && i.ts && (now - i.ts < ONE_DAY_MS) && (now - i.ts >= 0));
  } catch { return []; }
}

function saveEntry(entry) {
  try {
    const now = Date.now();
    if (!entry || !entry.ts || (now - entry.ts >= ONE_DAY_MS) || (now - entry.ts < 0)) return;
    const list = getStoredHistory();
    const key = getCourseKey(entry.text);
    const idx = list.findIndex(l => getCourseKey(l.text) === key);
    if (idx >= 0) {
      if (entry.ts >= (list[idx].ts || 0)) list[idx] = entry;
    } else {
      list.push(entry);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-50)));
  } catch {}
}

function clearHistory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function isPresensiSuccess(text) {
  if (!text) return false;
  const lower = text.replace(/\x1b\[[0-9;]*m/g, '').trim().toLowerCase();
  if (lower.includes('login') || lower.includes('logout') || lower.includes('keluar')) return false;
  if (lower.includes('tidak ada') || lower.includes('belum ada') || lower.includes('gagal') || lower.includes('error')) return false;
  return lower.includes('presensi') && (
    lower.includes('berhasil') || lower.includes('sukses') ||
    lower.includes('tercatat') || lower.includes('hadir') || lower.includes('dilakukan')
  );
}

// ─── TIMELINE RENDERER (ACTIVITY CARDS) ─────────────────────
function renderTimelineCard(cleanMsg, ts, screenshotUrl, persist = true) {
  const container = $('timelineContainer');
  const emptyView = $('timelineEmpty');
  if (!container) return false;

  const itemTs = ts ? Number(ts) : Date.now();
  const now = Date.now();
  const elapsed = now - itemTs;
  if (isNaN(itemTs) || elapsed < 0 || elapsed >= ONE_DAY_MS) return false;

  const courseKey = getCourseKey(cleanMsg);
  const sig = `course:${courseKey}`;
  const timeStr = new Date(itemTs).toLocaleTimeString('id-ID', { hour12: false });
  const dateStr = new Date(itemTs).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const remainH = Math.max(1, Math.ceil((ONE_DAY_MS - elapsed) / 3600000));
  const finalSS = getCourseScreenshot(cleanMsg, screenshotUrl);

  if (emptyView) emptyView.style.display = 'none';

  // Check if exists, update in-place
  const existing = container.querySelector(`.timeline-card[data-sig="${CSS.escape ? CSS.escape(sig) : sig}"]`);
  if (existing) {
    renderedSigs.add(sig);
    const oldTs = Number(existing.dataset.ts || 0);
    if (itemTs >= oldTs) {
      existing.dataset.ts = itemTs;
      const tEl = existing.querySelector('.timeline-time-badge');
      if (tEl) tEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${dateStr} ${timeStr} WIB`;
      const exp = existing.querySelector('.proof-expiry');
      if (exp) exp.textContent = `Sisa waktu verifikasi: ${remainH} jam`;
      const img = existing.querySelector('.proof-thumb-img');
      if (img && finalSS) img.src = `${finalSS}?v=deck`;
    }
    if (persist) saveEntry({ text: cleanMsg, ts: itemTs, screenshot: finalSS });
    return false;
  }

  renderedSigs.add(sig);

  const card = document.createElement('article');
  card.className = 'timeline-card';
  card.dataset.ts = itemTs;
  card.dataset.sig = sig;

  card.innerHTML = `
    <div class="timeline-rail">
      <div class="timeline-node">
        <i class="fa-solid fa-check"></i>
      </div>
    </div>
    <div class="timeline-content">
      <div class="timeline-meta-row">
        <span class="timeline-time-badge">
          <i class="fa-regular fa-clock"></i> ${dateStr} ${timeStr} WIB
        </span>
        <span class="timeline-badge-success">
          <i class="fa-solid fa-circle-check"></i> Tercatat Hadir
        </span>
      </div>
      <h3 class="timeline-title">${escapeHtml(cleanMsg)}</h3>
      <div class="timeline-details">Presensi berhasil dikonfirmasi ke portal Ethol PENS.</div>
      
      ${finalSS ? `
      <div class="timeline-proof-card" onclick="openScreenshotModal('${finalSS}', '${cleanMsg.replace(/'/g, "\\'")}', '${dateStr} ${timeStr}')">
        <div class="proof-thumb-wrap">
          <img class="proof-thumb-img" src="${finalSS}?v=deck" alt="Bukti Presensi" loading="lazy" />
        </div>
        <div class="proof-info-wrap">
          <span class="proof-label"><i class="fa-solid fa-camera"></i> Bukti Layar</span>
          <span class="proof-expiry">Sisa masa aktif: ${remainH} jam</span>
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // Prepend to top of timeline
  if (emptyView && emptyView.nextSibling) {
    container.insertBefore(card, emptyView.nextSibling);
  } else {
    container.appendChild(card);
  }

  updateMetrics();
  if (persist) saveEntry({ text: cleanMsg, ts: itemTs, screenshot: finalSS });
  return true;
}

function updateMetrics() {
  const container = $('timelineContainer');
  if (!container) return;
  const cards = container.querySelectorAll('.timeline-card');
  const count = cards.length;

  const statPresensi = $('statPresensiCount');
  if (statPresensi) statPresensi.textContent = count;

  const countBadge = $('timelineCountBadge');
  if (countBadge) countBadge.textContent = `${count} Berhasil`;

  const emptyView = $('timelineEmpty');
  if (emptyView) {
    emptyView.style.display = count === 0 ? 'flex' : 'none';
  }
}

// ─── CONSOLE DIAGNOSTICS TRAY ───────────────────────────────
function addDiagnosticLog(text, ts) {
  const screen = $('consoleScreen');
  if (!screen) return;
  const welcome = screen.querySelector('.console-empty');
  if (welcome) welcome.remove();

  let wrap = screen.querySelector('.log-lines-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'log-lines-wrap';
    screen.appendChild(wrap);
  }

  const line = document.createElement('div');
  line.className = 'log-line';
  const timeStr = new Date(ts || Date.now()).toLocaleTimeString('id-ID', { hour12: false });
  line.innerHTML = `
    <span class="log-line-ts">[${timeStr}]</span>
    <span class="log-line-text">${escapeHtml(text.replace(/\x1b\[[0-9;]*m/g, ''))}</span>
  `;
  wrap.appendChild(line);

  state.logCount++;
  const counter = $('trayLogCounter');
  if (counter) counter.textContent = `${state.logCount} entri`;

  screen.scrollTop = screen.scrollHeight;
}

function toggleDiagnosticsTray() {
  const tray = $('diagnosticTray');
  const chevron = $('trayChevron');
  if (!tray) return;

  state.diagnosticsOpen = !state.diagnosticsOpen;
  tray.classList.toggle('expanded', state.diagnosticsOpen);
  if (chevron) {
    chevron.className = state.diagnosticsOpen ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
  }
}

function clearConsole(silent = false) {
  renderedSigs.clear();
  clearHistory();

  const container = $('timelineContainer');
  if (container) {
    container.querySelectorAll('.timeline-card').forEach(c => c.remove());
  }

  const emptyView = $('timelineEmpty');
  if (emptyView) emptyView.style.display = 'flex';

  const screen = $('consoleScreen');
  if (screen) {
    screen.innerHTML = `
      <div class="console-empty" id="consoleWelcome">
        <div class="empty-glow-ring"><i class="fa-solid fa-code"></i></div>
        <p>Log aktivitas backend dan rincian HTTP request akan terekam di sini secara langsung.</p>
      </div>
    `;
  }

  state.logCount = 0;
  const counter = $('trayLogCounter');
  if (counter) counter.textContent = '0 pesan';

  updateMetrics();

  if (!silent) {
    GatewayManager.fetchJson('clear-log', { method: 'POST' }).catch(() => {});
    showToast('Linimasa & log diagnostik berhasil dibersihkan.', 'info');
  }
}

function restoreFromStorage() {
  const history = getStoredHistory();
  if (history.length > 0) {
    history.forEach(item => {
      renderTimelineCard(item.text, item.ts, item.screenshot, false);
    });
  }
}

// ─── RADIAL COUNTDOWN & STATUS HUB ──────────────────────────
function setHubState(mode, headline, desc, progressRatio = 1) {
  const ring = $('radialProgressRing');
  const stateIcon = $('hubStateIcon');
  const stateLabel = $('hubStateLabel');
  const hubHeadline = $('hubHeadline');
  const hubDesc = $('hubDesc');
  const eyebrow = $('hubEyebrow');

  // Ring offset calculation
  if (ring) {
    const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progressRatio)));
    ring.style.strokeDashoffset = offset;

    if (mode === 'running') {
      ring.style.stroke = 'var(--cyan-bright)';
    } else if (mode === 'loop') {
      ring.style.stroke = 'var(--ok-bright)';
    } else {
      ring.style.stroke = 'var(--cyan)';
    }
  }

  if (stateLabel) stateLabel.textContent = mode.toUpperCase();
  if (hubHeadline) hubHeadline.textContent = headline;
  if (hubDesc) hubDesc.textContent = desc;

  if (stateIcon) {
    if (mode === 'running') {
      stateIcon.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
      stateIcon.style.color = 'var(--cyan-bright)';
    } else if (mode === 'loop') {
      stateIcon.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i>';
      stateIcon.style.color = 'var(--ok-bright)';
    } else {
      stateIcon.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
      stateIcon.style.color = 'var(--cyan)';
    }
  }

  if (eyebrow) {
    eyebrow.textContent = mode === 'loop' ? 'Pengawasan Otomatis' : (mode === 'running' ? 'Memproses' : 'Status Operasional');
  }
}

function updateRadialCountdown() {
  if (!state.loopActive || !state.nextRunTs) {
    setHubState('idle', 'Sistem Siap Absen', 'Tekan tombol di bawah untuk memeriksa dan menyelesaikan absensi sekarang, atau aktifkan mode pengawasan loop.', 1);
    return;
  }

  const diffMs = state.nextRunTs - Date.now();
  if (diffMs <= 0) {
    setHubState('running', 'Menjalankan Presensi Otomatis…', 'Engine sedang memindai kelas dan mengonfirmasi presensi ke portal Ethol.', 1);
    return;
  }

  const totalDurationMs = state.loopDurationSec * 1000;
  const ratio = Math.max(0, Math.min(1, diffMs / totalDurationMs));
  const sec = Math.ceil(diffMs / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  setHubState(
    'loop',
    `Pengecekan Berikutnya: ${timeStr}`,
    `Mode pengawasan berkala aktif. Sistem akan otomatis memindai kelas kembali dalam interval 3-5 menit acak.`,
    ratio
  );
}

function syncLoopUI(active, nextRunTs = null) {
  state.loopActive = active;
  if (nextRunTs) {
    state.nextRunTs = nextRunTs;
    const diff = Math.max(60, Math.round((nextRunTs - Date.now()) / 1000));
    state.loopDurationSec = diff > 0 ? diff : 240;
  }

  const btn = $('btnToggleLoop');
  const lbl = $('loopBtnLabel');
  const sub = $('loopBtnSub');
  const icon = $('loopIcon');

  const mobileBtn = $('mobileBtnLoop');
  const mobileText = $('mobileLoopText');

  if (active) {
    document.body.classList.add('loop-active');
    if (btn) btn.classList.add('active');
    if (lbl) lbl.textContent = 'Hentikan Loop';
    if (sub) sub.textContent = 'Pengawasan berkala sedang berjalan';
    if (icon) icon.className = 'fa-solid fa-arrows-rotate fa-spin';

    if (mobileBtn) mobileBtn.classList.add('active');
    if (mobileText) mobileText.textContent = 'Stop Loop';

    if (!state.countdownTimer) state.countdownTimer = setInterval(updateRadialCountdown, 1000);
    updateRadialCountdown();
  } else {
    document.body.classList.remove('loop-active');
    if (btn) btn.classList.remove('active');
    if (lbl) lbl.textContent = 'Mulai Loop Otomatis';
    if (sub) sub.textContent = 'Interval acak 3-5 menit';
    if (icon) icon.className = 'fa-solid fa-arrows-rotate';

    if (mobileBtn) mobileBtn.classList.remove('active');
    if (mobileText) mobileText.textContent = 'Loop';

    if (state.countdownTimer) {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }
    state.nextRunTs = null;
    setHubState('idle', 'Sistem Siap Absen', 'Tekan tombol di bawah untuk memeriksa dan menyelesaikan absensi sekarang, atau aktifkan mode pengawasan loop.', 1);
  }
}

// ─── ACTIONS: RUN & LOOP ────────────────────────────────────
async function runAbsen() {
  const btn = $('btnRunNow');
  if (btn) btn.disabled = true;

  try {
    setHubState('running', 'Menghubungi Server…', 'Menginisialisasi automasi browser untuk absensi Ethol.', 1);
    showToast('Mengirim perintah presensi ke server…', 'info');

    const res = await GatewayManager.fetchJson('run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, 6000);

    const d = res.data || {};
    if (res.ok && d.ok) {
      showToast('Presensi berhasil dimulai di latar belakang.', 'success');
    } else {
      showToast(d.msg || d.message || 'Gagal memulai presensi.', 'error');
    }
    await pollStatus();
  } catch (err) {
    showToast(err?.message || 'Gagal menghubungi server.', 'error');
    setHubState('idle', 'Sistem Siap Absen', 'Gagal memicu presensi. Periksa apakah server backend aktif.', 1);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function startLoop() {
  try {
    syncLoopUI(true, Date.now() + 240000);
    showToast('Mengaktifkan mode pengawasan otomatis…', 'info');

    const res = await GatewayManager.fetchJson('loop/start', { method: 'POST' }, 5000);
    const d = res.data || {};
    if (res.ok && d.ok) {
      syncLoopUI(true, d.nextRunTs || state.nextRunTs);
      showToast('Mode pengawasan loop aktif. Aman ditinggal kapan saja.', 'success');
    } else {
      syncLoopUI(false);
      showToast(d.msg || 'Gagal mengaktifkan mode loop.', 'error');
    }
    await pollStatus();
  } catch (err) {
    syncLoopUI(false);
    showToast(err?.message || 'Server tidak merespons.', 'error');
  }
}

async function stopLoop() {
  try {
    showToast('Menghentikan mode loop…', 'info');
    const res = await GatewayManager.fetchJson('loop/stop', { method: 'POST' }, 5000);
    const d = res.data || {};
    syncLoopUI(false);
    if (res.ok && d.ok) {
      showToast('Mode pengawasan loop dinonaktifkan.', 'info');
    } else {
      showToast(d.msg || 'Gagal menghentikan loop.', 'error');
    }
    await pollStatus();
  } catch (err) {
    syncLoopUI(false);
    showToast(err?.message || 'Server tidak merespons.', 'error');
  }
}

function toggleLoopMode() {
  state.loopActive ? stopLoop() : startLoop();
}

// ─── TEST SCREENSHOT STREAM ─────────────────────────────────
async function testPresensiStream() {
  try {
    showToast('Memicu audit screenshot simulasi…', 'info');
    const res = await GatewayManager.fetchJson('test-presensi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }, 6000);

    if (res.ok) {
      showToast('Bukti presensi simulasi berhasil diproses.', 'success');
    }
  } catch (err) {
    showToast(err?.message || 'Gagal mengirim simulasi presensi.', 'error');
  }
}

// ─── STATUS POLLING & LOG SYNC ──────────────────────────────
async function pollStatus() {
  try {
    const res = await GatewayManager.fetchJson('status', {}, 3000);
    if (!res.ok || res.data.error) throw new Error(res.data.message || 'Offline');

    setServerStatus(true);
    const data = res.data;

    // Hub metrics
    const lastRunEl = $('hubLastRun');
    if (lastRunEl) {
      lastRunEl.textContent = data.lastRunTs ? new Date(data.lastRunTs).toLocaleTimeString('id-ID') : 'Belum pernah';
    }

    const lastResultEl = $('hubLastResult');
    if (lastResultEl) {
      lastResultEl.textContent = data.lastRunResult ? data.lastRunResult.toUpperCase() : 'Idle';
    }

    if (data.running) {
      setHubState('running', 'Sedang Memeriksa Presensi…', 'Engine automasi sedang aktif memproses halaman Ethol.', 1);
    } else if (data.loopActive !== undefined) {
      syncLoopUI(data.loopActive, data.loopNextRunTs);
    }
  } catch {
    setServerStatus(false);
  }
}

function setServerStatus(online) {
  const dot = $('serverDot');
  const label = $('serverLabel');
  if (!dot || !label) return;

  if (online) {
    dot.className = 'chip-pulse online';
    label.textContent = 'Server Online';
  } else {
    dot.className = 'chip-pulse offline';
    label.textContent = 'Server Terputus';
  }
}

// ─── LOG SYNCHRONIZATION (FALLBACK POLLING & SSE) ────────────
async function syncLogs() {
  try {
    const res = await GatewayManager.fetchJson('logs', {}, 3000);
    if (!res.ok || !Array.isArray(res.data)) return;

    const lines = res.data;
    const now = Date.now();

    for (const item of lines) {
      const itemTs = item.ts ? Number(item.ts) : now;
      if (now - itemTs >= ONE_DAY_MS || now - itemTs < 0) continue;

      addDiagnosticLog(item.text, item.ts);

      if (isPresensiSuccess(item.text)) {
        const added = renderTimelineCard(item.text, item.ts, item.screenshot);
        if (added) {
          playChime();
          sendNotification('✅ Presensi Tercatat', item.text);
        }
      } else if (item.text && item.text.includes('[TUGAS]')) {
        loadTasks();
      }
    }
  } catch {}
}

function connectSSE() {
  if (state.sseSource) { state.sseSource.close(); state.sseSource = null; }

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
      setTimeout(connectSSE, 8000);
    };

    sse.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        const now = Date.now();
        const ts = d.ts ? Number(d.ts) : now;
        if (now - ts >= ONE_DAY_MS || now - ts < 0) return;

        addDiagnosticLog(d.text, d.ts);

        if (isPresensiSuccess(d.text)) {
          const added = renderTimelineCard(d.text, d.ts, d.screenshot);
          if (added) {
            playChime();
            sendNotification('✅ Presensi Berhasil', d.text);
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

// ─── TASKS LOADER ───────────────────────────────────────────
async function loadTasks() {
  const container = $('taskListContainer');
  const badge = $('taskCountBadge');
  const profileStat = $('statTaskCount');
  if (!container) return;

  try {
    const res = await GatewayManager.fetchJson('tugas', {}, 4000);
    if (!res.ok) return;
    const tasks = (res.data || {}).tasks || [];

    if (badge) {
      badge.textContent = `${tasks.length} Tugas`;
      badge.className = tasks.length > 0 ? 'count-pill pill-warn' : 'count-pill';
    }

    if (profileStat) {
      profileStat.textContent = tasks.length > 0 ? `${tasks.length} Pending` : 'Aman';
    }

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="task-empty">
          <i class="fa-solid fa-circle-check" style="color:var(--ok)"></i>
          <span>Semua tugas beres! Tidak ada deadline mendesak.</span>
        </div>`;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const isToday = t.hTag === 'Hari Ini';
      return `
        <article class="task-card${isToday ? ' urgent' : ''}">
          <div class="task-card-header">
            <h4 class="task-card-title">${escapeHtml(t.title)}</h4>
            <span class="task-badge-h${isToday ? ' badge-today' : ''}">
              ${isToday ? '<i class="fa-solid fa-fire"></i>' : '<i class="fa-regular fa-clock"></i>'} ${escapeHtml(t.hTag)}
            </span>
          </div>
          <div class="task-card-course"><i class="fa-solid fa-book-bookmark"></i> ${escapeHtml(t.matakuliah)}</div>
          <div class="task-card-deadline"><i class="fa-regular fa-calendar-check"></i> Batas: <span class="dl-highlight">${escapeHtml(t.deadline_indonesia || t.deadline)}</span></div>
          <div class="task-card-footer">
            <span><i class="fa-solid fa-user-tie"></i> ${escapeHtml(t.dosen || 'Dosen Pengampu')}</span>
            <span><i class="fa-solid fa-circle-exclamation"></i> Belum Selesai</span>
          </div>
        </article>
      `;
    }).join('');
  } catch {
    if (badge) badge.textContent = 'Offline';
    container.innerHTML = `
      <div class="task-empty">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i>
        <span>Gagal memuat tugas. Server offline.</span>
      </div>`;
  }
}

// ─── SCREENSHOT MODAL LIGHTBOX ──────────────────────────────
function openScreenshotModal(src, title, time) {
  const modal = $('screenshotModal');
  const img = $('modalSsImage');
  if (!modal || !img) return;

  const resolved = getCourseScreenshot(title, src);
  img.src = `${(resolved || '').split('?')[0]}?v=deck`;

  const t = $('modalSsTitle');
  if (t) t.textContent = title || 'Bukti Layar Presensi';
  const s = $('modalSsSubtitle');
  if (s) s.textContent = `Waktu Verifikasi: ${time || '-'} • Disimpan 24 jam`;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeScreenshotModal(e) {
  if (e && e.target && e.target.closest && e.target.closest('.modal-dialog') && !e.target.closest('.btn-close-modal')) return;
  const modal = $('screenshotModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeScreenshotModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    const btn = $('btnRunNow');
    if (btn && !btn.disabled) runAbsen();
  }
});

// ─── AUDIO & NOTIFICATION ENGINE ────────────────────────────
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
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
  } catch {}
}

function sendNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200]); } catch {}
  }
  try {
    new Notification(title, { body, tag: 'autoabsen-alert' });
  } catch {}
}

// ─── EXPOSE GLOBALS ─────────────────────────────────────────
window.runAbsen              = runAbsen;
window.toggleLoopMode        = toggleLoopMode;
window.testPresensiStream    = testPresensiStream;
window.loadTasks             = loadTasks;
window.clearConsole          = clearConsole;
window.toggleDiagnosticsTray = toggleDiagnosticsTray;
window.openScreenshotModal   = openScreenshotModal;
window.closeScreenshotModal  = closeScreenshotModal;

// ─── INITIALIZATION ─────────────────────────────────────────
function init() {
  restoreFromStorage();
  connectSSE();
  syncLogs();
  loadTasks();
  pollStatus();

  state.pollTimer = setInterval(pollStatus, 4000);
  setInterval(syncLogs, 2500);

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

document.addEventListener('DOMContentLoaded', init);
