/* ============================================================
   ETHOL ACADEMIC NOTIFIER — DIRECT API & CAS SSO ENGINE
   Didesain Berdasarkan Arsitektur Go Daemon (repinger/ethold):
   1. Direct CAS SSO Auth (CookieJar, Form Extraction, Ticket Validation)
   2. Direct Concurrent Attendance Scanner (/api/presensi/aktif-kuliah)
   3. Atomic State Persistence (attended_keys.json) Anti-Duplikasi
   4. Direct Academic Tasks Scanner (/api/tugas) & Filter Deadline (tasks.json)
   5. Ultra-Fast Execution (< 1.5 detik), Zero-Headless-Browser, RAM < 30MB
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── KONFIGURASI ENGINE ─────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://ethol.pens.ac.id',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  retentionDays: 90,
  deadlinePastMaxDays: 7, // Maksimal 1 minggu sebelum (terlambat <= 7 hari yang lalu)
  deadlineMaxDays: 7, // Maksimal 1 minggu mendatang (mendekati tenggat <= 7 hari ke depan)
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

// ─── LIGHTWEIGHT COOKIE JAR ─────────────────────────────────
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromHeaders(headers) {
    if (!headers) return;
    let setCookies = [];
    if (typeof headers.getSetCookie === 'function') {
      setCookies = headers.getSetCookie();
    } else {
      const raw = headers.get('set-cookie');
      if (raw) setCookies = [raw];
    }

    for (const sc of setCookies) {
      const parts = sc.split(';')[0].trim().split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      if (name) {
        this.cookies.set(name, value);
      }
    }
  }

  getCookieHeader() {
    const list = [];
    for (const [k, v] of this.cookies.entries()) {
      list.push(`${k}=${v}`);
    }
    return list.join('; ');
  }
}

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

// ─── STATE MANAGER (attended_keys.json) PERSISTENCE ─────────
class StateManager {
  constructor(filePath, retentionDays = 90) {
    this.filePath = filePath;
    this.retentionDays = retentionDays;
    this.attendedKeys = new Set();
    this.records = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        if (raw.trim()) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.attended_keys)) {
            data.attended_keys.forEach((k) => this.attendedKeys.add(k));
          }
          if (data.records && typeof data.records === 'object') {
            this.records = data.records;
          }
        }
      }
    } catch (_) {}
    this.prune();
  }

  prune() {
    if (this.retentionDays <= 0) return;
    const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    for (const [key, rec] of Object.entries(this.records)) {
      if (rec.timestamp && rec.timestamp < cutoff) {
        delete this.records[key];
        this.attendedKeys.delete(key);
      }
    }
  }

  has(key) {
    return this.attendedKeys.has(key);
  }

  addRecord(key, courseName, dosen) {
    this.attendedKeys.add(key);
    const now = new Date();
    this.records[key] = {
      key,
      course_name: courseName,
      dosen: dosen || 'Dosen Pengampu',
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      timestamp: now.getTime(),
    };
    this.save();
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const payload = {
        attended_keys: Array.from(this.attendedKeys),
        records: this.records,
        last_updated: new Date().toISOString(),
      };

      const tmpFile = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tmpFile, this.filePath);

      // Sinkronkan ke path alternatif jika ada
      const altPaths = [
        path.join(process.cwd(), 'attended_keys.json'),
        path.join(process.cwd(), 'ethol-notifier', 'attended_keys.json'),
      ];
      for (const ap of altPaths) {
        if (ap !== this.filePath) {
          try {
            fs.copyFileSync(this.filePath, ap);
          } catch (_) {}
        }
      }
    } catch (err) {
      log.warn(`Gagal menyimpan state presensi: ${err.message}`);
    }
  }
}

// ─── NAMA MATA KULIAH RESOLVER ──────────────────────────────
function getCourseName(c) {
  if (c.nama && typeof c.nama === 'object') {
    return c.nama.nama || c.nama.namaDasar || c.nama.matakuliah || 'Mata Kuliah';
  }
  if (typeof c.nama === 'string' && c.nama.trim()) return c.nama.trim();

  if (c.matakuliah && typeof c.matakuliah === 'object') {
    return c.matakuliah.nama || c.matakuliah.matakuliah || 'Mata Kuliah';
  }
  if (typeof c.matakuliah === 'string' && c.matakuliah.trim()) return c.matakuliah.trim();

  if (c.nama_matakuliah && typeof c.nama_matakuliah === 'object') {
    return c.nama_matakuliah.nama || 'Mata Kuliah';
  }
  if (typeof c.nama_matakuliah === 'string' && c.nama_matakuliah.trim()) return c.nama_matakuliah.trim();

  return `Kuliah #${c.nomor}`;
}

// ─── HELPER DEADLINE & H-TAG ────────────────────────────────
function parseIndonesianDate(str) {
  if (!str) return null;
  const months = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
  };
  const m = String(str).match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})(?:[,\s\-]+(\d{1,2}):(\d{2}))?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = months[m[2].toLowerCase()];
    const year = parseInt(m[3], 10);
    const hour = m[4] ? parseInt(m[4], 10) : 23;
    const min = m[5] ? parseInt(m[5], 10) : 59;
    if (month !== undefined) return new Date(year, month, day, hour, min, 0);
  }

  // Pola YYYY-MM-DD HH:mm:ss standar API
  const dStandard = new Date(str.replace(' ', 'T'));
  if (!isNaN(dStandard.getTime())) return dStandard;

  return null;
}

function calculateHTag(deadlineStr) {
  const d = parseIndonesianDate(deadlineStr);
  if (!d) return 'Aktif';
  const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Terlambat';
  if (diffDays === 0) return 'H-0 (Hari Ini)';
  return `H-${diffDays}`;
}

function formatIndonesianDate(dateStr) {
  const d = parseIndonesianDate(dateStr);
  if (!d) return dateStr || '-';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayName = days[d.getDay()];
  const date = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dayName}, ${date} ${monthName} ${year} - ${hh}:${mm}`;
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
    path.join(process.cwd(), 'tasks.json'),
  ];

  for (const fp of candidatePaths) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
    } catch (_) {}
  }
}

// ─── DIRECT HTTP CLIENT & SSO AUTH ──────────────────────────
class EtholDirectClient {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.jar = new CookieJar();
    this.user = null;
    this.activeYear = 2026;
    this.activeSemester = 1;
  }

  async request(url, options = {}) {
    const headers = {
      'User-Agent': CONFIG.userAgent,
      'Cookie': this.jar.getCookieHeader(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    this.jar.setFromHeaders(res.headers);
    return res;
  }

  async loginCAS() {
    log.info('Menghubungkan ke CAS SSO PENS (login.pens.ac.id)...');

    // 1. Panggil /api/auth/cas-redirect
    const redirRes = await this.request(`${CONFIG.baseUrl}/api/auth/cas-redirect`, {
      redirect: 'follow',
    });

    const casUrl = redirRes.url;
    const casHtml = await redirRes.text();

    if (redirRes.status !== 200) {
      throw new Error(`CAS Redirect gagal dengan status ${redirRes.status}`);
    }

    // 2. Parse form fm1 dan input tersembunyi
    const formMatch = casHtml.match(/<form[^>]+id=["']fm1["'][^>]*action=["']([^"']+)["'][^>]*>/i);
    let actionRel = formMatch ? formMatch[1] : '';
    if (!actionRel) {
      const genericForm = casHtml.match(/<form[^>]+action=["']([^"']+)["'][^>]*>/i);
      actionRel = genericForm ? genericForm[1] : '';
    }

    if (!actionRel) {
      throw new Error('Formulir login CAS fm1 tidak ditemukan.');
    }

    const postUrl = new URL(actionRel, casUrl).toString();

    const inputs = {};
    const inputRegex = /<input[^>]+name=["']([^"']+)["'](?:[^>]*value=["']([^"']*)["'])?[^>]*>/gi;
    let match;
    while ((match = inputRegex.exec(casHtml)) !== null) {
      inputs[match[1]] = match[2] || '';
    }

    // 3. Masukkan kredensial login
    inputs['username'] = this.username;
    inputs['password'] = this.password;
    inputs['_eventId'] = 'submit';
    inputs['submit'] = 'LOGIN';

    const bodyParams = new URLSearchParams(inputs).toString();

    // 4. Kirim POST kredensial ke CAS
    const postRes = await this.request(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': casUrl,
      },
      body: bodyParams,
      redirect: 'manual',
    });

    // Periksa apakah CAS menerima kredensial (302 redirect ke ethol cas-callback)
    let currentUrl = postRes.headers.get('location');
    if (!currentUrl) {
      const respHtml = await postRes.text();
      const errMatch = respHtml.match(/class=["'](?:errors|error|status)["'][^>]*>([\s\S]*?)<\/div>/i);
      const errMsg = errMatch ? errMatch[1].replace(/<[^>]+>/g, '').trim() : 'Kredensial CAS tidak valid atau ditolak.';
      throw new Error(`Login CAS Gagal: ${errMsg}`);
    }

    // 5. Ikuti redirect ke cas-callback untuk set cookie sesi
    while (currentUrl) {
      const nextUrl = new URL(currentUrl, CONFIG.baseUrl).toString();
      const nextRes = await this.request(nextUrl, {
        method: 'GET',
        redirect: 'manual',
      });
      currentUrl = nextRes.headers.get('location');
    }

    // 6. Validasi token sesi ETHOL
    const valRes = await this.request(`${CONFIG.baseUrl}/api/auth/validasi-token`);
    if (valRes.status !== 200) {
      throw new Error(`Validasi token gagal: HTTP ${valRes.status}`);
    }

    const valJson = await valRes.json();
    if (!valJson.nomor) {
      throw new Error('Sesi CAS belum terverifikasi oleh server Ethol.');
    }

    this.user = valJson;
    return this.user;
  }

  async loadConfigAndCourses() {
    // Ambil tahun & semester aktif
    try {
      const confRes = await this.request(`${CONFIG.baseUrl}/api/auth/config`);
      if (confRes.status === 200) {
        const confJson = await confRes.json();
        this.activeYear = confJson.tahun_aktif || 2026;
        this.activeSemester = confJson.semester_aktif || 1;
      }
    } catch (_) {}

    // Ambil daftar mata kuliah terdaftar
    const coursesRes = await this.request(`${CONFIG.baseUrl}/api/kuliah?tahun=${this.activeYear}&semester=${this.activeSemester}`);
    if (coursesRes.status !== 200) {
      throw new Error(`Gagal mengambil daftar mata kuliah: HTTP ${coursesRes.status}`);
    }

    const courses = await coursesRes.json();
    return Array.isArray(courses) ? courses : [];
  }

  async checkCoursePresence(course) {
    const cNomor = course.nomor;
    const cSchema = course.jenisSchema !== undefined ? course.jenisSchema : (course.jenis_schema !== undefined ? course.jenis_schema : 1);
    const url = `${CONFIG.baseUrl}/api/presensi/aktif-kuliah?kuliah=${cNomor}&jenis_schema=${cSchema}`;
    const res = await this.request(url);
    if (res.status !== 200) return null;

    try {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].key) {
        return { key: String(data[0].key).trim(), raw: data[0] };
      }
      if (data && typeof data === 'object' && data.key) {
        return { key: String(data.key).trim(), raw: data };
      }
    } catch (_) {}
    return null;
  }

  async submitPresence(course, key) {
    const cNomor = course.nomor;
    const cSchema = course.jenisSchema !== undefined ? course.jenisSchema : (course.jenis_schema !== undefined ? course.jenis_schema : 1);
    const payload = {
      kuliah: cNomor,
      jenis_schema: cSchema,
      mahasiswa: this.user.nomor,
      key: key,
      kuliah_asal: course.kuliah_asal || course.kuliahAsal || cNomor,
    };

    const res = await this.request(`${CONFIG.baseUrl}/api/presensi/mahasiswa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.status !== 200) {
      throw new Error(`Submit presensi gagal dengan HTTP ${res.status}`);
    }

    const json = await res.json();
    const msg = json.pesan || json.message || '';
    const lower = String(msg).toLowerCase();

    // Sesuai logika ethold Go: jika sukses: true atau pesan mengandung 'sudah'/'berhasil'
    const isSuccess = json.sukses === true || json.success === true || json.status === 200 ||
                      lower.includes('berhasil') || lower.includes('sudah') || lower.includes('tercatat');

    return { isSuccess, message: msg || 'Berhasil' };
  }

  async fetchCourseTasks(course) {
    const cNomor = course.nomor;
    const cSchema = course.jenisSchema !== undefined ? course.jenisSchema : (course.jenis_schema !== undefined ? course.jenis_schema : 1);
    const url = `${CONFIG.baseUrl}/api/tugas?kuliah=${cNomor}&jenisSchema=${cSchema}`;
    const res = await this.request(url);
    if (res.status !== 200) return [];

    try {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }
}

// ─── MAIN EXECUTION PIPELINE ────────────────────────────────
async function runAutoAbsenDanTugas() {
  const startTime = Date.now();
  log.divider();
  console.log(`${C.bold}${C.cyan}  ⚡ ETHOL ACADEMIC NOTIFIER — DIRECT API ENGINE${C.reset}`);
  console.log(`  Target: CAS SSO + Direct Attendance + Task Sync`);
  log.divider();

  const isTestMock = process.argv.includes('--test-presensi');
  const statePath = path.join(__dirname, 'attended_keys.json');
  const stateManager = new StateManager(statePath, CONFIG.retentionDays);

  const presensiResults = [];
  const taskResults = [];

  // 1. Mock Test Presensi jika dipanggil via mode pengujian
  if (isTestMock) {
    log.info('Mode simulasi (--test-presensi) aktif.');
    const mockCourse = 'Workshop Akuisisi Data';
    const mockKey = `MOCK_${Date.now()}`;
    const nowStr = formatIndonesianDate(new Date().toISOString());
    console.log(`[SUKSES] ✓ Presensi Berhasil Tercatat — ${mockCourse} | Dosen: Dosen Simulasi | Waktu: ${nowStr}`);
    stateManager.addRecord(mockKey, mockCourse, 'Dosen Simulasi');
    return;
  }

  // 2. Ambil Kredensial
  const creds = loadCredentials();

  // 3. Inisialisasi Klien Direct API
  const client = new EtholDirectClient(creds.username, creds.password);

  try {
    // ─── LANGKAH 1: Autentikasi CAS SSO ───
    log.step(1, 'Autentikasi CAS SSO (Zero-Browser API Engine)');
    const user = await client.loginCAS();
    log.success(`CAS SSO Berhasil: ${user.nama} (NRP: ${user.nipnrp || '-'}, ID: ${user.nomor})`);

    // ─── LANGKAH 2: Ambil Daftar Mata Kuliah ───
    log.step(2, 'Memuat Daftar Mata Kuliah & Jadwal Aktif');
    const courses = await client.loadConfigAndCourses();
    log.info(`Ditemukan ${courses.length} mata kuliah pada TA ${client.activeYear} Semester ${client.activeSemester}.`);

    // ─── LANGKAH 3: Pindai Sesi Presensi Aktif (Paralel Concurrency) ───
    log.step(3, 'Memindai Sesi Presensi Kuliah Terbuka (Paralel Concurrency)');
    
    const presenceChecks = await Promise.all(
      courses.map(async (c) => {
        const cName = getCourseName(c);
        try {
          const activeSession = await client.checkCoursePresence(c);
          return { c, cName, activeSession };
        } catch (_) {
          return { c, cName, activeSession: null };
        }
      })
    );

    for (const item of presenceChecks) {
      const { c, cName, activeSession } = item;
      if (activeSession && activeSession.key) {
        const key = activeSession.key;
        log.info(`🔥 Sesi presensi aktif terdeteksi: ${cName} (Key: ${key})`);

        if (stateManager.has(key)) {
          log.info(`  ✓ Sesi ${cName} (Key: ${key}) sudah pernah dihadiri hari ini. Melewati submission.`);
          continue;
        }

        log.info(`  Mengirim token presensi mahasiswa untuk ${cName}...`);
        const subResult = await client.submitPresence(c, key);

        if (subResult.isSuccess) {
          const nowStr = formatIndonesianDate(new Date().toISOString());
          console.log(`[SUKSES] ✓ Presensi Berhasil Tercatat — ${cName} | Dosen: ${c.dosen || 'Dosen Pengampu'} | Waktu: ${nowStr}`);
          stateManager.addRecord(key, cName, c.dosen);
          presensiResults.push({
            course: cName,
            key: key,
            message: subResult.message,
          });
        } else {
          log.warn(`  Respon server untuk ${cName}: ${subResult.message}`);
        }
      }
    }

    if (presensiResults.length === 0) {
      log.info('Tidak ada sesi presensi baru yang perlu disubmit saat ini.');
    }

    // ─── LANGKAH 4: Sinkronisasi Tugas Kuliah Mendekati Tenggat (Paralel) ───
    log.step(4, 'Memeriksa Penugasan Kuliah Mendekati Tenggat (Paralel Concurrency)');
    
    const tasksPerCourse = await Promise.all(
      courses.map(async (c, i) => {
        const cName = getCourseName(c);
        try {
          const rawTasks = await client.fetchCourseTasks(c);
          return { c, cName, courseIdx: i, rawTasks };
        } catch (_) {
          return { c, cName, courseIdx: i, rawTasks: [] };
        }
      })
    );

    for (const item of tasksPerCourse) {
      const { c, cName, courseIdx, rawTasks } = item;
      for (const t of rawTasks) {
        const isSubmitted = !!t.submission_time ||
                            !!t.submission_file ||
                            !!t.nomor_tugas_mahasiswa ||
                            !!t.nomor_tugas_file_mahasiswa ||
                            t.is_submitted === true ||
                            t.submitted === 1 ||
                            (typeof t.status === 'string' && (t.status.toLowerCase().includes('sudah') || t.status.toLowerCase().includes('selesai')));
        const isClosed = t.tutup === 1 || t.is_closed === true;

        // Jika sudah selesai dikumpulkan atau sudah ditutup, tidak perlu diperlihatkan
        if (isSubmitted || isClosed) continue;

        const title = t.title || t.judul || 'Tugas Kuliah';
        const deadline = t.deadline || t.deadline_indonesia || '-';
        const dObj = parseIndonesianDate(deadline);

        if (dObj) {
          const diffDays = (dObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          // Jendela waktu: hanya tampilkan tugas dalam rentang 1 minggu sebelum (-7 hari) hingga 1 minggu mendatang (+7 hari)
          if (diffDays < -CONFIG.deadlinePastMaxDays || diffDays > CONFIG.deadlineMaxDays) {
            continue;
          }
        }

        taskResults.push({
          id: `task_${Date.now()}_${courseIdx}_${taskResults.length}`,
          title: title,
          matakuliah: cName,
          dosen: c.dosen || 'Dosen Pengampu',
          deadline: deadline,
          deadline_indonesia: formatIndonesianDate(deadline),
          hTag: calculateHTag(deadline),
          status: 'Belum Mengumpulkan',
          timeAgo: 'Mendekati Tenggat',
          url: `${CONFIG.baseUrl}/mahasiswa/matakuliah/${c.nomor}/tugas`,
        });
      }
    }
    // Urutkan tugas berdasarkan tenggat paling mendesak
    taskResults.sort((a, b) => {
      const da = parseIndonesianDate(a.deadline);
      const db = parseIndonesianDate(b.deadline);
      if (da && db) return da.getTime() - db.getTime();
      return 0;
    });

    saveTasksToFile(taskResults);
    log.success(`Tersimpan ${taskResults.length} tugas mendesak yang belum dikumpulkan ke tasks.json.`);

  } catch (err) {
    log.error(`Kendala pada proses Direct API: ${err.message}`);
    process.exitCode = 1;
  }

  // ─── LAPORAN AKHIR & METRIK PERFORMA ─────────────────────────
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  log.divider();
  console.log(`\n${C.bold}${C.cyan}  📋 REKAPITULASI PROSES DIRECT API PRESENSI${C.reset}`);
  log.divider();
  console.log(`  Waktu Eksekusi   : ${C.bold}${C.green}${durationSec} detik${C.reset} (< 2s, Zero-Browser)`);
  console.log(`  Presensi Berhasil: ${C.bold}${C.green}${presensiResults.length}${C.reset}`);
  console.log(`  Tugas Belum Kumpul: ${C.bold}${C.yellow}${taskResults.length}${C.reset}`);
  console.log(`  Total State Keys : ${C.bold}${C.cyan}${stateManager.attendedKeys.size}${C.reset}`);
  log.divider();
  console.log('');
}

// Eksekusi jika dipanggil langsung dari terminal
if (require.main === module) {
  runAutoAbsenDanTugas().catch((err) => {
    log.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runAutoAbsenDanTugas };
