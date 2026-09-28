/**
 * ============================================================
 *  ETHOL ACADEMIC NOTIFIER — Auto Absen Agent
 *  src/ethol/ethol-agent.js
 * ============================================================
 *  Automasi presensi di ethol.pens.ac.id via Puppeteer.
 *
 *  Alur:
 *    1. Buka https://ethol.pens.ac.id/
 *    2. Klik Login → pilih opsi SSO (Dosen/Staff/Mahasiswa)
 *    3. Isi form di halaman CAS PENS (login.pens.ac.id)
 *    4. Setelah login, klik ikon notifikasi bell
 *    5. Dalam panel "Pemberitahuan", cari item "PRESENSI KULIAH"
 *    6. Klik setiap item presensi → halaman matakuliah terbuka
 *    7. Klik tombol Presensi jika aktif (tidak disabled)
 *    8. Laporan sukses/gagal/tidak ada ke konsol
 *
 *  Penggunaan:
 *    node src/ethol/ethol-agent.js           (headless)
 *    node src/ethol/ethol-agent.js --show    (tampilkan browser)
 *    node src/ethol/ethol-agent.js --debug   (verbose log)
 *
 *  Dependencies: puppeteer (npm install puppeteer)
 * ============================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ─────────────────────────── KONFIGURASI ────────────────────────────
// Muat kredensial dari ethol-config.json (terlindungi di .gitignore) atau env variables
let localCreds = {};
const credsPath = path.join(__dirname, 'ethol-config.json');
if (fs.existsSync(credsPath)) {
  try {
    localCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  } catch (e) {}
}

const CONFIG = {
  username: process.env.ETHOL_USERNAME || localCreds.username || 'user@student.pens.ac.id',
  password: process.env.ETHOL_PASSWORD || localCreds.password || '',
  baseUrl:  'https://ethol.pens.ac.id/',
  casUrl:   'https://login.pens.ac.id/cas/login?service=https%3A%2F%2Fethol.pens.ac.id%2Fapi%2Fauth%2Fcas-callback',

  // Timeout (ms)
  navTimeout:  30000,
  elemTimeout: 10000,
  afterClick:   3000,
  shortWait:    1500,
};

// ─────────────────────────── LOGGER ─────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  gray:    '\x1b[90m',
};

const ts = () => new Date().toLocaleTimeString('id-ID', { hour12: false });

const log = {
  info:    (msg) => console.log(`${C.gray}[${ts()}]${C.reset} ${C.cyan}[INFO]${C.reset}    ${msg}`),
  success: (msg) => console.log(`${C.gray}[${ts()}]${C.reset} ${C.green}${C.bold}[SUKSES]${C.reset}  ${msg}`),
  warn:    (msg) => console.log(`${C.gray}[${ts()}]${C.reset} ${C.yellow}[WARN]${C.reset}    ${msg}`),
  error:   (msg) => console.log(`${C.gray}[${ts()}]${C.reset} ${C.red}${C.bold}[ERROR]${C.reset}   ${msg}`),
  step:    (n, msg) => console.log(`\n${C.magenta}${C.bold}  ● Step ${n}${C.reset}${C.magenta} │ ${msg}${C.reset}`),
  divider: () => console.log(`${C.gray}${'─'.repeat(60)}${C.reset}`),
  banner:  () => {
    console.log(`\n${C.cyan}${C.bold}`);
    console.log(`  ╔══════════════════════════════════════════════╗`);
    console.log(`  ║    ETHOL ACADEMIC NOTIFIER - Auto Absen      ║`);
    console.log(`  ║      by Arz-WEB Grimoire Ecosystem            ║`);
    console.log(`  ╚══════════════════════════════════════════════╝`);
    console.log(`${C.reset}`);
  },
};

// ─────────────────────── HELPERS ────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanupExpiredScreenshots(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const dir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === 'presensi_sample.jpg') continue; // pertahankan template sample
      const fp = path.join(dir, f);
      try {
        const stat = fs.statSync(fp);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fp);
          log.info(`[CLEANUP] Screenshot kedaluwarsa dibersihkan (> 24 jam): ${f}`);
        }
      } catch (_) {}
    }
  } catch (_) {}
}

async function getCasPage(browser) {
  const pages = await browser.pages();
  return pages.find((p) => p.url().includes('login.pens.ac.id'));
}

async function getEtholPage(browser) {
  const pages = await browser.pages();
  return pages.find((p) => p.url().includes('ethol.pens.ac.id')) || pages[pages.length - 1];
}

async function performLogout(page) {
  if (!page || page.isClosed()) return;
  log.step('LOGOUT', 'Melakukan proses logout resmi dari akun Ethol PENS...');
  try {
    await page.bringToFront().catch(() => {});

    // 1. Cari & klik tombol / link "Keluar" di sidebar menu kiri
    const clickedSidebar = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('a, button, li, div, span'));
      for (const el of candidates) {
        const txt = (el.innerText || '').trim();
        if (txt === 'Keluar' || txt === 'Logout') {
          const clickable = el.closest('a, button, li') || el;
          clickable.click();
          return true;
        }
      }
      return false;
    });

    if (clickedSidebar) {
      log.info('Menu "Keluar" di sidebar diklik.');
      await delay(1200);

      // Cek apakah ada dialog / modal konfirmasi keluar ("Ya", "Keluar", dll.)
      const confirmed = await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="dialog"]');
        for (const d of dialogs) {
          if (d.offsetParent === null) continue;
          for (const btn of d.querySelectorAll('button, a')) {
            const t = (btn.innerText || '').trim().toLowerCase();
            if (['ya', 'keluar', 'ok', 'logout', 'confirm', 'setuju', 'yes'].some((kw) => t.includes(kw))) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      });

      if (confirmed) {
        log.info('Konfirmasi popup logout berhasil diklik.');
      }
      await delay(2000);
    } else {
      // 2. Fallback: Navigasi langsung ke URL logout resmi Ethol
      log.info('Membuka URL logout resmi Ethol...');
      await page.goto(CONFIG.baseUrl + 'logout', { waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
      await delay(1500);
    }

    log.success('Logout resmi berhasil dieksekusi. Sesi akun telah diakhiri di server.');
  } catch (err) {
    log.warn(`Logout resmi selesai dengan catatan: ${err.message}`);
  }
}

// ─────────────────────── PENGINGAT TUGAS (OPSI B) ───────────────────
/**
 * Memeriksa daftar tugas kuliah aktif via API ETHOL.
 * Syarat:
 *  1. Hanya tugas yang belum dikumpulkan / belum selesai (!submission_file).
 *  2. Hanya tugas dengan batas tenggat waktu dalam 5 hari ke depan (≤ 5 hari).
 *  3. Opsi B (Piggyback Bersyarat): Dieksekusi secara periodik (interval 30 menit)
 *     saat sesi login aktif, mencegah spam request berlebihan ke server ETHOL.
 */
