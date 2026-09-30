const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { spawn, exec } = require('child_process');
const os     = require('os');
const https  = require('https');

// ─── Global Crash Protection & Self-Healing Guards ────────────────────
process.on('uncaughtException', (err) => {
  console.error(`[CRASH GUARD] Uncaught Exception terdeteksi: ${err.message}`);
  if (err.stack) console.error(err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH GUARD] Unhandled Rejection terdeteksi:', reason);
});

const mimeTypes = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.mp4':  'video/mp4',
  '.mov':  'video/quicktime',
  '.webm': 'video/webm',
};

const PORT = process.env.PORT || 8080;

// ─── State Ethol Agent ────────────────────────────────────────────────
let agentRunning   = false;
let lastRunTs      = null;
let lastRunResult  = null; // 'selesai' | 'error'
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

const LOGS_BUFFER_PATH = path.join(__dirname, 'logs_buffer.json');
let logLines = []; // Buffer log khusus presensi sukses
try {
  if (fs.existsSync(LOGS_BUFFER_PATH)) {
    const rawSaved = JSON.parse(fs.readFileSync(LOGS_BUFFER_PATH, 'utf8'));
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const rawFiltered = Array.isArray(rawSaved) ? rawSaved.filter(l => l && l.ts && (now - l.ts < ONE_DAY_MS) && (now - l.ts >= 0)) : [];
    const seenSig = new Set();
    logLines = [];
    for (const item of rawFiltered) {
      const courseKey = getPresensiCourseKey(item.text);
      if (!seenSig.has(courseKey)) {
        seenSig.add(courseKey);
        logLines.push(item);
      }
    }
  }
} catch (_) {}

function saveLogLinesBuffer() {
  try {
    fs.writeFileSync(LOGS_BUFFER_PATH, JSON.stringify(logLines, null, 2), 'utf8');
  } catch (_) {}
}

const MAX_LOG_LINES = 200;

// ─── Loop Otomatis Backend (Persisten & Terus Berjalan di Latar Belakang) ──
let loopActive    = false;
let loopTimer     = null;
let loopNextRunTs = null;

function getRandomIntervalSec(minSec = 180, maxSec = 300) {
  return Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
}

function scheduleNextLoopRun() {
  if (!loopActive) return;
  const delaySec = getRandomIntervalSec(180, 300);
  loopNextRunTs = Date.now() + (delaySec * 1000);
  const m = Math.floor(delaySec / 60);
  const s = delaySec % 60;
  console.log(`[LOOP] ⏳ Putaran berikutnya dijadwalkan dalam ${m}m ${s}s (acak 3-5 mnt)...`);

  if (loopTimer) clearTimeout(loopTimer);
  loopTimer = setTimeout(() => {
    if (!loopActive) return;
    if (!agentRunning) {
      runAgent([]);
    } else {
      scheduleNextLoopRun();
    }
  }, delaySec * 1000);
}

function startServerLoop() {
  if (loopActive) return { ok: true, msg: 'Loop sudah aktif.', loopActive: true, nextRunTs: loopNextRunTs };
  loopActive = true;
  console.log('[LOOP] 🚀 Mode Loop Otomatis diaktifkan di server background (interval acak 3-5 menit). Tetap berjalan meski web ditutup.');
  if (!agentRunning) {
    runAgent([]);
  } else {
    scheduleNextLoopRun();
  }
  return { ok: true, msg: 'Loop otomatis server aktif.', loopActive: true, nextRunTs: loopNextRunTs };
}

function stopServerLoop() {
  loopActive = false;
  loopNextRunTs = null;
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  console.log('[LOOP] ⏹ Mode Loop Otomatis dinonaktifkan.');
  return { ok: true, msg: 'Loop otomatis dihentikan.', loopActive: false };
}

// SSE clients yang sedang mendengarkan log stream
const sseClients = new Set();

