/* =========================================================
   FITUR: KONSOL NOTIFIKASI WEB (LEMBARAN KANAN ATAS)
   Terminal Stream Notifikasi, Webhook, & Logging Real-Time
   ========================================================= */

(function initKonsolWeb() {
  const STORAGE_KEY = 'grimoire_console_logs_ethol_sukses_v5'; // Khusus feed presensi berhasil murni Ethol (v5 anti-warn/error)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  function isPresensiSuccess(text) {
    if (!text) return false;
    const clean = String(text).replace(/\x1b\[[0-9;]*m/g, '').trim();
    const lower = clean.toLowerCase();
    // Tolak keras log warning, error, info sistem, debug, login, logout, atau ketiadaan sesi
    if (lower.includes('warn') || lower.includes('error') || lower.includes('info') || lower.includes('debug')) return false;
    if (lower.includes('login') || lower.includes('logout') || lower.includes('keluar')) return false;
    if (lower.includes('tidak ada') || lower.includes('belum ada') || lower.includes('gagal') || lower.includes('skip') || lower.includes('disabled') || lower.includes('tutup')) return false;
    
    // HANYA terima presensi yang benar-benar berhasil dikonfirmasi atau tercatat hadir
    const hasPresensi = lower.includes('presensi') || lower.includes('kehadiran');
    const hasSuccess = lower.includes('berhasil') || lower.includes('sukses') || lower.includes('tercatat hadir') || lower.includes('telah dilakukan') || clean.includes('✓');
    return hasPresensi && hasSuccess;
  }

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

  const INITIAL_LOGS = [];

  function getStoredLogs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          // Filter hanya log presensi sukses murni dalam rentang waktu 1 hari (24 jam)
          const valid = parsed.filter(item => {
            if (item.tag === 'USER-COMMAND') return true;
            if (item.ts) {
              const isRecent = (now - item.ts < ONE_DAY_MS) && (now - item.ts >= 0);
              return isRecent && item.level === 'SUCCESS' && isPresensiSuccess(item.msg);
            }
            return false;
          });
          return valid;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca log dari localStorage:', e);
    }
    return INITIAL_LOGS;
  }

  function saveStoredLogs(logs) {
    try {
      const now = Date.now();
      // Simpan maksimal 60 log terbaru yang berumur kurang dari 1 hari
      const valid = logs.filter(item => !item.ts || ((now - item.ts < ONE_DAY_MS) && (now - item.ts >= 0)));
      const trimmed = valid.slice(-60);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Gagal menyimpan log:', e);
    }
  }



  document.addEventListener('DOMContentLoaded', () => {
    let logs = getStoredLogs();
    let currentFilter = 'ALL';
    let autoScroll = true;

    // Elements
    const screen = document.getElementById('consoleScreen');
    const filterTabs = document.querySelectorAll('.c-tab');
    const btnClear = document.getElementById('btnClearConsole');
    const btnSimulate = document.getElementById('btnSimulateEvent');
    const logInput = document.getElementById('consoleTextInput');
    const btnSendLog = document.getElementById('btnSendLog');

    function getTimeString() {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }

    // ─── STREAM REAL-TIME SUKSES ABSENSI ETHOL ACADEMIC NOTIFIER (SELF-HEALING) ──
    function connectEtholAttendanceStream() {
      try {
        const streamUrl = window.location.protocol === 'file:' 
          ? 'http://127.0.0.1:8080/api/absen/log-stream' 
          : '/ethol-notifier/api.php?path=log-stream';
        const sse = new EventSource(streamUrl);
        sse.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data);
            const now = Date.now();
            const itemTs = d.ts ? Number(d.ts) : now;
            // Tolak presensi jika sudah lebih dari 1 hari (24 jam)
            if (now - itemTs >= ONE_DAY_MS || now - itemTs < 0) return;

            const raw = d.text || '';
            // HANYA tangkap & tampilkan baris SUKSES presensi murni dari Ethol Academic Notifier
            if (isPresensiSuccess(raw)) {
              const cleanMsg = raw
                .replace(/\[SCREENSHOT:[^\]]+\]/gi, '')
                .replace(/\[SUKSES\]/gi, '')
                .replace(/✓\s*SUKSES/gi, '')
                .replace(/\x1b\[[0-9;]*m/g, '')
                .trim();
              addLogEntry('SUCCESS', 'ETHOL-ABSEN', `✔ ${cleanMsg}`, itemTs);
              if (typeof playMagicChime === 'function') {
                playMagicChime();
              }
            }
          } catch {}
        };
        sse.onerror = () => {
          sse.close();
          setTimeout(connectEtholAttendanceStream, 8000);
        };
      } catch {
        setTimeout(connectEtholAttendanceStream, 8000);
      }
    }

    connectEtholAttendanceStream();

    function renderLogs() {
      if (!screen) return;
      const now = Date.now();

      // HANYA menampilkan log presensi yang benar-benar berhasil dari Ethol Academic Notifier dalam rentang 1 hari (24 jam) (atau perintah CLI saldo)
      const filtered = logs.filter(item => {
        if (item.ts && (now - item.ts >= ONE_DAY_MS || now - item.ts < 0)) {
          return false;
        }
        const isEtholSuccess = item.level === 'SUCCESS' && isPresensiSuccess(item.msg);
        const isCli = item.tag === 'USER-COMMAND' || item.level === 'FINANCE';

        if (currentFilter === 'ALL') return isEtholSuccess || isCli;
        if (currentFilter === 'SUCCESS') return isEtholSuccess;
        return item.level.toUpperCase() === currentFilter;
      });

      if (filtered.length === 0) {
        screen.innerHTML = `
          <div class="console-empty">
            [Menunggu sinyal sukses presensi dari Ethol Academic Notifier...]
          </div>
        `;
        return;
      }

      screen.innerHTML = filtered.map(item => {
        const levelClass = (item.level || 'info').toLowerCase();
        return `
          <div class="log-row">
            <span class="log-time">[${escapeHtml(item.time)}]</span>
            <span class="log-badge ${levelClass}">[${escapeHtml(item.level)}]</span>
            <span class="log-tag">[${escapeHtml(item.tag)}]</span>
            <span class="log-msg ${item.level === 'SUCCESS' || item.level === 'EVENT' || item.level === 'FINANCE' ? 'highlight' : ''}">${escapeHtml(item.msg)}</span>
          </div>
        `;
      }).join('');

      if (autoScroll) {
        screen.scrollTop = screen.scrollHeight;
      }
    }

    function addLogEntry(level, tag, msg, ts = null) {
      // Filter ketat: Pastikan HANYA sukses absensi Ethol murni atau perintah CLI yang dicatat
      const isEtholSuccess = (level || '').toUpperCase() === 'SUCCESS' && isPresensiSuccess(msg);
      const isCli = tag === 'USER-COMMAND' || level === 'FINANCE' || tag === 'CLI-HELP';

      if (!isEtholSuccess && !isCli) return;

      const now = Date.now();
      const entryTs = ts ? Number(ts) : now;
      // Jangan tambahkan presensi jika sudah lebih dari 1 hari (24 jam)
      if (isEtholSuccess && (now - entryTs >= ONE_DAY_MS || now - entryTs < 0)) {
        return;
      }

      const cleanMsg = String(msg || '').trim();

      // ── FILTER ANTI-DUPLIKASI: Data yang sudah dimasukkan ke konsol tidak boleh dimasukkan lagi ──
      const courseKey = getPresensiCourseKey(cleanMsg);
      const existingIdx = logs.findIndex(item => {
        if (isEtholSuccess) {
          return getPresensiCourseKey(item.msg) === courseKey;
        }
        return item.msg === cleanMsg;
      });

      if (existingIdx >= 0) {
        // Data mata kuliah ini SUDAH PERNAH dimasukkan ke konsol output! Jangan tambah baris baru.
        if (entryTs >= (logs[existingIdx].ts || 0)) {
          logs[existingIdx].ts = entryTs;
          logs[existingIdx].time = getTimeString();
          logs[existingIdx].msg = cleanMsg;
          saveStoredLogs(logs);
          renderLogs();
        }
        return;
      }

      const entry = {
        ts: entryTs,
        time: getTimeString(),
        level: (level || 'SUCCESS').toUpperCase(),
        tag: (tag || 'ETHOL-ABSEN').toUpperCase(),
        msg: cleanMsg
      };

      logs.push(entry);
      saveStoredLogs(logs);
      renderLogs();
    }

    // Pembersihan periodik log presensi yang melewati batas 1 hari (24 jam)
    setInterval(() => {
      const now = Date.now();
      const prevLen = logs.length;
      logs = logs.filter(item => !item.ts || (now - item.ts < ONE_DAY_MS && now - item.ts >= 0));
      if (logs.length !== prevLen) {
        saveStoredLogs(logs);
        renderLogs();
      }
    }, 30000);

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Expose API Global agar modul lain atau devtools dapat memicu log
    window.GrimoireConsole = {
      log: function(level, tag, msg) {
        addLogEntry(level, tag, msg);
      },
      clear: function() {
        logs = [];
        saveStoredLogs(logs);
        renderLogs();
      },
      simulate: function() {
        addLogEntry('INFO', 'SYSTEM', 'Simulasi event sistem Grimoire aktif.');
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }
      }
    };

    // Event Filter Tabs
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-level') || 'ALL';
        renderLogs();
      });
    });

    // Event Clear Console
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('Bersihkan seluruh log notifikasi?')) {
          logs = [];
          saveStoredLogs(logs);
          addLogEntry('INFO', 'SYSTEM', 'Konsol notifikasi telah dibersihkan.');
        }
      });
    }

    // Event Simulate Event Web
    if (btnSimulate) {
      btnSimulate.addEventListener('click', () => {
        window.GrimoireConsole.simulate();
      });
    }

    // Event Eksekusi Command CLI: Mengetik "saldo" / "uang" / "sisa" baru memunculkan sisa uang
    function handleManualInput() {
      if (!logInput) return;
      const text = logInput.value.trim();
      if (!text) return;

      const lower = text.toLowerCase();
      // Catat echo perintah pengguna di konsol
      addLogEntry('EVENT', 'USER-COMMAND', `> ${text}`);

      // Perintah help/bantuan
      if (['help', 'bantuan', '?'].includes(lower)) {
        addLogEntry('INFO', 'CLI-HELP', 'Perintah konsol: ketik teks apa saja untuk mencatat log kustom.');
      }

      logInput.value = '';
    }

    if (btnSendLog) {
      btnSendLog.addEventListener('click', handleManualInput);
    }

    if (logInput) {
      logInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleManualInput();
        }
      });
    }

    renderLogs();
  });
})();
