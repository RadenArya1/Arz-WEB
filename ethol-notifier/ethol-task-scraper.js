/* ============================================================
   ETHOL ACADEMIC NOTIFIER — SCRAPER TUGAS MAHASISWA
   Spesifikasi: Notifikasi Lonceng -> Semua -> Kategori Tugas ->
   Tugas Baru (<= 1 Minggu) -> Filter Belum Mengumpulkan
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ─── KONFIGURASI UMUM ───────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://ethol.pens.ac.id/',
  casUrl: 'https://ethol.pens.ac.id/cas/login',
  shortWait: 1500,
  actionDelay: 2000,
  casWaitSec: 3, // Jeda stabilisasi 3 detik sesuai protokol
  navTimeout: 30000,
  elemTimeout: 10000,
};

// ─── LOGGING HELPER (Master Humanizer Style) ─────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${C.cyan}[INFO]${C.reset} ${msg}`),
  step: (num, title) => console.log(`\n${C.bold}${C.magenta}[LANGKAH ${num}]${C.reset} ${C.bold}${title}${C.reset}`),
  success: (msg) => console.log(`${C.green}[SUKSES]${C.reset} ${msg}`),
  warn: (msg) => console.log(`${C.yellow}[PERINGATAN]${C.reset} ${msg}`),
  error: (msg) => console.error(`${C.red}[ERROR]${C.reset} ${msg}`),
  divider: () => console.log(`${C.gray}───────────────────────────────────────────────────${C.reset}`),
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── AMBIL KREDENSIAL LOGIN ─────────────────────────────────
function loadCredentials() {
  const candidatePaths = [
    path.join(__dirname, 'ethol-config.json'),
    path.join(__dirname, '..', 'ethol-notifier', 'ethol-config.json'),
    path.join(process.cwd(), 'ethol-notifier', 'ethol-config.json'),
    path.join(process.cwd(), 'ethol-config.json'),
  ];

  for (const cp of candidatePaths) {
    if (fs.existsSync(cp)) {
      try {
        const raw = fs.readFileSync(cp, 'utf8');
        const data = JSON.parse(raw);
        if (data.username && data.password) {
          return { username: data.username.trim(), password: data.password.trim() };
        }
      } catch (_) {}
    }
  }

  // Fallback environment variable
  if (process.env.ETHOL_USER && process.env.ETHOL_PASS) {
    return { username: process.env.ETHOL_USER.trim(), password: process.env.ETHOL_PASS.trim() };
  }

  throw new Error('Kredensial login tidak ditemukan di ethol-config.json.');
}

// ─── FILTER WAKTU: MAKSIMAL 1 MINGGU (<= 7 HARI) ───────────
function isWithinOneWeek(ts) {
  if (!ts) return true;
  const lower = String(ts).toLowerCase();

  // Waktu baru dalam hitungan detik, menit, jam, atau hari ini / kemarin
  if (
    lower.includes('detik') ||
    lower.includes('menit') ||
    lower.includes('jam') ||
    lower.includes('baru saja') ||
    lower.includes('hari ini') ||
    lower.includes('kemarin') ||
    lower.includes('tadi')
  ) {
    return true;
  }

  // Pola "X hari yang lalu"
  const dayMatch = lower.match(/(\d+)\s*hari\s*(?:yang\s*)?lalu/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    return days <= 7;
  }

  // Pola "1 minggu yang lalu" atau "seminggu yang lalu"
  if (lower.includes('1 minggu') || lower.includes('seminggu')) {
    return true;
  }

  // Jika > 1 minggu (misal: "2 minggu yang lalu", "1 bulan yang lalu")
  if (lower.includes('minggu') || lower.includes('bulan') || lower.includes('tahun')) {
    return false;
  }

  return true;
}

// ─── HITUNG SELISIH HARI KE DEADLINE (H-Tag) ────────────────
function calculateHTag(deadlineStr) {
  if (!deadlineStr) return 'Tugas Baru';
  try {
    const dlDate = new Date(deadlineStr);
    if (isNaN(dlDate.getTime())) return 'Tugas Baru';

    const now = new Date();
    const diffMs = dlDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Terlambat';
    if (diffDays === 0) return 'Hari Ini';
    if (diffDays === 1) return 'H-1';
    if (diffDays === 2) return 'H-2';
    if (diffDays === 3) return 'H-3';
    return `H-${diffDays}`;
  } catch {
    return 'Tugas Baru';
  }
}

// ─── FORMAT TANGGAL INDONESIA ───────────────────────────────
function formatIndonesianDate(dateInput) {
  if (!dateInput) return 'Sesuai Jadwal Perkuliahan';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${mins}`;
  } catch {
    return String(dateInput);
  }
}

// ─── SIMPAN HASIL TUGAS KE JSON ─────────────────────────────
function saveTasksToFile(tasks) {
  const payload = {
    lastCheck: new Date().toISOString(),
    totalPending: tasks.length,
    tasks: tasks,
  };

  const candidatePaths = [
    path.join(__dirname, 'tasks.json'),
    path.join(__dirname, '..', 'tasks.json'),
    path.join(process.cwd(), 'ethol-notifier', 'tasks.json'),
  ];

  let saved = false;
  for (const fp of candidatePaths) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
      saved = true;
    } catch (_) {}
  }

  if (saved) {
    log.success(`Berhasil menyimpan ${tasks.length} tugas ke tasks.json`);
  }
}

// ─── LOGOUT AMAN ────────────────────────────────────────────
async function performLogout(page) {
  try {
    log.info('Menjalankan prosedur logout akun...');
    await page.evaluate(() => {
      // Cari tombol keluar di menu sidebar atau link /logout
      for (const a of document.querySelectorAll('a, button, [role="button"]')) {
        const txt = (a.innerText || '').trim().toLowerCase();
        if (txt === 'keluar' || txt.includes('logout')) {
          a.click();
          return;
        }
      }
      window.location.href = '/logout';
    });
    await delay(1200);
  } catch (_) {}
}

// ─── MAIN SCRAPER FUNCTION ──────────────────────────────────
async function runTaskScraper() {
  log.divider();
  console.log(`${C.bold}${C.cyan}  📚 ETHOL TASK SCRAPER • PENGAMBIL TUGAS BARU (1 MINGGU)${C.reset}`);
  console.log(`${C.gray}  Metode: Notifikasi Lonceng ➔ Semua ➔ Filter Tugas ➔ Validasi Belum Mengumpulkan${C.reset}`);
  log.divider();

  const creds = loadCredentials();
  const isHeadless = !process.argv.includes('--no-headless') && !process.argv.includes('--show');

  const browser = await puppeteer.launch({
    headless: isHeadless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1366,768',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // Blokir resource berat untuk percepat scraping
  try {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (['font', 'media'].includes(rt)) req.abort();
      else req.continue();
    });
  } catch (_) {}

  const collectedTasks = [];
  let ethPage = page;

  try {
    // ──────────────────────────────────────────────────────────
    // LANGKAH 1: Masuk ke Halaman Login CAS
    // ──────────────────────────────────────────────────────────
    log.step(1, 'Membuka gerbang CAS Login ETHOL...');
    await page.goto(CONFIG.casUrl, { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout });

    // Jika form CAS belum terbuka langsung (misal di beranda tamu)
    if (!page.url().includes('login') && !page.url().includes('cas')) {
      await page.evaluate(() => {
        for (const btn of document.querySelectorAll('button, a')) {
          const txt = (btn.innerText || '').trim().toLowerCase();
          if (txt.includes('login') || txt.includes('masuk')) { btn.click(); return; }
        }
      });
      await delay(CONFIG.shortWait);
      await page.evaluate(() => {
        const sso = document.querySelector('a[href*="cas"]');
        if (sso) sso.click();
      });
      await delay(CONFIG.shortWait);
    }

    // ──────────────────────────────────────────────────────────
    // LANGKAH 2: Pengisian Kredensial & Jeda Pengaman 3 Detik
    // ──────────────────────────────────────────────────────────
    log.step(2, 'Mengisi username dan password mahasiswa...');
    await page.waitForSelector('#username', { timeout: CONFIG.elemTimeout });
    await page.type('#username', creds.username, { delay: 30 });
    await page.type('#password', creds.password, { delay: 30 });

    log.info(`Menunggu jeda pengaman ${CONFIG.casWaitSec} detik sebelum submit...`);
    await delay(CONFIG.casWaitSec * 1000);

    // Submit form login
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }).catch(() => {}),
      page.evaluate(() => {
        const submitBtn = document.querySelector('input[name="submit"], .btn-submit, button[type="submit"]');
        if (submitBtn) submitBtn.click();
        else {
          const form = document.querySelector('form');
          if (form) form.submit();
        }
      }),
    ]);

    await delay(CONFIG.actionDelay);

    // Ambil tab aktif yang berada di domain ethol
    const pages = await browser.pages();
    ethPage = pages.find((p) => p.url().includes('ethol.pens.ac.id')) || page;
    log.info(`Tiba di halaman: ${ethPage.url()}`);

    // ──────────────────────────────────────────────────────────
    // LANGKAH 3: Buka Panel Lonceng Notifikasi (Kanan Atas)
    // ──────────────────────────────────────────────────────────
    log.step(3, 'Membuka panel lonceng notifikasi di kanan atas...');
    
    // Cari tombol lonceng notifikasi
    const bellClicked = await ethPage.evaluate(() => {
      // 1. Selector ikon lonceng / bell
      const bellIcons = document.querySelectorAll('i.fa-bell, svg[data-icon="bell"], [class*="bell"], [class*="Bell"]');
      for (const icon of bellIcons) {
        const btn = icon.closest('button, a, div[role="button"]');
        if (btn) { btn.click(); return true; }
      }

      // 2. Tombol navbar dengan badge angka pemberitahuan
      for (const btn of document.querySelectorAll('button, div[role="button"]')) {
        if (btn.querySelector('[class*="badge"], [class*="Badge"]') || btn.getAttribute('aria-label')?.includes('notif')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (bellClicked) {
      log.info('Tombol lonceng notifikasi berhasil diklik.');
    } else {
      log.warn('Mencoba klik tombol lonceng via query alternatif...');
      await ethPage.click('button[class*="navBtn"], button[class*="navLogin"]').catch(() => {});
    }

    await delay(CONFIG.shortWait);

    // ──────────────────────────────────────────────────────────
    // LANGKAH 4: Pilih Tab "Semua" & Kategori "Tugas"
    // ──────────────────────────────────────────────────────────
    log.step(4, 'Menyaring notifikasi: Pilih "Semua" lalu kategori "Tugas"...');

    const filterApplied = await ethPage.evaluate(async () => {
      // 1. Cari dropdown di dalam panel Pemberitahuan
      const selects = document.querySelectorAll('select');
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.text.toLowerCase().includes('tugas')) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return 'select_tugas_applied';
          }
        }
      }

      // 2. Custom Dropdown / Div Select
      const dropdowns = document.querySelectorAll('[class*="select"], [class*="dropdown"], [class*="Filter"]');
      for (const dd of dropdowns) {
        const text = (dd.innerText || '').toLowerCase();
        if (text.includes('semua') || text.includes('presensi') || text.includes('filter')) {
          dd.click();
          // Cari opsi tugas yang muncul
          const options = document.querySelectorAll('div, li, span, button');
          for (const opt of options) {
            if ((opt.innerText || '').trim().toLowerCase() === 'tugas') {
              opt.click();
              return 'custom_dropdown_tugas_applied';
            }
          }
        }
      }

      // 3. Tab pills (Semua, Presensi, Tugas)
      const tabs = document.querySelectorAll('button, [role="tab"], div[class*="tab"], div[class*="chip"]');
      for (const tab of tabs) {
        const t = (tab.innerText || '').trim().toLowerCase();
        if (t === 'tugas' || t.includes('tugas')) {
          tab.click();
          return 'tab_tugas_clicked';
        }
      }

      return 'fallback_dom_filter';
    });

    log.info(`Hasil penerapan filter: ${filterApplied}`);
    await delay(CONFIG.shortWait);

    // ──────────────────────────────────────────────────────────
    // LANGKAH 5: Deteksi Item Notifikasi "Tugas Baru" (<= 1 Minggu)
    // ──────────────────────────────────────────────────────────
    log.step(5, 'Memindai daftar notifikasi Tugas Baru dalam rentang 1 minggu...');

    const taskNotifs = await ethPage.evaluate(() => {
      const items = [];
      // Cari kontainer panel notifikasi
      const candidates = document.querySelectorAll(
        '[class*="notifList"] > *, [class*="_notifItem_"], div[class*="notification-item"], div[class*="item"]'
      );

      candidates.forEach((el, index) => {
        const text = el.innerText || '';
        const upper = text.toUpperCase();

        // Validasi apakah ini notifikasi tugas
        if (upper.includes('TUGAS') || upper.includes('TUGAS BARU') || text.includes('tugas')) {
          const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
          
          // Cari baris timestamp (mis: "1 hari yang lalu", "2 jam yang lalu")
          const timeLine = lines.find((l) => 
            l.includes('yang lalu') || l.includes('kemarin') || l.includes('hari ini') || l.includes('menit') || l.includes('jam')
          ) || '';

          // Cari judul dan nama matakuliah
          let matakuliah = 'Mata Kuliah';
          let judul = 'Tugas Kuliah';

          const mkMatch = text.match(/matakuliah\s+([^\n\r]+?)(?:\s+dengan\s+judul|\s*$)/i);
          if (mkMatch) matakuliah = mkMatch[1].trim();

          const judulMatch = text.match(/dengan\s+judul\s+([^\n\r]+)/i);
          if (judulMatch) judul = judulMatch[1].trim();

          items.push({
            domIndex: index,
            fullText: text,
            matakuliah,
            judul,
            timeAgo: timeLine,
          });
        }
      });

      return items;
    });

    log.info(`Ditemukan ${taskNotifs.length} total notifikasi bertema tugas.`);

    // Terapkan filter 1 minggu
    const freshTasks = taskNotifs.filter((t) => {
      const ok = isWithinOneWeek(t.timeAgo);
      if (!ok) {
        log.warn(`[DILEWATI] Melebihi batas 1 minggu: "${t.judul}" — ${t.matakuliah} (${t.timeAgo})`);
      }
      return ok;
    });

    log.info(`Ditemukan ${freshTasks.length} notifikasi tugas baru dalam rentang <= 1 minggu.`);

    if (freshTasks.length === 0) {
      log.warn('Tidak ada notifikasi tugas baru dalam rentang 1 minggu terakhir.');
      saveTasksToFile([]);
      return;
    }

    // ──────────────────────────────────────────────────────────
    // LANGKAH 6: Masuk ke Detail Tugas & Filter yang BELUM Mengumpulkan
    // ──────────────────────────────────────────────────────────
    log.step(6, 'Memeriksa detail setiap tugas untuk memvalidasi status pengumpulan...');

    for (let i = 0; i < freshTasks.length; i++) {
      const task = freshTasks[i];
      log.divider();
      log.info(`[${i + 1}/${freshTasks.length}] Memeriksa: "${task.judul}" (${task.matakuliah})`);
      log.info(`Waktu notifikasi: ${task.timeAgo || 'Baru'}`);

      // Buka panel notifikasi jika tertutup
      await ethPage.evaluate(() => {
        const notifPanel = document.querySelector('[class*="notifList"], [class*="notification"]');
        if (!notifPanel || notifPanel.offsetParent === null) {
          const bell = document.querySelector('i.fa-bell, svg[data-icon="bell"]');
          if (bell) bell.closest('button, a')?.click();
        }
      });
      await delay(800);

      // Klik item notifikasi tugas untuk membuka detail
      const currentUrl = ethPage.url();
      const clickSuccess = await ethPage.evaluate((targetIdx) => {
        const candidates = document.querySelectorAll(
          '[class*="notifList"] > *, [class*="_notifItem_"], div[class*="notification-item"], div[class*="item"]'
        );
        const item = candidates[targetIdx];
        if (item) {
          const link = item.querySelector('a') || item;
          link.click();
          return true;
        }
        return false;
      }, task.domIndex);

      await delay(CONFIG.actionDelay);

      // Tunggu navigasi halaman tugas atau modal detail terbuka
      const pageOrModalLoaded = await ethPage.evaluate(() => {
        return !!(
          document.querySelector('[class*="tugas"], [class*="detail"], form, .modal') ||
          window.location.href.includes('tugas') ||
          window.location.href.includes('kuliah')
        );
      });

      // Audit status pengumpulan tugas di halaman
      const taskAudit = await ethPage.evaluate(() => {
        // 1. Ekstraksi Deadline dari elemen p._text13Pre0_eo805_869 / p[class*="_text13Pre0_"]
        let deadline = '';
        const dlElements = Array.from(document.querySelectorAll('p[class*="_text13Pre0_"], p._text13Pre0_eo805_869, [class*="_text13Pre0"]'));
        let dlP = dlElements.find((el) => (el.innerText || '').toLowerCase().includes('deadline'));
        if (!dlP) {
          dlP = Array.from(document.querySelectorAll('p, div, span')).find((el) => {
            const t = (el.innerText || '').trim();
            return t.toLowerCase().startsWith('deadline') || t.toLowerCase().includes('deadline :');
          });
        }

        if (dlP) {
          const boldSpan = dlP.querySelector('span[style*="font-weight"], span');
          if (boldSpan && boldSpan.innerText.trim()) {
            deadline = boldSpan.innerText.trim();
          } else {
            const m = dlP.innerText.match(/deadline\s*:\s*([^\n\r]+)/i);
            if (m) deadline = m[1].trim();
            else deadline = dlP.innerText.replace(/deadline\s*:\s*/i, '').trim();
          }
        }

        if (!deadline) {
          const dlMatch = document.body.innerText.match(/(?:batas|deadline|tenggat)\s*:\s*([^\n\r]+)/i);
          if (dlMatch) deadline = dlMatch[1].trim();
        }

        // 2. Ekstraksi Status: <span class="_badgeStatusGreen_eo805_1599 _badgeStatusPill_eo805_1597">Sudah Dikumpulkan</span>
        let isSubmitted = false;
        let statusLabel = 'Belum Mengumpulkan';

        const greenBadge = document.querySelector('span[class*="_badgeStatusGreen_"], span._badgeStatusGreen_eo805_1599, [class*="_badgeStatusGreen"]');
        const pillBadges = Array.from(document.querySelectorAll('span[class*="_badgeStatusPill_"], [class*="_badgeStatusPill"], [class*="_badgeStatus"]'));

        if (greenBadge) {
          isSubmitted = true;
          statusLabel = (greenBadge.innerText || '').trim() || 'Sudah Dikumpulkan';
        } else {
          const matchedPill = pillBadges.find((b) => {
            const txt = (b.innerText || '').toLowerCase();
            return txt.includes('sudah') || txt.includes('belum') || txt.includes('dikumpulkan') || txt.includes('mengumpulkan');
          });

          if (matchedPill) {
            const pText = (matchedPill.innerText || '').trim();
            if (pText.toLowerCase().includes('sudah') || pText.toLowerCase().includes('selesai')) {
              isSubmitted = true;
              statusLabel = pText;
            } else {
              isSubmitted = false;
              statusLabel = pText;
            }
          }
        }

        if (!isSubmitted) {
          const text = (document.body.innerText || '').toLowerCase();
          if (
            text.includes('sudah mengumpulkan') ||
            text.includes('telah mengumpulkan') ||
            text.includes('sudah dikumpulkan') ||
            text.includes('file terkirim') ||
            !!document.querySelector('a[href*="download-jawaban"], [class*="submitted"]')
          ) {
            isSubmitted = true;
            statusLabel = 'Sudah Dikumpulkan';
          }
        }

        let dosen = '';
        const dosenMatch = document.body.innerText.match(/dosen\s*:\s*([^\n\r]+)/i);
        if (dosenMatch) dosen = dosenMatch[1].trim();

        return {
          isSubmitted,
          statusLabel,
          deadline,
          dosen,
          currentUrl: window.location.href,
        };
      });

      if (taskAudit.isSubmitted) {
        log.info(`✓ Tugas "${task.judul}" SUDAH DIKUMPULKAN (${taskAudit.statusLabel}) [Deadline: ${taskAudit.deadline || '-'}]. Melewati tugas ini.`);
      } else {
        log.warn(`⚡ Tugas "${task.judul}" BELUM MENGUMPULKAN! (${taskAudit.statusLabel}) [Deadline: ${taskAudit.deadline || '-'}]. Menambahkan ke daftar pantau.`);
        
        const hTag = calculateHTag(taskAudit.deadline);
        const indonesianDeadline = formatIndonesianDate(taskAudit.deadline);

        collectedTasks.push({
          id: `task_${Date.now()}_${i}`,
          title: task.judul,
          matakuliah: task.matakuliah,
          dosen: taskAudit.dosen || 'Dosen Pengampu',
          deadline: taskAudit.deadline || 'Dalam 1 Minggu',
          deadline_indonesia: indonesianDeadline,
          hTag: hTag,
          status: 'Belum Mengumpulkan',
          timeAgo: task.timeAgo,
          url: taskAudit.currentUrl,
        });
      }

      // Kembali ke beranda untuk memeriksa item berikutnya jika navigasi berpindah URL
      if (ethPage.url() !== currentUrl && i < freshTasks.length - 1) {
        await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/beranda', { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }).catch(() => {});
        await delay(CONFIG.shortWait);
      }
    }

    // ──────────────────────────────────────────────────────────
    // LANGKAH 7: Simpan & Laporkan Hasil Akhir
    // ──────────────────────────────────────────────────────────
    log.step(7, 'Menyimpan hasil tugas belum mengumpulkan ke tasks.json...');
    saveTasksToFile(collectedTasks);

    log.divider();
    console.log(`\n${C.bold}${C.cyan}  📋 RINGKASAN TUGAS BARU (1 MINGGU) — BELUM MENGUMPULKAN${C.reset}`);
    log.divider();

    if (collectedTasks.length === 0) {
      log.success('🎉 Luar biasa! Semua tugas baru selama 1 minggu telah dikumpulkan atau tidak ada tugas mendesak.');
    } else {
      collectedTasks.forEach((t, idx) => {
        console.log(`  [${idx + 1}] ${C.bold}${C.yellow}${t.title}${C.reset}`);
        console.log(`       Mata Kuliah : ${t.matakuliah}`);
        console.log(`       Batas Waktu : ${t.deadline_indonesia} (${t.hTag})`);
        console.log(`       Status      : ${C.red}Belum Mengumpulkan${C.reset}`);
      });
    }
    console.log('');

  } catch (err) {
    log.error(`Terjadi kesalahan pada scraper tugas: ${err.message}`);
  } finally {
    if (ethPage && !ethPage.isClosed()) {
      await performLogout(ethPage);
    }
    await browser.close();
    log.info('Browser scraping tugas ditutup secara bersih.');
  }
}

// Eksekusi jika dipanggil langsung via CLI
if (require.main === module) {
  runTaskScraper().catch((err) => {
    log.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runTaskScraper };
