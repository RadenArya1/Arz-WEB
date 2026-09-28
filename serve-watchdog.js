/**
 * ============================================================
 *  ARZ-WEB: SELF-HEALING SERVER WATCHDOG (SUPERVISOR)
 *  Memastikan serve.js selalu hidup, otomatis restart jika crash,
 *  dan memantau respon HTTP secara berkala (liveness ping).
 * ============================================================
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, 'serve.js');
const PING_INTERVAL_MS = 25000;
const MAX_FAIL_COUNT = 3;
const RESTART_COOLDOWN_MS = 1500;

let child = null;
let consecutiveFailures = 0;
let isShuttingDown = false;
let restartTimer = null;

function log(msg) {
  const ts = new Date().toLocaleTimeString('id-ID');
  console.log(`[WATCHDOG ${ts}] ${msg}`);
}

function startChild() {
  if (isShuttingDown) return;

  log('Memulai instance server serve.js...');
  child = spawn(process.execPath, [SCRIPT_PATH, '--no-open'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('error', (err) => {
    log(`Gagal memulai child process: ${err.message}`);
    scheduleRestart();
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    log(`serve.js keluar dengan exit code: ${code}, sinyal: ${signal || 'none'}.`);
    scheduleRestart();
  });
}

function scheduleRestart() {
  if (isShuttingDown) return;
  if (restartTimer) clearTimeout(restartTimer);
  log(`Menjadwalkan auto-restart dalam ${RESTART_COOLDOWN_MS / 1000} detik...`);
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startChild();
  }, RESTART_COOLDOWN_MS);
}

function checkLiveness() {
  if (!child || isShuttingDown) return;

  const req = http.get('http://127.0.0.1:8080/api/absen/ping', { timeout: 5000 }, (res) => {
    if (res.statusCode === 200) {
      consecutiveFailures = 0;
    } else {
      handlePingFailure(`HTTP status ${res.statusCode}`);
    }
  });

  req.on('timeout', () => {
    req.destroy();
    handlePingFailure('Connection timeout (5s)');
  });

  req.on('error', (err) => {
    handlePingFailure(err.message);
  });
}

function handlePingFailure(reason) {
  consecutiveFailures++;
  log(`Peringatan: Ping liveness gagal (${consecutiveFailures}/${MAX_FAIL_COUNT}) - Alasan: ${reason}`);

  if (consecutiveFailures >= MAX_FAIL_COUNT) {
    log('Server hang atau tidak merespons! Mematikan dan merestart instance...');
    consecutiveFailures = 0;
    if (child) {
      try {
        child.kill('SIGKILL');
      } catch (_) {}
    }
  }
}

// ── Penanganan Shutdown Bersih ──
function cleanExit() {
  isShuttingDown = true;
  log('Menghentikan watchdog supervisor...');
  if (restartTimer) clearTimeout(restartTimer);
  if (child) {
    try {
      child.kill('SIGTERM');
    } catch (_) {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

// ── Inisialisasi ──
log('Self-Healing Watchdog aktif.');
startChild();
setInterval(checkLiveness, PING_INTERVAL_MS);