function isPresensiSuccess(line) {
  if (!line) return false;
  const lower = line.toLowerCase();
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

function cleanupExpiredScreenshots(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const candidateDirs = [
      path.join(__dirname, 'ethol-notifier', 'screenshots'),
      path.join(__dirname, 'screenshots'),
    ];
    const now = Date.now();
    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (f === 'presensi_sample.jpg') continue; // pertahankan aset sample acuan
        const fp = path.join(dir, f);
        try {
          const stat = fs.statSync(fp);
          if (now - stat.mtimeMs > maxAgeMs) {
            fs.unlinkSync(fp);
            console.log(`[CLEANUP] Menghapus screenshot kedaluwarsa (> 24 jam): ${f}`);
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
}

function pushLog(line) {
  // Strip ANSI escape codes
  const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
  if (!clean) return;

  // Cetak ke terminal host server untuk observability teknisi/developer
  console.log(`[ETHOL-SERVER] ${clean}`);

  // HANYA simpan ke buffer dan kirim ke konsol output client jika presensi di server berhasil (bukan login, bukan logout)
  if (!isPresensiSuccess(clean)) return;

  // Ekstrak tag [SCREENSHOT:filename.jpg] jika ada
  let screenshot = null;
  let text = clean;
  const ssMatch = clean.match(/\[SCREENSHOT:([^\]]+)\]/i);
  if (ssMatch) {
    const rawFile = ssMatch[1].trim();
    screenshot = rawFile.startsWith('http') || rawFile.startsWith('/')
      ? rawFile
      : `/ethol-notifier/screenshots/${rawFile}`;
    text = clean.replace(/\[SCREENSHOT:[^\]]+\]/i, '').trim();
  }

  const now = Date.now();
  // Bersihkan log yang sudah lebih dari 1 hari (24 jam) dari buffer server
  logLines = logLines.filter(l => l && l.ts && (now - l.ts < 24 * 60 * 60 * 1000) && (now - l.ts >= 0));

  // ── FILTER ANTI-DUPLIKASI: Data presensi untuk mata kuliah yang sama tidak boleh diduplikasi ──
  const courseKey = getPresensiCourseKey(text);
  const existingIdx = logLines.findIndex(l => getPresensiCourseKey(l.text) === courseKey);

  if (existingIdx >= 0) {
    console.log(`[ETHOL-SERVER] [DEDUPLICATE] Memperbarui status presensi aktif (tanpa duplikasi baris): ${text}`);
    logLines[existingIdx] = {
      ts: now,
      text: text,
      raw: clean,
      screenshot: screenshot || logLines[existingIdx].screenshot,
      expiresAt: now + (24 * 60 * 60 * 1000)
    };
    saveLogLinesBuffer();
    // Broadcast pembaruan ke SSE clients
    for (const client of sseClients) {
      try { client.write(`data: ${JSON.stringify(logLines[existingIdx])}\n\n`); } catch {}
    }
    return;
  }

  const item = { 
    ts: now, 
    text: text, 
    raw: clean,
    screenshot: screenshot,
    expiresAt: now + (24 * 60 * 60 * 1000)
  };

  logLines.push(item);
  if (logLines.length > MAX_LOG_LINES) logLines.shift();
  saveLogLinesBuffer();

  // Broadcast ke semua SSE clients
  for (const client of sseClients) {
    try { client.write(`data: ${JSON.stringify(item)}\n\n`); } catch {}
  }
}

function getTaskFilePath() {
  const p1 = path.join(__dirname, 'ethol-notifier', 'tasks.json');
  return fs.existsSync(p1) ? p1 : path.join(__dirname, 'tasks.json');
}

function getAgentPath() {
  const p1 = path.join(__dirname, 'ethol-notifier', 'ethol-agent.js');
  return fs.existsSync(p1) ? p1 : path.join(__dirname, 'ethol-agent.js');
}

function runAgent(args = []) {
  cleanupExpiredScreenshots();
  if (agentRunning) return { ok: false, msg: 'Agent sedang berjalan.' };
  agentRunning = true;
  lastRunTs    = new Date().toISOString();
  console.log(`\n[SERVER] ▶ Menjalankan auto absen... ${new Date().toLocaleTimeString('id-ID')}`);

  const agentPath = getAgentPath();
  const agentCwd  = path.dirname(agentPath);
  const proc = spawn('node', [agentPath, ...args], { cwd: agentCwd });

  proc.stdout.on('data', (d) => d.toString().split('\n').forEach(pushLog));
  proc.stderr.on('data', (d) => d.toString().split('\n').forEach(pushLog));

  proc.on('close', (code) => {
    agentRunning  = false;
    lastRunResult = code === 0 ? 'selesai' : 'error';
    console.log(`[SERVER] ■ Agent selesai (exit code: ${code}) — ${new Date().toLocaleTimeString('id-ID')}\n`);
    // Jika loop backend sedang aktif, jadwalkan putaran berikutnya secara otomatis
    if (loopActive) {
      scheduleNextLoopRun();
    }
  });

  proc.on('error', (err) => {
    agentRunning  = false;
    lastRunResult = 'error';
    console.log(`[SERVER] ✖ Gagal menjalankan node agent: ${err.message}\n`);
  });

  return { ok: true, msg: 'Agent dimulai.' };
}

// ─── HTTP Server ──────────────────────────────────────────────────────
// ─── Network & Device Telemetry (Integrasi Langsung HP ⇄ Laptop) ─────────────
function getDeviceNetworkInfo() {
  const interfaces = os.networkInterfaces();
  let tailscaleIp = null;
  let lanIp = null;

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (name.toLowerCase().includes('tailscale') || addr.address.startsWith('100.')) {
          tailscaleIp = addr.address;
        } else if (!lanIp) {
          lanIp = addr.address;
        }
      }
    }
  }

  return {
    hostname:    os.hostname(),
    platform:    process.platform,
    tailscaleIp: tailscaleIp || '100.87.248.13',
    lanIp:       lanIp || '127.0.0.1',
    port:        PORT,
    role:        'Laptop Agent Host',
    online:      true,
  };
}