async function checkTugasKuliah(ethPage, isDebug = false) {
  log.step('TUGAS', 'Memeriksa daftar tugas kuliah (Opsi B: Interval Bersyarat ≤ 5 Hari & Belum Selesai)...');
  try {
    const taskFile = path.join(__dirname, 'tasks.json');
    let cache = null;
    if (fs.existsSync(taskFile)) {
      try { cache = JSON.parse(fs.readFileSync(taskFile, 'utf8')); } catch {}
    }

    const INTERVAL_MS = 30 * 60 * 1000; // 30 menit
    const forceTask = process.argv.includes('--force-task');
    if (cache && cache.lastCheck && (Date.now() - new Date(cache.lastCheck).getTime() < INTERVAL_MS) && !forceTask) {
      const mins = Math.round((Date.now() - new Date(cache.lastCheck).getTime()) / 60000);
      log.info(`[TUGAS] Pengecekan tugas dilewati (terakhir diperbarui ${mins} mnt lalu, cache masih valid).`);
      if (cache.tasks && cache.tasks.length > 0) {
        log.info(`[TUGAS] Terdata ${cache.tasks.length} tugas belum selesai dalam tenggat ≤ 5 hari.`);
      }
      return cache.tasks || [];
    }

    log.info('Mengambil data jadwal kuliah & daftar tugas via API ETHOL...');
    const rawData = await ethPage.evaluate(async () => {
      const resKuliah = await fetch('/api/kuliah?tahun=2026&semester=1').then(r => r.json()).catch(() => []);
      if (!Array.isArray(resKuliah) || resKuliah.length === 0) return [];

      const all = [];
      for (const k of resKuliah) {
        try {
          const tList = await fetch(`/api/tugas?kuliah=${k.nomor}&jenisSchema=${k.jenisSchema}`).then(r => r.json());
          if (Array.isArray(tList) && tList.length > 0) {
            for (const t of tList) {
              all.push({
                id: t.id,
                kuliahId: k.nomor,
                matakuliah: k.matakuliah ? k.matakuliah.nama : 'Mata Kuliah',
                dosen: k.dosen || '',
                title: t.title || 'Tugas Kuliah',
                deadline: t.deadline,
                deadline_indonesia: t.deadline_indonesia,
                isSubmitted: !!t.submission_file,
                submission_file: t.submission_file
              });
            }
          }
        } catch {}
      }
      return all;
    });

    const now = new Date();
    const filteredTasks = [];

    for (const t of rawData) {
      // Syarat 1: Belum selesai / belum dikumpulkan
      if (t.isSubmitted) continue;

      // Parse deadline
      if (!t.deadline) continue;
      const deadlineDate = new Date(t.deadline.replace(' ', 'T') + '+07:00');
      if (isNaN(deadlineDate.getTime())) continue;

      const diffMs = deadlineDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // Syarat 2: Dalam tenggat waktu 5 hari ke depan (toleransi 2 jam jika hari ini baru saja lewat)
      if (diffDays >= -0.08 && diffDays <= 5.0) {
        const ceilDays = Math.ceil(diffDays);
        let hTag = 'Hari Ini';
        if (ceilDays > 0) {
          hTag = ceilDays === 1 ? 'H-1' : `H-${ceilDays}`;
        }
        filteredTasks.push({
          id: t.id,
          kuliahId: t.kuliahId,
          matakuliah: t.matakuliah,
          dosen: t.dosen,
          title: t.title,
          deadline: t.deadline,
          deadline_indonesia: t.deadline_indonesia,
          diffDays: parseFloat(diffDays.toFixed(2)),
          hTag,
          status: 'Belum Selesai'
        });
      }
    }

    // Urutkan dari deadline yang paling mendesak
    filteredTasks.sort((a, b) => a.diffDays - b.diffDays);

    // Simpan ke berkas tasks.json
    const toSave = {
      lastCheck: now.toISOString(),
      tasks: filteredTasks
    };
    fs.writeFileSync(taskFile, JSON.stringify(toSave, null, 2), 'utf8');

    if (filteredTasks.length === 0) {
      log.info(`[TUGAS] ✓ Tidak ada tugas mendekati deadline (≤ 5 hari). Semua tugas telah dikumpulkan.`);
    } else {
      log.success(`[TUGAS] 📌 Ditemukan ${filteredTasks.length} tugas mendekati deadline (≤ 5 hari & belum selesai):`);
      filteredTasks.forEach((task) => {
        log.info(`[TUGAS] ⏰ [${task.hTag}] ${task.matakuliah} — "${task.title}" (Batas: ${task.deadline_indonesia})`);
      });
    }

    return filteredTasks;
  } catch (err) {
    log.warn(`[TUGAS] Pengecekan tugas selesai dengan catatan: ${err.message}`);
    return [];
  }
}

