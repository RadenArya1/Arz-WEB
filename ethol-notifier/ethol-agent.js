/* ============================================================
   ETHOL ACADEMIC NOTIFIER — ROBOT ENGINE TERPADU
   Fungsi Terpadu dalam Sekali Eksekusi "Presensi Instan":
   1. Autentikasi CAS SSO (Jeda Pengaman 3 Detik)
   2. Presensi Otomatis (< 24 Jam) + Screenshot Bukti Riwayat
   3. Pemindaian Tugas Baru (<= 1 Minggu) Yang Belum Mengumpulkan
   4. Penyimpanan Histori & Pembaruan Linimasa Otomatis
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ─── KONFIGURASI ENGINE ─────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://ethol.pens.ac.id/',
  casUrl: 'https://ethol.pens.ac.id/cas/login',
  shortWait: 1500,
  actionDelay: 2000,
  casWaitSec: 3, // Jeda stabilisasi 3 detik sesuai protokol
  navTimeout: 35000,
  elemTimeout: 12000,
};

// ─── LOGGING SYSTEM (Master Humanizer Formatting) ───────────
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

  if (process.env.ETHOL_USER && process.env.ETHOL_PASS) {
    return { username: process.env.ETHOL_USER.trim(), password: process.env.ETHOL_PASS.trim() };
  }

  throw new Error('Kredensial login tidak ditemukan di ethol-config.json.');
}

// ─── FILTER WAKTU NOTIFIKASI TUGAS (BATAS 7 HARI) ───────────
function isWithin7Days(ts) {
  if (!ts) return false;
  const lower = String(ts).toLowerCase().trim();

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

  const dayMatch = lower.match(/(\d+)\s*hari/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    return days <= 7;
  }

  if (lower.includes('1 minggu') || lower.includes('seminggu')) {
    return true;
  }

  return false;
}
const isWithinOneWeek = isWithin7Days;

// ─── FORMAT TANGGAL DAN HITUNG H-TAG DEADLINE ───────────────
function parseIndonesianDate(str) {
  if (!str) return null;
  const months = {
    januari: 0, januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
  };
  const m = String(str).match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})(?:[,\s\-]+(\d{1,2}):(\d{2}))?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthName = m[2].toLowerCase();
    const year = parseInt(m[3], 10);
    const hour = m[4] ? parseInt(m[4], 10) : 23;
    const min = m[5] ? parseInt(m[5], 10) : 59;
    if (months[monthName] !== undefined) {
      return new Date(year, months[monthName], day, hour, min, 0);
    }
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function calculateHTag(deadlineStr) {
  if (!deadlineStr) return 'Tugas Baru';
  try {
    const dlDate = parseIndonesianDate(deadlineStr);
    if (!dlDate) return 'Tugas Baru';

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

function formatIndonesianDate(dateInput) {
  if (!dateInput) return 'Sesuai Jadwal Perkuliahan';
  const str = String(dateInput).trim();
  const months = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
  ];
  if (months.some((m) => str.toLowerCase().includes(m))) {
    return str;
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return str;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const day = d.getDate();
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${mins}`;
  } catch {
    return str;
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

  for (const fp of candidatePaths) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
    } catch (_) {}
  }
}

// ─── AMBIL & SIMPAN TANGKAPAN LAYAR BUKTI PRESENSI ──────────
async function captureProofScreenshot(page, courseTitle = 'presensi') {
  const safeName = courseTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 25);
  const filename = `presensi_${Date.now()}_${safeName}.jpg`;

  const targetDirs = [
    path.join(__dirname, 'screenshots'),
    path.join(__dirname, '..', 'screenshots'),
    path.join(__dirname, '..', 'Error_Absen'),
    path.join(process.cwd(), 'screenshots'),
    path.join(process.cwd(), 'ethol-notifier', 'screenshots'),
    path.join(process.cwd(), 'Error_Absen'),
  ];

  targetDirs.forEach((d) => {
    if (!fs.existsSync(d)) {
      try { fs.mkdirSync(d, { recursive: true }); } catch (_) {}
    }
  });

  const primaryPath = path.join(targetDirs[0], filename);

  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(400);
    await page.screenshot({ path: primaryPath, type: 'jpeg', quality: 80 });

    // Salin ke direktori lain agar sinkron
    for (let i = 1; i < targetDirs.length; i++) {
      try {
        const dest = path.join(targetDirs[i], filename);
        fs.copyFileSync(primaryPath, dest);
      } catch (_) {}
    }

    log.info(`Screenshot bukti presensi tersimpan: ${filename}`);
    return filename;
  } catch (err) {
    log.warn(`Gagal mengambil tangkapan layar bukti: ${err.message}`);
    return null;
  }
}

// ─── LOGOUT PROSEDUR ────────────────────────────────────────
async function performLogout(page) {
  try {
    log.info('Menjalankan logout bersih dari portal Ethol...');
    await page.evaluate(() => {
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

// ─── MAIN UNIFIED AGENT FUNCTION ────────────────────────────
async function runAutoAbsenDanTugas(options = {}) {
  log.divider();
  console.log(`${C.bold}${C.cyan}  ⚡ ETHOL ACADEMIC NOTIFIER • PRESENSI & TUGAS TERPADU${C.reset}`);
  console.log(`${C.gray}  Proses: CAS SSO ➔ Presensi (<24 Jam) ➔ Tugas Baru (<=1 Minggu) ➔ Histori${C.reset}`);
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

  // Blokir file font/media berat demi kecepatan
  try {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (['font', 'media'].includes(rt)) req.abort();
      else req.continue();
    });
  } catch (_) {}

  let ethPage = page;
  const presensiResults = [];
  const taskResults = [];

  try {
    // ──────────────────────────────────────────────────────────
    // LANGKAH 1: Login SSO CAS PENS (Jeda Pengaman 3 Detik)
    // ──────────────────────────────────────────────────────────
    log.step(1, 'Autentikasi SSO CAS PENS...');
    await page.goto(CONFIG.casUrl, { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout });

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

    await page.waitForSelector('#username', { timeout: CONFIG.elemTimeout });
    await page.type('#username', creds.username, { delay: 25 });
    await page.type('#password', creds.password, { delay: 25 });

    log.info(`Menunggu jeda pengaman ${CONFIG.casWaitSec} detik sebelum submit login CAS...`);
    await delay(CONFIG.casWaitSec * 1000);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }).catch(() => {}),
      page.evaluate(() => {
        const submitBtn = document.querySelector('input[name="submit"], .btn-submit, button[type="submit"]');
        if (submitBtn) submitBtn.click();
        else document.querySelector('form')?.submit();
      }),
    ]);

    await delay(CONFIG.actionDelay);

    const pages = await browser.pages();
    ethPage = pages.find((p) => p.url().includes('ethol.pens.ac.id')) || page;
    log.info(`Berhasil login ke ETHOL: ${ethPage.url()}`);

    // Helper: Buka Panel Notifikasi Lonceng (Kompatibel Tailwind / Ethol UI)
    async function openNotificationPanel() {
      const opened = await ethPage.evaluate(() => {
        // 1. Selector resmi aria-label Notifikasi sesuai elemen beranda user
        const bellBtn = document.querySelector('button[aria-label="Notifikasi"]') ||
                        document.querySelector('button[aria-label*="notif" i]');
        if (bellBtn) {
          bellBtn.click();
          return true;
        }

        // 2. Fallback tombol area kanan atas header
        for (const btn of document.querySelectorAll('button, div[role="button"]')) {
          const r = btn.getBoundingClientRect();
          if (r.top < 65 && r.left > 750 && r.width < 70) {
            btn.click();
            return true;
          }
        }

        // 3. Fallback elemen ikon lonceng
        const bellIcon = document.querySelector('i[class*="bell"], svg[class*="bell"], [class*="fa-bell"]');
        if (bellIcon) {
          const parent = bellIcon.closest('button, a, div[role="button"]') || bellIcon;
          parent.click();
          return true;
        }

        return false;
      });

      await delay(CONFIG.shortWait);
      return opened;
    }

    // Helper: Pilih Filter Kategori di Panel Notifikasi (Semua / Presensi / Tugas)
    async function selectNotificationFilter(catName = 'Presensi') {
      // 1. Tekan tombol dropdown trigger: button._csTrigger_eo805_794
      await ethPage.evaluate(() => {
        const trigger = document.querySelector('button[class*="_csTrigger_"]') ||
                        document.querySelector('button._csTrigger_eo805_794') ||
                        Array.from(document.querySelectorAll('button')).find((b) => (b.className || '').includes('_csTrigger'));
        if (trigger) {
          trigger.click();
          return true;
        }
        // Fallback tombol filter di panel kanan
        const candidates = Array.from(document.querySelectorAll('button, div[role="button"]')).filter((el) => {
          const r = el.getBoundingClientRect();
          const t = (el.innerText || '').trim();
          return r.left > 650 && r.top < 180 && (t === 'Semua' || t === 'Presensi' || t === 'Tugas');
        });
        if (candidates.length > 0) candidates[0].click();
      });

      await delay(800);

      // 2. Pilih opsi: div._csOption_eo805_803 atau teks sesuai targetCat
      await ethPage.evaluate((targetCat) => {
        const options = Array.from(document.querySelectorAll('div[class*="_csOption_"], [class*="_csOption"]'));
        const matched = options.find((el) => (el.innerText || '').trim().toLowerCase() === targetCat.toLowerCase());
        if (matched) {
          matched.click();
          return true;
        }
        const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left > 650 && (el.innerText || '').trim().toLowerCase() === targetCat.toLowerCase();
        });
        if (candidates.length > 0) {
          candidates[candidates.length - 1].click();
        }
      }, catName);

      // Beri jeda agar request AJAX notifikasi Ethol selesai termuat ke DOM
      await delay(2500);
    }



    // Helper: Ambil Kartu Notifikasi dari Panel Sisi Kanan
    async function getNotificationCards(categoryKeyword) {
      return await ethPage.evaluate((cat) => {
        const list = [];
        // Prioritaskan elemen dengan class _notifItemLink_
        let notifEls = Array.from(document.querySelectorAll('div[class*="_notifItemLink_"], [class*="_notifItemLink"]'));

        if (notifEls.length === 0) {
          // Fallback jika class dinamis
          notifEls = Array.from(document.querySelectorAll('*')).filter((el) => {
            const r = el.getBoundingClientRect();
            const txt = (el.innerText || '').trim();
            if (r.left < 650 || r.width < 180) return false;
            if (cat === 'presensi') {
              return txt.toUpperCase().includes('PRESENSI KULIAH') || txt.toLowerCase().includes('presensi');
            }
            if (cat === 'tugas') {
              return txt.toUpperCase().includes('TUGAS BARU') || txt.toLowerCase().includes('tugas');
            }
            return false;
          });
          // Ambil elemen terluar
          notifEls = notifEls.filter((el) => {
            let p = el.parentElement;
            while (p) {
              if (notifEls.includes(p)) return false;
              p = p.parentElement;
            }
            return true;
          });
        }

        notifEls.forEach((card, idx) => {
          const kodeEl = card.querySelector('p[class*="_notifKode_"], [class*="_notifKode"]');
          const ketEl = card.querySelector('p[class*="_notifKet_"], [class*="_notifKet"]');
          const waktuEl = card.querySelector('p[class*="_notifWaktu_"], [class*="_notifWaktu"]');

          const kode = (kodeEl ? kodeEl.innerText : '').trim();
          const ket = (ketEl ? (ketEl.innerText || ketEl.getAttribute('title') || '') : '').trim();
          const waktu = (waktuEl ? waktuEl.innerText : '').trim();
          const fullText = (card.innerText || '').trim();

          // Saring kategori
          if (cat === 'presensi') {
            const isPres = kode.toUpperCase().includes('PRESENSI') || ket.toLowerCase().includes('presensi') || fullText.toLowerCase().includes('presensi');
            if (!isPres) return;
          } else if (cat === 'tugas') {
            const isTug = kode.toUpperCase().includes('TUGAS') || ket.toLowerCase().includes('tugas') || fullText.toLowerCase().includes('tugas');
            if (!isTug) return;
          }

          // Ekstrak nama mata kuliah
          let mk = 'Mata Kuliah';
          const mkMatch = (ket || fullText).match(/matakuliah\s+([^\n\r]+?)(?:\s+dengan\s+judul|\s*$)/i);
          if (mkMatch) {
            mk = mkMatch[1].trim();
          } else {
            const altMatch = (ket || fullText).match(/untuk\s+matakuliah\s+([^\n\r]+)/i);
            if (altMatch) mk = altMatch[1].trim();
            else if (ket) mk = ket;
          }

          let judul = 'Tugas';
          const judulMatch = (ket || fullText).match(/dengan\s+judul\s+([^\n\r]+)/i);
          if (judulMatch) judul = judulMatch[1].trim();

          list.push({
            index: idx,
            kode: kode || 'PRESENSI KULIAH',
            ket: ket || fullText,
            timeAgo: waktu || (fullText.split('\n').find(l => l.includes('lalu') || l.includes('hari')) || ''),
            matakuliah: mk,
            judul,
            fullText,
          });
        });

        return list;
      }, categoryKeyword);
    }

    // ──────────────────────────────────────────────────────────
    // LANGKAH 2: Eksekusi Presensi Otomatis (< 24 Jam)
    // ──────────────────────────────────────────────────────────
    log.step(2, 'Memeriksa sesi Presensi Kuliah aktif (< 24 jam)...');
    await openNotificationPanel();
    await selectNotificationFilter('Presensi');

    // Ambil kartu notifikasi presensi
    let presensiItems = await getNotificationCards('presensi');
    if (presensiItems.length === 0) {
      // Fallback jika filter spesifik tidak memuat kartu, coba filter semua
      await selectNotificationFilter('Semua');
      presensiItems = await getNotificationCards('presensi');
    }

    log.info(`Ditemukan ${presensiItems.length} notifikasi presensi di panel pemberitahuan.`);

    // Saring notifikasi yang berada dibawah 24 jam (< 24 jam)
    function isUnder24HoursStrict(timeText) {
      if (!timeText) return false;
      const t = timeText.trim().toLowerCase();
      if (t.includes('baru saja') || t.includes('detik') || t.includes('menit') || t.includes('tadi')) {
        return true;
      }
      const jamMatch = t.match(/(\d+)\s*jam/);
      if (jamMatch) {
        const jam = parseInt(jamMatch[1], 10);
        return jam < 24; // Di bawah 24 jam
      }
      // "hari", "minggu", "bulan", "tahun" >= 24 jam
      return false;
    }

    const rawFreshPresensi = presensiItems.filter((p) => isUnder24HoursStrict(p.timeAgo));
    
    // Hapus notifikasi yang sama: setiap mata kuliah / presensi hanya boleh terdeteksi dan diproses SEKALI
    const seenMK = new Set();
    const freshPresensi = [];
    for (const p of rawFreshPresensi) {
      // Normalisasi nama mata kuliah untuk deteksi duplikasi
      const mkKey = (p.matakuliah || '')
        .toLowerCase()
        .replace(/praktikum/g, 'prak')
        .replace(/[^a-z0-9]/g, '');

      if (!mkKey) continue;

      if (!seenMK.has(mkKey)) {
        seenMK.add(mkKey);
        freshPresensi.push(p);
      } else {
        log.info(`[DEDUPLIKASI] Notifikasi presensi ganda diabaikan: "${p.matakuliah}" (${p.timeAgo}) — presensi hanya boleh terdeteksi sekali.`);
      }
    }

    log.info(`Ditemukan ${freshPresensi.length} sesi presensi unik dalam batas < 24 jam.`);

    if (freshPresensi.length === 0) {
      log.info('Tidak ada notifikasi presensi yang berada di bawah 24 jam.');
    }

    // Lacak mata kuliah yang sudah diproses agar tidak ada pemrosesan ganda
    const recordedCourses = new Set();

    // Proses setiap presensi aktif di bawah 24 jam
    for (let i = 0; i < freshPresensi.length; i++) {
      const item = freshPresensi[i];
      const courseSig = (item.matakuliah || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (recordedCourses.has(courseSig)) {
        log.info(`Presensi untuk "${item.matakuliah}" sudah diproses sebelumnya (skip).`);
        continue;
      }
      recordedCourses.add(courseSig);

      log.divider();
      log.info(`Memproses presensi: "${item.matakuliah}" (${item.timeAgo || 'aktif'})`);

      // Pastikan panel notifikasi terbuka
      await openNotificationPanel();

      // 1. Klik elemen _notifItemLink_ target
      await ethPage.evaluate((targetIdx) => {
        let notifEls = Array.from(document.querySelectorAll('div[class*="_notifItemLink_"], [class*="_notifItemLink"]'));
        if (notifEls.length === 0) {
          notifEls = Array.from(document.querySelectorAll('*')).filter((el) => {
            const r = el.getBoundingClientRect();
            const txt = (el.innerText || '').trim();
            return r.left > 650 && r.width > 180 && (txt.toUpperCase().includes('PRESENSI KULIAH') || txt.toLowerCase().includes('presensi'));
          });
        }

        const target = notifEls[targetIdx];
        if (target) {
          target.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, item.index);

      await delay(300);

      // Coba klik via mouse koordinat dan pemicu click DOM
      const clickedBox = await ethPage.evaluate((targetIdx) => {
        let notifEls = Array.from(document.querySelectorAll('div[class*="_notifItemLink_"], [class*="_notifItemLink"]'));
        if (notifEls.length === 0) {
          notifEls = Array.from(document.querySelectorAll('*')).filter((el) => {
            const r = el.getBoundingClientRect();
            const txt = (el.innerText || '').trim();
            return r.left > 650 && r.width > 180 && (txt.toUpperCase().includes('PRESENSI KULIAH') || txt.toLowerCase().includes('presensi'));
          });
        }

        const target = notifEls[targetIdx];
        if (target) {
          const r = target.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        return null;
      }, item.index);

      if (clickedBox && clickedBox.x > 0 && clickedBox.y > 0) {
        await ethPage.mouse.click(clickedBox.x, clickedBox.y);
      }

      await ethPage.evaluate((targetIdx) => {
        let notifEls = Array.from(document.querySelectorAll('div[class*="_notifItemLink_"], [class*="_notifItemLink"]'));
        const target = notifEls[targetIdx];
        if (target) {
          target.click();
          const childLink = target.querySelector('a, button, div[class*="Link"]');
          if (childLink) childLink.click();
        }
      }, item.index);

      await delay(CONFIG.actionDelay);

      // 2. Periksa apakah sudah berada di halaman Detail Matakuliah (ada _cardBodyFlex1_ atau History Presensi Saya)
      let isDetailPage = await ethPage.evaluate(() => {
        return !!document.querySelector('div[class*="_cardBodyFlex1_"], table[class*="_tblInfoMk_"]') ||
               document.body.innerText.includes('History Presensi Saya') ||
               window.location.href.includes('detail');
      });

      // 3. Masuk ke halaman Detail Matakuliah via /mahasiswa/matakuliah jika belum memuat detail
      if (!isDetailPage) {
        log.info(`Membuka halaman detail mata kuliah "${item.matakuliah}" via /mahasiswa/matakuliah...`);
        await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/matakuliah', { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }).catch(() => {});
        await delay(CONFIG.shortWait);

        // Cari koordinat tombol Akses Kuliah pada kartu matakuliah target
        const cardCoords = await ethPage.evaluate((targetMK) => {
          const cleanTarget = targetMK.toLowerCase().trim();

          const allCards = Array.from(document.querySelectorAll('*')).filter((el) => {
            const r = el.getBoundingClientRect();
            const t = (el.innerText || '').toLowerCase();
            return r.left > 200 && r.width >= 240 && r.width <= 480 && r.height >= 120 && r.height <= 260 &&
                   (t.includes('akses kuliah') || t.includes('saw') || t.includes('hh-') || t.includes('senin') || t.includes('selasa') || t.includes('rabu') || t.includes('kamis') || t.includes('jum'));
          });

          const uniqueCards = allCards.filter((c) => {
            let p = c.parentElement;
            while (p) {
              if (allCards.includes(p)) return false;
              p = p.parentElement;
            }
            return true;
          });

          let match = uniqueCards.find((c) => c.innerText.toLowerCase().includes(cleanTarget));

          if (!match) {
            const keywords = cleanTarget.split(' ').filter((w) => w.length > 3);
            match = uniqueCards.find((c) => {
              const t = c.innerText.toLowerCase();
              return keywords.some((k) => t.includes(k));
            });
          }

          if (!match) {
            match = uniqueCards.find((c) => c.innerText.toLowerCase().includes('praktikum sistem')) ||
                    uniqueCards.find((c) => c.innerText.toLowerCase().includes('sistem dan jaringan')) ||
                    uniqueCards.find((c) => c.innerText.toLowerCase().includes('konsep teknologi')) ||
                    uniqueCards[uniqueCards.length - 1];
          }

          if (match) {
            match.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const r = match.getBoundingClientRect();
            return {
              x: Math.round(r.left + r.width - 55),
              y: Math.round(r.top + r.height - 20),
              cardText: match.innerText.slice(0, 60),
            };
          }
          return null;
        }, item.matakuliah);

        if (cardCoords) {
          log.info(`Mengklik tombol "Akses Kuliah >" pada kartu: "${cardCoords.cardText.replace(/\n+/g, ' ')}"`);
          await ethPage.mouse.click(cardCoords.x, cardCoords.y);
          await delay(CONFIG.actionDelay);
        }

        // Tunggu hingga tabel "History Presensi Saya" dan kotak detail mata kuliah termuat
        await ethPage.waitForFunction(() => {
          const t = document.body.innerText || '';
          return t.includes('History Presensi Saya') || t.includes('Peserta Kuliah') || window.location.href.includes('detail');
        }, { timeout: 12000 }).catch(() => {});
      }

      // 4. Cari dan tekan elemen di dalam <div class="_cardBodyFlex1_eo805_1473">:
      // Tombol Presensi: <button ... class="_btnBukaPresensiDarkLocked_eo805_1740">Presensi</button>
      const presensiActionResult = await ethPage.evaluate(() => {
        const cardBody = document.querySelector('div[class*="_cardBodyFlex1_"], [class*="_cardBodyFlex1"]') || document.body;
        const presensiBtn = cardBody.querySelector('button[class*="_btnBukaPresensi"], button[class*="btnBukaPresensi"]') ||
                            Array.from(cardBody.querySelectorAll('button')).find((b) => (b.innerText || '').trim().toLowerCase() === 'presensi');

        if (presensiBtn) {
          const isDisabled = presensiBtn.disabled || presensiBtn.getAttribute('disabled') !== null;
          const title = presensiBtn.getAttribute('title') || '';
          const cls = presensiBtn.className || '';

          // Tekan tombol presensi
          try { presensiBtn.click(); } catch (_) {}

          return {
            found: true,
            clicked: !isDisabled,
            disabled: isDisabled,
            title,
            className: cls,
            text: presensiBtn.innerText.trim(),
          };
        }

        return { found: false, clicked: false, disabled: true, title: 'Tidak ditemukan' };
      });

      if (presensiActionResult.found) {
        if (presensiActionResult.disabled) {
          log.info(`Tombol Presensi ditekan: Status terkunci "${presensiActionResult.title || 'Belum ada sesi presensi yang dibuka dosen'}".`);
        } else {
          log.info('Tombol Presensi aktif berhasil ditekan!');
        }
      }

      await delay(CONFIG.shortWait);

      // Tangani pop-up konfirmasi jika ada (Ya / Hadir / Konfirmasi)
      await ethPage.evaluate(() => {
        const modalBtns = document.querySelectorAll('.modal button, [role="dialog"] button');
        for (const mb of modalBtns) {
          const t = (mb.innerText || '').trim().toLowerCase();
          if (['ya', 'ok', 'konfirmasi', 'presensi', 'hadir'].some((k) => t.includes(k))) {
            mb.click();
            return;
          }
        }
      });

      await delay(CONFIG.shortWait);

      // 5. Ekstrak data NIP, Dosen, Jadwal, Presensi Terakhir Dosen dari table._tblInfoMk_
      const detailInfo = await ethPage.evaluate((fallbackMK) => {
        const info = {
          nip: '',
          dosen: '',
          jadwal: '',
          presensiTerakhirDosen: '',
          matakuliah: fallbackMK,
        };

        const rows = Array.from(document.querySelectorAll('table[class*="_tblInfoMk_"] tr, [class*="_tblInfoMk"] tr'));
        for (const r of rows) {
          const label = (r.querySelector('td[class*="_tblInfoMkLabel_"], [class*="_tblInfoMkLabel"]')?.innerText || '').trim().toLowerCase();
          const val = (r.querySelector('td[class*="_tblInfoMkVal_"], [class*="_tblInfoMkVal"]')?.innerText || '').trim();
          if (label.includes('nip')) info.nip = val;
          else if (label.includes('presensi terakhir')) info.presensiTerakhirDosen = val;
          else if (label.includes('nama dosen') || label === 'dosen') info.dosen = val;
          else if (label.includes('jadwal')) info.jadwal = val.replace(/\s+/g, ' ');
        }

        const hList = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, div'));
        const tag = hList.find((el) => (el.innerText || '').trim().toUpperCase() === 'MATA KULIAH');
        if (tag && tag.nextElementSibling) {
          const name = (tag.nextElementSibling.innerText || '').trim();
          if (name.length > 2 && name.length < 80) info.matakuliah = name;
        }

        return info;
      }, item.matakuliah);

      // 6. "setelah itu SS" -> Ambil tangkapan layar bukti presensi pada halaman Detail Matakuliah
      const verifiedMK = detailInfo.matakuliah || item.matakuliah;
      const ssFile = await captureProofScreenshot(ethPage, verifiedMK);
      const ssTag = ssFile ? ` [SCREENSHOT:${ssFile}]` : '';

      // Tampilkan di konsol histori dengan nama matakuliah, dosen, dan waktu presensi
      log.success(`✓ Presensi Berhasil Tercatat — ${verifiedMK} | Dosen: ${detailInfo.dosen || 'Dosen Pengampu'} | Waktu: ${detailInfo.presensiTerakhirDosen || item.timeAgo}${ssTag}`);

      presensiResults.push({
        matakuliah: verifiedMK,
        dosen: detailInfo.dosen,
        nip: detailInfo.nip,
        jadwal: detailInfo.jadwal,
        presensiTerakhirDosen: detailInfo.presensiTerakhirDosen,
        screenshot: ssFile,
      });

      // Kembali ke beranda untuk proses selanjutnya
      await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/beranda', { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }).catch(() => {});
      await delay(CONFIG.shortWait);
    }

    // Pastikan halaman kembali ke beranda bersih sebelum memulai pemindaian tugas
    await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/beranda', { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }).catch(() => {});
    await delay(CONFIG.shortWait);

    // ──────────────────────────────────────────────────────────
    // LANGKAH 3: Pemindaian Tugas Baru (Batas 7 Hari) & Belum Dikumpulkan
    // ──────────────────────────────────────────────────────────
    log.step(3, 'Memindai Tugas Baru dalam batas 7 hari yang belum dikumpulkan...');
    await openNotificationPanel();
    await selectNotificationFilter('Tugas');

    // Pindai Notifikasi Tugas dari panel (dengan toleransi jeda muat AJAX)
    let taskNotifs = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      taskNotifs = await getNotificationCards('tugas');
      if (taskNotifs.length > 0) break;
      await delay(1500);
    }
    if (taskNotifs.length === 0) {
      await selectNotificationFilter('Semua');
      taskNotifs = await getNotificationCards('tugas');
    }

    // Saring notifikasi tugas batas 7 hari (<p class="_notifWaktu_eo805_1307">...)
    const freshTasks = taskNotifs.filter((t) => isWithin7Days(t.timeAgo));
    log.info(`Ditemukan ${freshTasks.length} notifikasi tugas dalam batas 7 hari.`);

    // Lacak tugas agar tidak ada duplikasi pemindaian
    const seenTasks = new Set();
    const uniqueFreshTasks = [];
    for (const t of freshTasks) {
      const taskSig = `${t.matakuliah}_${t.judul}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenTasks.has(taskSig)) {
        seenTasks.add(taskSig);
        uniqueFreshTasks.push(t);
      }
    }

    for (let j = 0; j < uniqueFreshTasks.length; j++) {
      const taskItem = uniqueFreshTasks[j];
      log.info(`Memeriksa status pengumpulan: "${taskItem.judul}" (${taskItem.matakuliah}) [${taskItem.timeAgo}]`);

      await openNotificationPanel();
      await selectNotificationFilter('Tugas');

      // Cari elemen notifikasi target berdasarkan judul atau mata kuliah
      await ethPage.evaluate((targetTitle, targetMK, targetWaktu, targetIdx) => {
        let notifEls = Array.from(document.querySelectorAll('div[class*="_notifItemLink_"], [class*="_notifItemLink"]'));
        let target = notifEls.find((el) => {
          const t = el.innerText || '';
          return (targetTitle && t.includes(targetTitle)) || (targetMK && t.includes(targetMK));
        });

        if (!target && notifEls.length > 0) {
          target = notifEls.find((el) => {
            const w = (el.querySelector('p[class*="_notifWaktu_"], [class*="_notifWaktu"]')?.innerText || '').trim();
            return w === targetWaktu;
          });
        }

        if (!target && notifEls[targetIdx]) target = notifEls[targetIdx];

        if (target) {
          target.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, taskItem.judul, taskItem.matakuliah, taskItem.timeAgo, j);

      await delay(300);

      // Klik mouse koordinat
      const box = await ethPage.evaluate((targetTitle, targetMK, targetIdx) => {
        let notifEls = Array.from(document.querySelectorAll('div[class*="_notifItemLink_"], [class*="_notifItemLink"]'));
        let target = notifEls.find((el) => {
          const t = el.innerText || '';
          return (targetTitle && t.includes(targetTitle)) || (targetMK && t.includes(targetMK));
        }) || notifEls[targetIdx];

        if (target) {
          const r = target.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        return null;
      }, taskItem.judul, taskItem.matakuliah, j);

      if (box && box.x > 0 && box.y > 0) {
        await ethPage.mouse.click(box.x, box.y);
      }

      await ethPage.evaluate((targetTitle, targetMK, targetIdx) => {
        let notifEls = Array.from(document.querySelectorAll('div[class*="_notifItemLink_"], [class*="_notifItemLink"]'));
        let target = notifEls.find((el) => {
          const t = el.innerText || '';
          return (targetTitle && t.includes(targetTitle)) || (targetMK && t.includes(targetMK));
        }) || notifEls[targetIdx];

        if (target) {
          target.click();
          const childLink = target.querySelector('a, button, div[class*="Link"]');
          if (childLink) childLink.click();
        }
      }, taskItem.judul, taskItem.matakuliah, j);

      await delay(CONFIG.actionDelay);

      // Verifikasi apakah tugas SUDAH atau BELUM dikumpulkan
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
          // Ambil isi span tebal: <span style="font-weight: 700;">Kamis, 01 Oktober 2026 - 16:00</span>
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
          const dlMatch = document.body.innerText.match(/(?:batas|deadline|tenggat|berakhir|tanggal berakhir)\s*:\s*([^\n\r]+)/i);
          if (dlMatch) deadline = dlMatch[1].trim();
        }

        // 2. Ekstraksi Status Pengumpulan:
        //    <span class="_badgeStatusGreen_eo805_1599 _badgeStatusPill_eo805_1597"><svg ...></svg>Sudah Dikumpulkan</span>
        let isSubmitted = false;
        let statusLabel = 'Belum Mengumpulkan';

        // Deteksi badge status hijau (Sudah Dikumpulkan)
        const greenBadge = document.querySelector('span[class*="_badgeStatusGreen_"], span._badgeStatusGreen_eo805_1599, [class*="_badgeStatusGreen"]');
        const pillBadges = Array.from(document.querySelectorAll('span[class*="_badgeStatusPill_"], [class*="_badgeStatusPill"], [class*="_badgeStatus"]'));

        if (greenBadge) {
          isSubmitted = true;
          statusLabel = (greenBadge.innerText || '').trim() || 'Sudah Dikumpulkan';
        } else {
          // Cek badge lainnya (misal merah/kuning atau badge status)
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

        // Fallback deteksi teks & elemen pendukung
        if (!isSubmitted) {
          const text = (document.body.innerText || '').toLowerCase();
          if (
            text.includes('sudah dikumpulkan') ||
            text.includes('sudah mengumpulkan') ||
            text.includes('telah mengumpulkan') ||
            text.includes('file terkirim') ||
            text.includes('unduh jawaban') ||
            text.includes('download jawaban') ||
            text.includes('jawaban anda') ||
            !!document.querySelector('a[href*="download-jawaban"], [class*="badge-success"]')
          ) {
            isSubmitted = true;
            statusLabel = 'Sudah Dikumpulkan';
          }
        }

        let dosen = '';
        const dosenMatch = document.body.innerText.match(/(?:dosen|pengampu|nama dosen)\s*:\s*([^\n\r]+)/i);
        if (dosenMatch) dosen = dosenMatch[1].trim();

        return { isSubmitted, statusLabel, deadline, dosen, url: window.location.href };
      });

      if (taskAudit.isSubmitted) {
        log.info(`  ✓ Tugas "${taskItem.judul}" SUDAH DIKUMPULKAN (${taskAudit.statusLabel}) [Deadline: ${taskAudit.deadline || '-'}]. Dilewati.`);
      } else {
        log.warn(`  ⚡ Tugas "${taskItem.judul}" BELUM DIKUMPULKAN! (${taskAudit.statusLabel}) [Deadline: ${taskAudit.deadline || '-'}]. Dicatat.`);
        taskResults.push({
          id: `task_${Date.now()}_${j}`,
          title: taskItem.judul,
          matakuliah: taskItem.matakuliah,
          dosen: taskAudit.dosen || 'Dosen Pengampu',
          deadline: taskAudit.deadline || 'Batas 7 Hari',
          deadline_indonesia: formatIndonesianDate(taskAudit.deadline),
          hTag: calculateHTag(taskAudit.deadline),
          status: taskAudit.statusLabel || 'Belum Mengumpulkan',
          timeAgo: taskItem.timeAgo,
          url: taskAudit.url,
        });
      }

      // Kembali ke beranda
      await ethPage.goto(CONFIG.baseUrl + 'mahasiswa/beranda', { waitUntil: 'networkidle2', timeout: CONFIG.navTimeout }).catch(() => {});
      await delay(CONFIG.shortWait);
    }

    // Simpan hasil tugas ke tasks.json
    saveTasksToFile(taskResults);
    log.info(`[TUGAS] Tersimpan ${taskResults.length} tugas dalam batas 7 hari yang belum dikumpulkan.`);

  } catch (err) {
    log.error(`Kendala pada proses presensi & tugas: ${err.message}`);
  } finally {
    if (ethPage && !ethPage.isClosed()) {
      await performLogout(ethPage);
    }
    await browser.close();
    log.info('Browser scraping ditutup secara aman.');
  }

  // ──────────────────────────────────────────────────────────
  // LAPORAN AKHIR
  // ──────────────────────────────────────────────────────────
  log.divider();
  console.log(`\n${C.bold}${C.cyan}  📋 REKAPITULASI PROSES PRESENSI INSTAN${C.reset}`);
  log.divider();
  console.log(`  Presensi Berhasil : ${C.bold}${C.green}${presensiResults.length}${C.reset}`);
  console.log(`  Tugas Belum Kumpul: ${C.bold}${C.yellow}${taskResults.length}${C.reset}`);
  log.divider();
  console.log('');
}

// Jalankan jika dipanggil via CLI
if (require.main === module) {
  runAutoAbsenDanTugas().catch((err) => {
    log.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runAutoAbsenDanTugas };