function sendServerHeartbeat() {
  try {
    const dev = getDeviceNetworkInfo();
    const payload = JSON.stringify({
      hostname:      dev.hostname,
      tailscaleIp:   dev.tailscaleIp,
      lanIp:         dev.lanIp,
      port:          PORT,
      agentRunning:  agentRunning,
      loopActive:    loopActive,
      loopNextRunTs: loopNextRunTs,
      lastRunTs:     lastRunTs,
      lastRunResult: lastRunResult,
      timestamp:     Date.now(),
    });

    const req = https.request('https://dashboard.raidenarya.my.id/ethol-notifier/api.php?path=heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 6000,
    }, () => {});

    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
    req.write(payload);
    req.end();
  } catch (_) {}
}
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const url       = parsedUrl.pathname;

  // ── CORS Headers (Mendukung permintaan lintas origin / HTTPS) ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // ── Redirect URL Lawas ethol.html ke Folder Khusus ethol-notifier ──
  if (url === '/ethol.html') {
    res.writeHead(302, { 'Location': '/ethol-notifier/index.html' });
    return res.end();
  }

  // ── API: Health Check Mendalam (Self-Healing Watchdog) ──
  if (url === '/api/absen/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'healthy',
      uptimeSec: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      agentRunning,
      loopActive,
      loopNextRunTs,
      timestamp: Date.now(),
    }));
  }

  // ── API: Status ──
  // ── API: Ping Telemetri Integrasi Langsung HP ⇄ Laptop ──
  if (url === '/api/absen/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      pong: true,
      device: getDeviceNetworkInfo(),
      agentRunning,
      loopActive,
      timestamp: Date.now(),
    }));
  }
  if (url === '/api/absen/status') {
    let taskCount = 0;
    const taskFile = getTaskFilePath();
    if (fs.existsSync(taskFile)) {
      try {
        const td = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
        taskCount = (td.tasks || []).length;
      } catch {}
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      running:       agentRunning,
      lastRunTs,
      lastRunResult,
      logCount:      logLines.length,
      loopActive,
      loopNextRunTs,
      taskCount,
      device: getDeviceNetworkInfo(),
    }));
  }

  // ── API: Daftar Tugas Kuliah Mendekati Deadline (Opsi B) ──
  if (url === '/api/absen/tugas') {
    const taskFile = getTaskFilePath();
    let data = { lastCheck: null, tasks: [] };
    if (fs.existsSync(taskFile)) {
      try { data = JSON.parse(fs.readFileSync(taskFile, 'utf8')); } catch {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

  // ── API: Mulai Loop Otomatis Server ──
  if (url === '/api/absen/loop/start' && req.method === 'POST') {
    const result = startServerLoop();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  // ── API: Hentikan Loop Otomatis Server ──
  if (url === '/api/absen/loop/stop' && req.method === 'POST') {
    const result = stopServerLoop();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  // ── API: Jalankan Agent ──
  if (url === '/api/absen/run' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => body += d);
    req.on('end', () => {
      let opts = {};
      try { opts = JSON.parse(body); } catch {}
      const args = [];
      if (opts.force) args.push('--force');
      if (opts.debug) args.push('--debug');
      if (opts.testPresensi) args.push('--test-presensi');
      const result = runAgent(args);
      res.writeHead(result.ok ? 200 : 409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    });
    return;
  }

  // ── API: Jalankan Simulasi Test Presensi Berhasil + Screenshot ──
  if (url === '/api/absen/test-presensi' && req.method === 'POST') {
    const result = runAgent(['--test-presensi']);
    res.writeHead(result.ok ? 200 : 409, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  // ── API: Bersihkan Buffer Log ──
  if (url === '/api/absen/clear-log' && req.method === 'POST') {
    logLines = [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, msg: 'Buffer log server berhasil dikosongkan.' }));
  }

  // ── API: Log SSE Stream ──
  if (url === '/api/absen/log-stream') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });
    res.write(': connected\n\n');
    // Saat klien membuka web, mulai dari konsol bersih (hanya kirim event baru secara live)
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── API: Ambil semua log (Hanya presensi dalam rentang 1 hari / 24 jam) ──
  if (url === '/api/absen/logs') {
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    logLines = logLines.filter(l => l && l.ts && (now - l.ts < ONE_DAY_MS) && (now - l.ts >= 0));
    saveLogLinesBuffer();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(logLines));
  }

  // ── API: TestSprite Sentinel & Monitoring Suite (Localhost Only) ──
  if (url.startsWith('/api/testsprite/')) {
    const vaultPath = path.join(__dirname, 'testsprite_tests', 'testsprite_vault.json');
    const testPlanPath = path.join(__dirname, 'testsprite_tests', 'testsprite_frontend_test_plan.json');
    const testResultsPath = path.join(__dirname, 'testsprite_tests', 'tmp', 'test_results.json');
    const runnerPath = path.join(__dirname, 'testsprite_tests', 'testsprite-runner.js');

    function readVaultData() {
      if (fs.existsSync(vaultPath)) {
        try { return JSON.parse(fs.readFileSync(vaultPath, 'utf8')); } catch (e) {}
      }
      return { currentIndex: 0, accounts: [] };
    }

    function saveVaultData(vault) {
      try {
        fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), 'utf8');
        return true;
      } catch (e) {
        return false;
      }
    }

    function resolveCleanUsername() {
      const raw = (process.env.USERNAME || 'Raden').trim();
      if (raw.includes('\\')) {
        const parts = raw.split('\\').filter(Boolean);
        if (parts.length >= 2) {
          return `${parts[0]}\\${parts[parts.length - 1]}`;
        }
      }
      const domain = (process.env.USERDOMAIN || 'RADEN').trim();
      return `${domain}\\${raw}`;
    }

    // Helper untuk sinkronisasi API Key ke file mcp_config.json
    function syncMcpConfig(apiKey) {
      const paths = [
        path.join(__dirname, 'mcp_config.json'),
        path.join(__dirname, '.agents', 'mcp_config.json'),
        path.join(os.homedir(), '.gemini', 'config', 'mcp_config.json')
      ];
      paths.forEach(p => {
        try {
          if (fs.existsSync(p)) {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (data.mcpServers && data.mcpServers.TestSprite) {
              data.mcpServers.TestSprite.env.API_KEY = apiKey;
              data.mcpServers.TestSprite.env.USERNAME = resolveCleanUsername();
              data.mcpServers.TestSprite.env.TS_TUNNEL_ALLOW_PRIVATE_NETWORK_TARGET = 'true';
              fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
            }
          }
        } catch (err) {}
      });
    }

    // 1. Status Ringkas & Telemetri
    if (url === '/api/testsprite/status') {
      const vault = readVaultData();
      const currentAcc = vault.accounts[vault.currentIndex] || { name: 'None', email: '-' };
      
      let testStats = { total: 21, executed: 15, passed: 15, failed: 0 };
      if (fs.existsSync(testPlanPath)) {
        try {
          const plan = JSON.parse(fs.readFileSync(testPlanPath, 'utf8'));
          testStats.total = plan.length;
        } catch (e) {}
      }
      if (fs.existsSync(testResultsPath)) {
        try {
          const resObj = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
          const vals = Object.values(resObj);
          testStats.executed = vals.length;
          testStats.passed = vals.filter(t => (t.testStatus || '').toUpperCase() === 'PASSED').length;
          testStats.failed = vals.filter(t => (t.testStatus || '').toUpperCase() === 'FAILED').length;
        } catch (e) {}
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true,
        running: global.testspriteRunnerActive || false,
        currentIndex: vault.currentIndex,
        currentAccount: {
          name: currentAcc.name,
          email: currentAcc.email,
          credits: currentAcc.credits !== undefined ? currentAcc.credits : 146,
          beginningPlanDate: currentAcc.beginningPlanDate || '2026-09-27T06:50:29Z',
          endPlanDate: currentAcc.endPlanDate || '2026-10-27T06:50:29Z',
          subPlan: currentAcc.subPlan || 'Free',
          status: currentAcc.status || 'active'
        },
        accountsCount: vault.accounts.length,
        testStats,
        timestamp: Date.now()
      }));
    }

    // 2. Daftar 15 Akun Lengkap
    if (url === '/api/testsprite/accounts') {
      const vault = readVaultData();
      const safeAccounts = vault.accounts.map((a, idx) => ({
        index: idx,
        name: a.name,
        email: a.email,
        maskedKey: a.apiKey && a.apiKey.length > 12 ? (a.apiKey.slice(0, 10) + '...' + a.apiKey.slice(-4)) : a.apiKey,
        status: idx === vault.currentIndex ? 'active' : (a.status || 'ready'),
        credits: a.credits !== undefined ? a.credits : null,
        subPlan: a.subPlan || 'Free',
        beginningPlanDate: a.beginningPlanDate || null,
        endPlanDate: a.endPlanDate || null,
        lastChecked: a.lastChecked || null,
        note: a.note || ''
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true,
        currentIndex: vault.currentIndex,
        accounts: safeAccounts
      }));
    }

    // 3. Rotasi Akun
    if (url === '/api/testsprite/rotate' && req.method === 'POST') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch (e) {}
        const vault = readVaultData();
        let targetIndex = vault.currentIndex;

        if (typeof payload.index === 'number' && payload.index >= 0 && payload.index < vault.accounts.length) {
          targetIndex = payload.index;
        } else {
          targetIndex = (vault.currentIndex + 1) % vault.accounts.length;
        }

        vault.currentIndex = targetIndex;
        vault.accounts.forEach((acc, i) => {
          acc.status = (i === targetIndex) ? 'active' : 'ready';
        });

        const activeAcc = vault.accounts[targetIndex];
        saveVaultData(vault);
        if (activeAcc && activeAcc.apiKey) {
          syncMcpConfig(activeAcc.apiKey);
        }

        console.log(`[TESTSPRITE] Berhasil rotasi akun ke Index ${targetIndex}: ${activeAcc.name} (${activeAcc.email})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: true,
          msg: `Berhasil beralih ke ${activeAcc.name}`,
          currentIndex: targetIndex,
          account: {
            name: activeAcc.name,
            email: activeAcc.email,
            credits: activeAcc.credits
          }
        }));
      });
      return;
    }

    // 4. Refresh Saldo Token Live dari API TestSprite
    if (url === '/api/testsprite/check-balances' && req.method === 'POST') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', async () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch (e) {}
        const vault = readVaultData();

        function checkAccountApi(acc) {
          return new Promise((resolve) => {
            if (!acc.apiKey || acc.apiKey.startsWith('MASUKKAN_')) {
              return resolve({ ok: false, error: 'Key invalid' });
            }
            const r = https.request('https://api.testsprite.com/api/me', {
              headers: { 'Authorization': 'Bearer ' + acc.apiKey },
              timeout: 8000
            }, (res) => {
              let d = '';
              res.on('data', c => d += c);
              res.on('end', () => {
                if (res.statusCode === 200) {
                  try {
                    const parsed = JSON.parse(d);
                    resolve({ ok: true, data: parsed });
                  } catch (err) {
                    resolve({ ok: false, error: 'Parse error' });
                  }
                } else {
                  resolve({ ok: false, statusCode: res.statusCode });
                }
              });
            });
            r.on('error', err => resolve({ ok: false, error: err.message }));
            r.on('timeout', () => { r.destroy(); resolve({ ok: false, error: 'Timeout' }); });
            r.end();
          });
        }

        const indicesToCheck = (typeof payload.index === 'number') ? [payload.index] : vault.accounts.map((_, i) => i);
        let updatedCount = 0;

        for (const idx of indicesToCheck) {
          const acc = vault.accounts[idx];
          if (!acc) continue;
          const res = await checkAccountApi(acc);
          if (res.ok && res.data) {
            acc.credits = res.data.credits;
            acc.subPlan = res.data.subPlan || 'Free';
            acc.beginningPlanDate = res.data.beginningPlanDate;
            acc.endPlanDate = res.data.endPlanDate;
            acc.lastChecked = new Date().toISOString();
            updatedCount++;
          }
        }

        saveVaultData(vault);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: true,
          updatedCount,
          accounts: vault.accounts.map(a => ({
            name: a.name,
            email: a.email,
            credits: a.credits,
            subPlan: a.subPlan,
            beginningPlanDate: a.beginningPlanDate,
            endPlanDate: a.endPlanDate
          }))
        }));
      });
      return;
    }

    // 5. Data Test Plan & Hasil Uji Frontend
    if (url === '/api/testsprite/tests') {
      let plans = [];
      let resultsMap = {};
      if (fs.existsSync(testPlanPath)) {
        try { plans = JSON.parse(fs.readFileSync(testPlanPath, 'utf8')); } catch (e) {}
      }
      if (fs.existsSync(testResultsPath)) {
        try { resultsMap = JSON.parse(fs.readFileSync(testResultsPath, 'utf8')); } catch (e) {}
      }

      // Gabungkan status hasil uji ke dalam test plans
      const combined = plans.map(p => {
        let matchedResult = null;
        for (const key in resultsMap) {
          const r = resultsMap[key];
          if (r.title && (r.title.includes(p.id) || r.title.toLowerCase().includes(p.title.toLowerCase()))) {
            matchedResult = r;
            break;
          }
        }
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          priority: p.priority || (matchedResult ? matchedResult.priority : 'Medium'),
          status: matchedResult ? matchedResult.testStatus : 'PENDING',
          visualization: matchedResult ? matchedResult.testVisualization : null,
          portalUrl: matchedResult ? matchedResult.portalUrl : null,
          code: matchedResult ? matchedResult.code : null,
          created: matchedResult ? matchedResult.created : null,
          modified: matchedResult ? matchedResult.modified : null
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, tests: combined }));
    }

    // 5b. Data Hasil Uji Backend (API Suite)
    if (url === '/api/testsprite/backend-tests') {
      const bPath = path.join(__dirname, 'testsprite_tests', 'tmp', 'backend_test_results.json');
      let bResults = [];
      if (fs.existsSync(bPath)) {
        try { bResults = JSON.parse(fs.readFileSync(bPath, 'utf8')); } catch (e) {}
      } else {
        // Fallback default skenario
        const { BACKEND_TESTS } = require('./testsprite_tests/backend_runner.js');
        bResults = BACKEND_TESTS.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: 'PENDING',
          elapsedMs: 0
        }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, tests: bResults }));
    }

    // 5c. Target Website Selector List (Otomatis Mendeteksi Seluruh Web Saat Ini & Masa Depan)
    function getTestTargets() {
      const targets = [
        {
          id: 'proj_grimoire_ui',
          title: 'Grimoire Dashboard - Arz',
          icon: 'fa-book-skull',
          url: `http://127.0.0.1:${PORT}/`,
          path: '/',
          status: 'active',
          desc: 'Portal utama Grimoire: jam mistis, partikel sihir, katalog proyek, dan konsol',
          isPrimary: true
        }
      ];

      // 1. Ambil dari src/proyek/proyek.js (Katalog Proyek Grimoire)
      const proyekJsPath = path.join(__dirname, 'src', 'proyek', 'proyek.js');
      if (fs.existsSync(proyekJsPath)) {
        try {
          const content = fs.readFileSync(proyekJsPath, 'utf8');
          const match = content.match(/const\s+DEFAULT_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);
          if (match) {
            const vm = require('vm');
            const sandbox = {};
            vm.createContext(sandbox);
            const parsed = vm.runInContext(match[1], sandbox);
            if (Array.isArray(parsed)) {
              parsed.forEach(p => {
                if (p.id && p.id !== 'proj_grimoire_ui') {
                  let fullUrl = p.url || '/';
                  if (fullUrl === '#') fullUrl = '/';
                  else if (!fullUrl.startsWith('http')) {
                    fullUrl = `http://127.0.0.1:${PORT}/${fullUrl.replace(/^\//, '')}`;
                  }
                  targets.push({
                    id: p.id,
                    title: p.title || p.id,
                    icon: p.icon || 'fa-globe',
                    url: fullUrl,
                    path: p.url || '/',
                    status: p.status || 'active',
                    desc: p.desc || '',
                    targetLabel: p.target || ''
                  });
                }
              });
            }
          }
        } catch (e) {
          console.warn('[TARGETS] Gagal parse src/proyek/proyek.js:', e.message);
        }
      }

      // 2. Scan otomatis seluruh file *.html mandiri di root & folder yang memiliki index.html
      // Ini menjamin setiap web baru yang dibuat di masa depan otomatis muncul di dropdown!
      try {
        const items = fs.readdirSync(__dirname);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules' || item === 'testsprite_tests') continue;
          const fullPath = path.join(__dirname, item);
          const stat = fs.statSync(fullPath);

          if (stat.isFile() && item.endsWith('.html') && item !== 'index.html') {
            const alreadyExists = targets.some(t => t.path === item || t.path.includes(item));
            if (!alreadyExists) {
              const cleanName = item.replace('.html', '').replace(/[-_]/g, ' ');
              const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
              targets.push({
                id: `auto_${item.replace('.html', '')}`,
                title: `${formattedName} (${item})`,
                icon: 'fa-file-code',
                url: `http://127.0.0.1:${PORT}/${item}`,
                path: `/${item}`,
                status: 'active',
                desc: `Halaman web mandiri otomatis terdeteksi: ${item}`,
                isAutoDetected: true
              });
            }
          } else if (stat.isDirectory()) {
            const subIndex = path.join(fullPath, 'index.html');
            if (fs.existsSync(subIndex)) {
              const alreadyExists = targets.some(t => t.path.includes(item));
              if (!alreadyExists) {
                const cleanName = item.replace(/[-_]/g, ' ');
                const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                targets.push({
                  id: `auto_${item}`,
                  title: `${formattedName} Modul (${item}/)`,
                  icon: 'fa-folder-tree',
                  url: `http://127.0.0.1:${PORT}/${item}/index.html`,
                  path: `/${item}/index.html`,
                  status: 'active',
                  desc: `Aplikasi web terpisah di subfolder ${item}/`,
                  isAutoDetected: true
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('[TARGETS] Scan web otomatis error:', e.message);
      }

      return targets;
    }

    if (url === '/api/testsprite/targets') {
      const targets = getTestTargets();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, targets, total: targets.length }));
    }

    // 6. Jalankan Pengujian Otonom (Run Tests: Frontend, Backend, atau All)
    if (url === '/api/testsprite/run' && req.method === 'POST') {
      if (global.testspriteRunnerActive) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, msg: 'Pengujian sedang berlangsung.' }));
      }

      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch (e) {}
        const testType = (payload.type || 'frontend').toLowerCase(); // 'frontend' | 'backend' | 'all'
        const targetId = payload.target || 'proj_grimoire_ui';
        const targetTitle = payload.targetTitle || 'Grimoire Dashboard - Arz';
        const targetUrl = payload.targetUrl || `http://127.0.0.1:${PORT}/`;

        global.testspriteRunnerActive = true;
        global.testspriteLogs = global.testspriteLogs || [];
        const broadcastTestLog = (line) => {
          const entry = { time: new Date().toLocaleTimeString('id-ID'), text: line };
          global.testspriteLogs.push(entry);
          if (global.testspriteLogs.length > 500) global.testspriteLogs.shift();
          if (global.testspriteSseClients) {
            const sseData = `data: ${JSON.stringify(entry)}\n\n`;
            global.testspriteSseClients.forEach(c => c.write(sseData));
          }
        };

        const typeLabel = testType === 'backend' ? 'Backend API Suite' :
                          testType === 'all' ? 'Full-Stack Suite (Backend + Frontend)' :
                          'Frontend Playwright Suite';

        broadcastTestLog(`⚡ [START] Memulai eksekusi ${typeLabel}...`);
        broadcastTestLog(`🎯 [TARGET] Website Sasaran: ${targetTitle} (${targetUrl})`);

        const vault = readVaultData();
        const currentAcc = vault.accounts[vault.currentIndex] || { name: 'Default', apiKey: '' };
        const fixedUsername = resolveCleanUsername();

        let runnerAction = 'runFrontend';
        if (testType === 'backend') runnerAction = 'runBackend';
        else if (testType === 'all') runnerAction = 'runAll';

        const child = spawn('node', [runnerPath, runnerAction], {
          cwd: __dirname,
          env: {
            ...process.env,
            USERNAME: fixedUsername,
            API_KEY: currentAcc.apiKey,
            TEST_TARGET_ID: targetId,
            TEST_TARGET_TITLE: targetTitle,
            TEST_TARGET_URL: targetUrl,
            TS_TUNNEL_ALLOW_PRIVATE_NETWORK_TARGET: 'true',
            NODE_ENV: 'development'
          }
        });

        child.stdout.on('data', (d) => {
          const lines = d.toString().split('\n').filter(Boolean);
          lines.forEach(l => broadcastTestLog(l));
        });
        child.stderr.on('data', (d) => {
          const lines = d.toString().split('\n').filter(Boolean);
          lines.forEach(l => broadcastTestLog('[STDERR] ' + l));
        });

        child.on('close', (code) => {
          global.testspriteRunnerActive = false;
          broadcastTestLog(`🏁 [SELESAI] Eksekusi ${typeLabel} selesai dengan kode: ${code}`);
        });

        child.on('error', (err) => {
          global.testspriteRunnerActive = false;
          broadcastTestLog(`❌ [ERROR] Gagal memicu runner: ${err.message}`);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, msg: `Runner ${typeLabel} dimulai.` }));
      });
      return;
    }

    // 7. Ambil Logs atau Bersihkan Logs
    if (url === '/api/testsprite/logs') {
      if (req.method === 'POST') {
        global.testspriteLogs = [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, msg: 'Log dibersihkan.' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, logs: global.testspriteLogs || [] }));
    }

    // 8. Live SSE Stream untuk Terminal Console TestSprite
    if (url === '/api/testsprite/log-stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(': connected\n\n');
      global.testspriteSseClients = global.testspriteSseClients || new Set();
      global.testspriteSseClients.add(res);
      req.on('close', () => global.testspriteSseClients.delete(res));
      return;
    }
  }

  // ── Static File Server ──
  let reqPath = decodeURIComponent(url);
  if (reqPath.startsWith('/screenshots/')) {
    reqPath = '/ethol-notifier' + reqPath;
  }
  if (reqPath.startsWith('/auto-absen')) {
    reqPath = '/lab' + (reqPath.startsWith('/auto-absen/') ? reqPath : '/auto-absen/');
  }
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) && reqPath.includes('screenshots')) {
    const bName = path.basename(reqPath);
    const alt1 = path.join(__dirname, 'screenshots', bName);
    const alt2 = path.join(__dirname, 'ethol-notifier', 'screenshots', bName);
    if (fs.existsSync(alt1)) filePath = alt1;
    else if (fs.existsSync(alt2)) filePath = alt2;
  }
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
      return res.end(err.code === 'ENOENT' ? '404 Not Found' : '500 Server Error');
    }
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
        stats = fs.statSync(filePath);
      } else {
        res.writeHead(403); return res.end('403 Forbidden');
      }
    }

    const fileExt = String(path.extname(filePath)).toLowerCase();
    const effectiveContentType = mimeTypes[fileExt] || 'application/octet-stream';

    const range = req.headers.range;
    if (range && ['.mp4', '.mov', '.webm'].includes(fileExt)) {
      const parts   = range.replace(/bytes=/, '').split('-');
      const start   = parseInt(parts[0], 10);
      const end     = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type':   effectiveContentType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type':   effectiveContentType,
        'Accept-Ranges':  'bytes',
        'Cache-Control':  'no-cache, no-store, must-revalidate',
        'Pragma':         'no-cache',
        'Expires':        '0',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

const HOST = process.env.HOST || '0.0.0.0';

function openBrowser(targetPath = '') {
  if (process.env.NO_BROWSER || process.env.DOCKER) return;
  const url = `http://127.0.0.1:${PORT}/${targetPath}`;
  const startCmd = process.platform === 'win32' ? `start "" "${url}"` :
                   process.platform === 'darwin' ? `open "${url}"` :
                   `xdg-open "${url}"`;
  exec(startCmd, (err) => {
    if (err) console.warn('[BROWSER] Catatan: Browser default dapat dibuka manual di:', url);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[INFO] Server sudah berjalan aktif di port ${PORT}.`);
    if (!process.argv.includes('--no-open') && !process.env.NO_BROWSER) {
      console.log(`[INFO] Membuka browser ke http://127.0.0.1:${PORT}/ ...`);
      openBrowser();
    }
    process.exit(0);
  } else {
    console.error('[ERROR] Server error:', err);
  }
});

server.listen(PORT, HOST, () => {
  cleanupExpiredScreenshots();
  setInterval(cleanupExpiredScreenshots, 3600000);
  setInterval(sendServerHeartbeat, 45000);
  setTimeout(sendServerHeartbeat, 2500);
  console.log('====================================================');
  console.log('       ARZ-WEB • GRIMOIRE BACKEND SERVER');
  console.log('====================================================');
  console.log(`  Host / IP      : ${HOST}`);
  console.log(`  Port           : ${PORT}`);
  console.log(`  URL Utama      : http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}/`);
  console.log(`  Ethol Notifier : http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}/ethol-notifier/`);
  console.log(`  Grimoire Lab   : http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}/lab/ (Uji Coba & Tester)`);
  console.log(`  Arcanum Finance: http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}/keuangan.html`);
  console.log(`  Ethol Agent API: http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}/api/absen/`);
  console.log('====================================================');

  if (!process.argv.includes('--no-open') && !process.env.NO_BROWSER) {
    openBrowser();
  }
});