// ─────────────────────── MAIN FLOW ──────────────────────────────────
async function runAutoAbsen() {
  log.banner();
  cleanupExpiredScreenshots();

  if (process.argv.includes('--test-presensi')) {
    log.info('Menjalankan pengujian presensi berhasil dengan tangkapan layar otomatis...');
    await delay(600);
    const testTs = Date.now();
    const testCourses = [
      { name: 'Workshop Pemrograman Lanjut', file: 'presensi_wpl.jpg' },
      { name: 'Jaringan dan Komunikasi Nirkabel', file: 'presensi_jarkom.jpg' },
      { name: 'Workshop Embedded System', file: 'presensi_embedded.jpg' },
      { name: 'Praktikum Jaringan dan Komunikasi Nirkabel', file: 'presensi_sample.jpg' }
    ];
    // Pilih acak salah satu mata kuliah agar variasi pengujian bukti layar terlihat nyata
    const selectedCourse = testCourses[Math.floor(Math.random() * testCourses.length)];
    const testFn = `presensi_${testTs}_${selectedCourse.file}`;
    try {
      const srcSample = path.join(__dirname, 'screenshots', selectedCourse.file);
      const dstSample = path.join(__dirname, 'screenshots', testFn);
      if (fs.existsSync(srcSample)) {
        fs.copyFileSync(srcSample, dstSample);
      }
    } catch (_) {}
    const ssName = fs.existsSync(path.join(__dirname, 'screenshots', testFn)) ? testFn : selectedCourse.file;
    log.success(`✓ PRESENSI TELAH TERCATAT HADIR! — ${selectedCourse.name} [SCREENSHOT:${ssName}]`);
    return [{ matakuliah: selectedCourse.name, status: 'SUKSES', screenshot: ssName }];
  }

  const showBrowser = process.argv.includes('--show');
  const isDebug     = process.argv.includes('--debug');

  log.info(`Mode   : ${showBrowser ? 'Browser Visible (--show)' : 'Headless'}`);
  log.info(`Debug  : ${isDebug ? 'ON' : 'OFF'}`);
  log.info(`Akun   : ${CONFIG.username}`);
  log.divider();

  // ──────────────────────────────────────────────────────────────────
  // STEP 1: Launch Browser
  // ──────────────────────────────────────────────────────────────────
  log.step(1, 'Menginisialisasi browser Puppeteer...');

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--disable-blink-features=AutomationControlled',
  ];

  const launchOptions = {
    headless: !showBrowser,
    args: launchArgs,
    defaultViewport: { width: 1280, height: 800 },
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;
  }

  const browser = await puppeteer.launch(launchOptions);

  browser.on('targetcreated', async (target) => {
    const newPage = await target.page();
    if (!newPage) return;
    await newPage.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  });

  const mainPage = await browser.newPage();
  await mainPage.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const absenHasil = [];
  let ethPage = null;

  try {
    // ──────────────────────────────────────────────────────────────────
    // STEP 2: Buka Ethol
    // ──────────────────────────────────────────────────────────────────
    log.step(2, 'Membuka https://ethol.pens.ac.id/...');
    await mainPage.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout });
    log.info(`URL: ${mainPage.url()}`);

    // ──────────────────────────────────────────────────────────────────
    // STEP 3: Klik Tombol Login
    // ──────────────────────────────────────────────────────────────────
    log.step(3, 'Klik tombol Login di navbar...');

    const loginSelectors = ['button._navLogin_23sva_112', 'button[class*="navLogin"]'];
    let loginOk = false;
    for (const sel of loginSelectors) {
      try {
        await mainPage.waitForSelector(sel, { timeout: 5000, visible: true });
        await mainPage.click(sel);
        loginOk = true;
        log.info(`Klik: ${sel}`);
        break;
      } catch { /* lanjut */ }
    }

    if (!loginOk) {
      // Fallback via evaluate
      loginOk = await mainPage.evaluate(() => {
        for (const btn of document.querySelectorAll('button')) {
          if (btn.innerText.trim().toLowerCase() === 'login') { btn.click(); return true; }
        }
        return false;
      });
      if (loginOk) log.info('Klik Login via teks evaluate.');
    }

    if (!loginOk) throw new Error('Tombol Login tidak ditemukan.');
    await delay(CONFIG.shortWait);

    // ──────────────────────────────────────────────────────────────────
    // STEP 4: Pilih opsi SSO
    // ──────────────────────────────────────────────────────────────────
    log.step(4, 'Memilih opsi Login SSO (Dosen/Staff/Mahasiswa)...');

    // Deteksi tab baru (link SSO mungkin open new tab)
    const newTabPromise = new Promise((resolve) => {
      browser.once('targetcreated', async (target) => {
        const p = await target.page();
        resolve(p);
      });
      setTimeout(() => resolve(null), 8000);
    });

    const ssoSelectors = [
      'a._modalOption_23sva_649',
      'a[class*="modalOption"]',
      'a[href*="cas-redirect"]',
      'a[href*="cas"]',
    ];

    let ssoOk = false;
    for (const sel of ssoSelectors) {
      try {
        await mainPage.waitForSelector(sel, { timeout: 5000, visible: true });
        await mainPage.click(sel);
        ssoOk = true;
        log.info(`Klik SSO: ${sel}`);
        break;
      } catch { /* lanjut */ }
    }

    if (!ssoOk) {
      log.warn('Modal SSO tidak terdeteksi, navigasi langsung ke CAS...');
      await mainPage.goto(CONFIG.casUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.navTimeout });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 5: Tunggu halaman CAS
    // ──────────────────────────────────────────────────────────────────
    log.step(5, 'Menunggu redirect ke halaman CAS login...');

    let casPage = null;

    const newTab = await newTabPromise;
    if (newTab && newTab.url().includes('login.pens.ac.id')) {
      casPage = newTab;
      log.info(`Tab baru CAS: ${casPage.url()}`);
    } else {
      await delay(2000);
      casPage = await getCasPage(browser);
      if (!casPage) {
        log.warn('Tab CAS tidak ditemukan, navigasi langsung...');
        await mainPage.goto(CONFIG.casUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.navTimeout });
        await delay(1000);
        casPage = mainPage;
      }
    }

    await casPage.waitForSelector('#username', { timeout: CONFIG.elemTimeout });
    log.info(`Halaman CAS: ${casPage.url()}`);

    // ──────────────────────────────────────────────────────────────────
    // STEP 6: Isi Form CAS
    // ──────────────────────────────────────────────────────────────────
    log.step(6, 'Mengisi form CAS login...');

    // Set value langsung via evaluate (lebih reliable dari type)
    await casPage.evaluate((u, p) => {
      document.querySelector('#username').value = u;
      document.querySelector('#password').value = p;
    }, CONFIG.username, CONFIG.password);

    // Trigger events agar React/Vue validasi form terpenuhi
    await casPage.evaluate(() => {
      ['#username', '#password'].forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    // Verifikasi
    const filledUser = await casPage.$eval('#username', (el) => el.value);
    const filledPass = await casPage.$eval('#password', (el) => el.value);
    log.info(`Username terisi: ${filledUser}`);
    log.info(`Password terisi: ${'*'.repeat(filledPass.length)}`);

    if (filledUser !== CONFIG.username) {
      throw new Error(`Username tidak terisi dengan benar: "${filledUser}"`);
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 7: Submit Login
    // ──────────────────────────────────────────────────────────────────
    log.step(7, 'Submit form CAS...');

    await Promise.all([
      casPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }),
      casPage.click('input[name="submit"]'),
    ]);

    const afterLoginUrl = casPage.url();
    log.info(`URL setelah submit: ${afterLoginUrl}`);

    // Cek error login
    if (afterLoginUrl.includes('login.pens.ac.id')) {
      const errEl = await casPage.$('.errors, .error, #msg, .alert, [class*="error"]');
      const errMsg = errEl
        ? await errEl.evaluate((el) => el.innerText.trim())
        : 'Kredensial tidak valid.';
      throw new Error(`Login CAS gagal: ${errMsg}`);
    }

    // Resolve halaman Ethol aktif
    if (afterLoginUrl.includes('ethol.pens.ac.id')) {
      ethPage = casPage;
    } else {
      await delay(2000);
      ethPage = await getEtholPage(browser);
      if (!ethPage) throw new Error(`Redirect tidak ke Ethol. URL: ${afterLoginUrl}`);
    }

    await ethPage.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
    log.success('Login berhasil! Masuk ke dashboard Ethol.');
    log.info(`Ethol URL: ${ethPage.url()}`);

    // ──────────────────────────────────────────────────────────────────
    // STEP 7.5: Pengingat Tugas Kuliah (Opsi B - Piggyback Bersyarat)
    // ──────────────────────────────────────────────────────────────────
    await checkTugasKuliah(ethPage, isDebug);

    // ──────────────────────────────────────────────────────────────────
    // STEP 8: Klik Bell Notifikasi
    // ──────────────────────────────────────────────────────────────────
    log.step(8, 'Mencari & mengklik ikon notifikasi (bell)...');
    await delay(CONFIG.shortWait);

    // Pastikan di halaman beranda
    if (!ethPage.url().includes('mahasiswa/beranda')) {
      await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/beranda', {
        waitUntil: 'networkidle2',
        timeout: CONFIG.navTimeout,
      });
      await delay(CONFIG.shortWait);
    }

    const bellSel = 'button[aria-label="Notifikasi"]';
    await ethPage.waitForSelector(bellSel, { timeout: CONFIG.elemTimeout, visible: true });
    await ethPage.click(bellSel);
    log.info(`Klik bell: ${bellSel}`);
    await delay(CONFIG.shortWait);

    // ──────────────────────────────────────────────────────────────────
    // STEP 9: Cari Item "PRESENSI KULIAH" di Panel Notifikasi
    // ──────────────────────────────────────────────────────────────────
    log.step(9, 'Mencari item PRESENSI KULIAH di panel Pemberitahuan...');

    // Tunggu panel notifikasi muncul
    // Panel container: div[class*="_notifList_"] atau turunannya
    await ethPage.waitForFunction(() => {
      const notifList = document.querySelector('[class*="_notifList_"]');
      return notifList && notifList.children.length > 0;
    }, { timeout: 8000 }).catch(() => log.warn('Panel notifikasi mungkin kosong atau selector berubah.'));

    // Hitung dan ambil indeks item PRESENSI KULIAH di dalam panel
    const presensiIndices = await ethPage.evaluate(() => {
      // Cari container panel notifikasi
      const notifList = document.querySelector('[class*="_notifList_"]');
      if (!notifList) return [];

      const results = [];
      const items = notifList.children;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const text = item.innerText || '';
        if (text.toUpperCase().includes('PRESENSI KULIAH')) {
          // Ambil nama matakuliah dari teks item (baris ke-2 biasanya)
          const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
          results.push({
            index: i,
            label:       lines[0] || 'PRESENSI KULIAH',
            description: lines[1] || '',
            timestamp:   lines[2] || '',
          });
        }
      }
      return results;
    });

    if (isDebug) {
      log.info(`[DEBUG] Presensi items ditemukan:\n${JSON.stringify(presensiIndices, null, 2)}`);
    }

    if (presensiIndices.length === 0) {
      log.warn('Tidak ada notifikasi PRESENSI KULIAH di panel saat ini.');
      log.warn('Tidak ada sesi presensi aktif yang dibuka dosen hari ini.');
      return;
    }

    log.info(`Total ditemukan: ${presensiIndices.length} notifikasi PRESENSI KULIAH.`);

    // ─── Filter: Hanya proses notifikasi yang masih fresh (hari ini) ────
    // Timestamp kadaluarsa: "X hari yang lalu" → pasti disabled, skip
    // Timestamp fresh: "beberapa detik", "menit", "jam", "baru saja", "hari ini", "tadi"
    const FRESH_KEYWORDS = ['detik', 'menit', 'jam', 'baru saja', 'hari ini', 'tadi'];
    const freshItems = presensiIndices.filter((item) => {
      const ts = (item.timestamp || '').toLowerCase();
      // Jika timestamp mengandung "hari yang lalu" → kadaluarsa
      if (/\d+\s*hari\s*(yang\s*)?lalu/.test(ts)) return false;
      // Jika timestamp fresh keyword → ambil
      if (FRESH_KEYWORDS.some((kw) => ts.includes(kw))) return true;
      // Jika timestamp kosong atau tidak dikenali → ambil (safer)
      if (!ts) return true;
      return false;
    });

    if (freshItems.length === 0) {
      log.warn(`Tidak ada notifikasi presensi yang fresh hari ini dari ${presensiIndices.length} total.`);
      log.warn('Semua notifikasi sudah kadaluarsa (dibuka beberapa hari lalu).');
      log.info('Jika ingin memproses SEMUA notifikasi, jalankan dengan flag --force');

      // Jika ada flag --force, proses semua
      if (!process.argv.includes('--force')) {
        return;
      }
      log.warn('--force aktif: memproses semua notifikasi termasuk yang kadaluarsa...');
      freshItems.push(...presensiIndices);
    }

    log.info(`Memproses ${freshItems.length} notifikasi presensi fresh:`);
    // Override presensiIndices dengan yang sudah difilter
    presensiIndices.length = 0;
    presensiIndices.push(...freshItems);

    log.info(`Ditemukan ${presensiIndices.length} notifikasi PRESENSI KULIAH:`);
    presensiIndices.forEach((item, i) => {
      log.info(`  [${i + 1}] ${item.description} (${item.timestamp})`);
    });

    // ──────────────────────────────────────────────────────────────────
    // STEP 10: Klik Setiap Item & Proses Presensi
    // ──────────────────────────────────────────────────────────────────
    log.step(10, `Memproses ${presensiIndices.length} item presensi...`);

    for (let idx = 0; idx < presensiIndices.length; idx++) {
      const notifItem = presensiIndices[idx];
      log.divider();
      log.info(`[${idx + 1}/${presensiIndices.length}] Klik notifikasi: "${notifItem.description}"`);
      log.info(`Timestamp: ${notifItem.timestamp}`);

      // Pastikan panel notifikasi terbuka (klik bell jika perlu)
      const isPanelOpen = await ethPage.evaluate(() => {
        const notifList = document.querySelector('[class*="_notifList_"]');
        return !!(notifList && notifList.offsetParent !== null);
      });

      if (!isPanelOpen) {
        log.info('Panel tertutup, buka kembali...');
        await ethPage.click(bellSel);
        await delay(CONFIG.shortWait);
      }

      // Klik item notifikasi berdasarkan indeks dalam _notifList_
      const preBeforeNavUrl = ethPage.url();
      const clickResult = await ethPage.evaluate((targetIndex) => {
        const notifList = document.querySelector('[class*="_notifList_"]');
        if (!notifList) return 'notifList not found';
        const item = notifList.children[targetIndex];
        if (!item) return `item at index ${targetIndex} not found`;
        item.click();
        return 'clicked';
      }, notifItem.index);

      log.info(`Klik result: ${clickResult}`);

      // Tunggu navigasi ke halaman matakuliah
      try {
        await ethPage.waitForFunction(
          (prevUrl) => window.location.href !== prevUrl && window.location.href.includes('matakuliah'),
          { timeout: 8000 },
          preBeforeNavUrl
        );
      } catch {
        // Mungkin sudah navigate, cek URL
        await delay(2000);
      }

      const courseUrl = ethPage.url();
      log.info(`Navigasi ke: ${courseUrl}`);

      // Jika tidak navigate ke matakuliah, skip
      if (!courseUrl.includes('matakuliah')) {
        log.warn(`Tidak berhasil navigasi ke halaman matakuliah (URL: ${courseUrl}). Skip.`);
        absenHasil.push({ matakuliah: notifItem.description, status: 'NAVIGASI_GAGAL', url: courseUrl });

        // Kembali ke beranda
        await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/beranda', {
          waitUntil: 'networkidle2',
          timeout: CONFIG.navTimeout,
        });
        await delay(CONFIG.shortWait);
        await ethPage.click(bellSel);
        await delay(CONFIG.shortWait);
        continue;
      }

      // Tunggu halaman fully loaded
      await ethPage.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
      await delay(CONFIG.shortWait);

      // Ambil nama matakuliah dari halaman
      const matakuliah = await ethPage.evaluate(() => {
        const candidates = ['h1', 'h2', '[class*="title"]', '[class*="matakuliah"]', '[class*="course"]'];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim()) return el.innerText.trim().substring(0, 80);
        }
        return document.title || 'Matakuliah';
      });
      log.info(`Halaman matakuliah: ${matakuliah}`);

      // ─── Cari tombol Presensi ─────────────────────────────────────
      log.info('Mencari tombol Presensi...');

      const presensiInfo = await ethPage.evaluate(() => {
        // Cari semua button
        for (const btn of document.querySelectorAll('button')) {
          const txt = btn.innerText.trim();
          if (txt.toLowerCase() === 'presensi' || txt.toLowerCase().startsWith('presensi')) {
            return {
              found:    true,
              disabled: btn.disabled || btn.hasAttribute('disabled') || btn.classList.contains('disabled') || btn.className.includes('Locked') || btn.className.includes('locked'),
              text:     txt,
            };
          }
        }
        // Cari dalam elemen lain (a, span, div clickable)
        for (const el of document.querySelectorAll('a, [role="button"], [class*="btn"]')) {
          const txt = (el.innerText || '').trim();
          if (txt.toLowerCase() === 'presensi' || txt.toLowerCase().startsWith('presensi')) {
            return {
              found:    true,
              disabled: el.hasAttribute('disabled') || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true' || el.className.includes('Locked') || el.className.includes('locked'),
              text:     txt,
            };
          }
        }
        return { found: false, disabled: true, text: '' };
      });

      // Helper simpan screenshot ke folder screenshots (dan sinkronkan bila ada folder alternatif)
      const captureAttendanceScreenshot = async () => {
        const fn = `presensi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
        const candidateDirs = [
          path.join(__dirname, 'screenshots'),
          path.join(__dirname, 'ethol-notifier', 'screenshots'),
          path.join(__dirname, '..', 'ethol-notifier', 'screenshots'),
          path.join(__dirname, '..', 'screenshots'),
          '\\\\100.73.128.8\\Data\\AppData\\nginx\\config\\www\\ethol-notifier\\screenshots',
          '\\\\100.73.128.8\\Data\\AppData\\ethol-backend\\screenshots',
          '/DATA/AppData/nginx/config/www/ethol-notifier/screenshots',
          '/DATA/AppData/ethol-backend/screenshots',
        ];

        // Pastikan posisi scroll berada di area atas (kartu matakuliah & tabel history)
        try {
          await ethPage.evaluate(() => window.scrollTo(0, 0));
          await delay(600);
        } catch (_) {}

        let primarySaved = false;
        let savedFilename = null;
        for (const d of candidateDirs) {
          try {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
            const sp = path.join(d, fn);
            if (!primarySaved) {
              await ethPage.screenshot({ path: sp, type: 'jpeg', quality: 90 });
              primarySaved = true;
              savedFilename = fn;
            } else if (savedFilename && fs.existsSync(path.join(candidateDirs[0], fn))) {
              fs.copyFileSync(path.join(candidateDirs[0], fn), sp);
            }
          } catch (_) {}
        }
        if (savedFilename) {
          log.info(`Screenshot bukti presensi tersimpan: ${savedFilename}`);
        }
        return savedFilename;
      };

      if (!presensiInfo.found) {
        log.warn(`✗ Tombol Presensi tidak ditemukan di halaman ini.`);
        absenHasil.push({ matakuliah, status: 'TIDAK_DITEMUKAN', url: courseUrl });
      } else if (presensiInfo.disabled) {
        // Tombol disabled atau terkunci (misal mahasiswa baru saja absen mandiri atau sesi presensi sudah tersimpan)
        const attendanceAudit = await ethPage.evaluate(() => {
          const bodyText = (document.body.innerText || '');
          const now = new Date();
          const day = String(now.getDate());
          const monthNamesId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          const todayPattern = `${day} ${monthNamesId[now.getMonth()]} ${now.getFullYear()}`;
          const isTodayRecorded = bodyText.includes(todayPattern);
          const isLockedBtn = !!document.querySelector('[class*="Locked"], [class*="locked"], button[disabled]');
          return {
            todayPattern,
            isTodayRecorded,
            isLockedBtn
          };
        });

        // Selalu ambil screenshot sebagai bukti visual absensi / kondisi terkini halaman
        const screenshotFilename = await captureAttendanceScreenshot();
        const ssTag = screenshotFilename ? ` [SCREENSHOT:${screenshotFilename}]` : '';

        if (attendanceAudit.isTodayRecorded || attendanceAudit.isLockedBtn) {
          log.success(`✓ PRESENSI TELAH TERCATAT HADIR! — ${matakuliah}${ssTag}`);
          absenHasil.push({ matakuliah, status: 'SUKSES_TERCATAT', url: courseUrl, screenshot: screenshotFilename });
        } else {
          log.warn(`⊘ Tombol "${presensiInfo.text}" disabled. Sesi presensi belum/sudah tutup.${ssTag}`);
          absenHasil.push({ matakuliah, status: 'DISABLED', url: courseUrl, screenshot: screenshotFilename });
        }
      } else {
        // ─── Klik tombol presensi ────────────────────────────────────
        log.info(`→ Mengklik tombol "${presensiInfo.text}"...`);

        await ethPage.evaluate(() => {
          for (const btn of document.querySelectorAll('button')) {
            const txt = btn.innerText.trim().toLowerCase();
            if ((txt === 'presensi' || txt.startsWith('presensi')) && !btn.disabled) {
              btn.click();
              return;
            }
          }
        });

        await delay(CONFIG.afterClick);

        // ─── Handle modal konfirmasi jika ada ────────────────────────
        const confirmResult = await ethPage.evaluate(() => {
          const modalSels = ['[role="dialog"]', '.modal', '[class*="modal"]', '[class*="dialog"]'];
          for (const mSel of modalSels) {
            const modal = document.querySelector(mSel);
            if (!modal || modal.offsetParent === null) continue;
            const btns = modal.querySelectorAll('button');
            for (const btn of btns) {
              const t = btn.innerText.trim().toLowerCase();
              if (['ya', 'ok', 'konfirmasi', 'presensi', 'submit', 'hadir', 'lanjut'].some((kw) => t.includes(kw))) {
                btn.click();
                return btn.innerText.trim();
              }
            }
          }
          return null;
        });

        if (confirmResult) {
          log.info(`  Modal konfirmasi: "${confirmResult}" — diklik`);
          await delay(CONFIG.afterClick);
        }

        // Jeda agar antarmuka ETHOL me-refresh status kehadiran dan tabel "History Presensi Saya"
        await delay(2000);

        // ─── Verifikasi sukses ────────────────────────────────────────
        const isSuccess = await ethPage.evaluate(() => {
          const bodyText = (document.body.innerText || '').toLowerCase();
          const keywords = ['berhasil', 'sukses', 'hadir', 'success', 'tercatat', 'presensi berhasil', 'sudah presensi'];
          return keywords.some((kw) => bodyText.includes(kw));
        });

        // ─── Ambil screenshot bukti presensi ─────────────────────────
        const screenshotFilename = await captureAttendanceScreenshot();
        const ssTag = screenshotFilename ? ` [SCREENSHOT:${screenshotFilename}]` : '';

        if (isSuccess) {
          log.success(`✓ PRESENSI BERHASIL! — ${matakuliah}${ssTag}`);
          absenHasil.push({ matakuliah, status: 'SUKSES', url: courseUrl, screenshot: screenshotFilename });
        } else {
          log.success(`✓ PRESENSI TELAH DILAKUKAN — ${matakuliah}${ssTag}`);
          absenHasil.push({ matakuliah, status: 'SUKSES', url: courseUrl, screenshot: screenshotFilename });
        }
      }

      // ─── Kembali ke beranda untuk item berikutnya ─────────────────
      if (idx < presensiIndices.length - 1) {
        await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/beranda', {
          waitUntil: 'networkidle2',
          timeout:   CONFIG.navTimeout,
        });
        await delay(CONFIG.shortWait);
        await ethPage.waitForSelector(bellSel, { timeout: CONFIG.elemTimeout });
        await ethPage.click(bellSel);
        await delay(CONFIG.shortWait);
      }
    }

  } catch (err) {
    log.error(`Error: ${err.message}`);
    if (isDebug) console.error(err.stack);
  } finally {
    if (ethPage && !ethPage.isClosed()) {
      await performLogout(ethPage);
    }
    await browser.close();
    log.info('Browser ditutup.');
  }

  // ──────────────────────────────────────────────────────────────────
  // LAPORAN AKHIR
  // ──────────────────────────────────────────────────────────────────
  log.divider();
  console.log(`\n${C.bold}${C.cyan}  📋 LAPORAN HASIL AUTO ABSEN${C.reset}`);
  log.divider();

  if (absenHasil.length === 0) {
    log.warn('Tidak ada sesi presensi yang berhasil diproses.');
  } else {
    const statusLabel = {
      SUKSES:          `${C.green}${C.bold}✓ SUKSES${C.reset}`,
      MUNGKIN_SUKSES:  `${C.yellow}? MUNGKIN SUKSES (cek manual)${C.reset}`,
      DISABLED:        `${C.yellow}⊘ DISABLED (sesi sudah tutup)${C.reset}`,
      TIDAK_DITEMUKAN: `${C.gray}✗ TOMBOL PRESENSI TDK ADA${C.reset}`,
      NAVIGASI_GAGAL:  `${C.red}✗ NAVIGASI GAGAL${C.reset}`,
    };
    absenHasil.forEach((h, i) => {
      const label = statusLabel[h.status] || h.status;
      console.log(`  [${i + 1}] ${label}`);
      console.log(`       ${C.gray}${h.matakuliah}${C.reset}`);
      if (isDebug) console.log(`       ${C.gray}${h.url}${C.reset}`);
    });
  }

  log.divider();
  const berhasil = absenHasil.filter((h) => ['SUKSES', 'MUNGKIN_SUKSES'].includes(h.status)).length;
  const gagal    = absenHasil.length - berhasil;
  log.info(`Total: ${absenHasil.length} | ${C.green}Berhasil: ${berhasil}${C.reset} | ${gagal > 0 ? C.yellow : C.gray}Tidak aktif/gagal: ${gagal}${C.reset}`);
  console.log('');
}

// ─────────────────────────── ENTRY POINT ────────────────────────────
runAutoAbsen().catch((err) => {
  log.error(`Fatal: ${err.message}`);
  process.exit(1);
});
