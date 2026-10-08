/* =========================================================
   GMAIL SYNC ENGINE - ARCANUM FINANCE
   Sinkronisasi Otomatis Notifikasi Transaksi BCA via Google Identity Services
   100% Client-Side (Zero-Backend, In-Memory Token Security)
   ========================================================= */

(function(root) {
  const STORAGE_CONNECTED_KEY = 'grimoire_gmail_connected_v1';
  const STORAGE_PROCESSED_KEY = 'grimoire_gmail_processed_v1';

  const STORAGE_TOKEN_KEY = 'grimoire_gmail_token_cache_v1';
  const STORAGE_AUTO_INPUT_KEY = 'grimoire_gmail_auto_input_v1';
  const STORAGE_AUTO_LOOP_KEY = 'grimoire_gmail_auto_loop_v1';

  // State Token & Klien Otorisasi
  let accessToken = null;
  let tokenClient = null;
  let lastClientId = null;
  let isGsiLoaded = false;
  let isSyncing = false;
  let silentSyncAttempted = false;
  let onAutoSaveCallback = null;

  // State Auto-Sync Loop (Seperti Auto Absen)
  let autoSyncTimer = null;
  let autoSyncIntervalSec = 180; // default 3 menit (180 detik)
  let lastSyncTime = null;
  let isLoopActive = false;
  let onLoopStatusChangeCallback = null;

  function isAutoInputEnabled() {
    try {
      const v = localStorage.getItem(STORAGE_AUTO_INPUT_KEY);
      return v === null ? true : v === 'true'; // default aktif (true)
    } catch (_) {
      return true;
    }
  }

  function setAutoInputEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_AUTO_INPUT_KEY, enabled ? 'true' : 'false');
    } catch (_) {}
  }

  function isAutoSyncLoopEnabled() {
    try {
      const v = localStorage.getItem(STORAGE_AUTO_LOOP_KEY);
      return v === null ? true : v === 'true'; // default aktif (true)
    } catch (_) {
      return true;
    }
  }

  function setAutoSyncLoopEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_AUTO_LOOP_KEY, enabled ? 'true' : 'false');
      if (enabled) {
        const state = getConnectionState();
        if (state.connected) {
          startAutoSyncLoop();
        }
      } else {
        stopAutoSyncLoop();
      }
    } catch (_) {}
  }

  function broadcastLoopStatus() {
    if (typeof onLoopStatusChangeCallback === 'function') {
      onLoopStatusChangeCallback({
        active: isLoopActive,
        intervalSec: autoSyncIntervalSec,
        lastSyncTime: lastSyncTime
      });
    }
  }

  function onLoopStatusChange(fn) {
    onLoopStatusChangeCallback = fn;
    broadcastLoopStatus();
  }

  function getLoopState() {
    return {
      active: isLoopActive,
      enabled: isAutoSyncLoopEnabled(),
      intervalSec: autoSyncIntervalSec,
      lastSyncTime: lastSyncTime
    };
  }

  function startAutoSyncLoop(intervalSec = 180) {
    if (!isAutoSyncLoopEnabled()) {
      isLoopActive = false;
      broadcastLoopStatus();
      return;
    }
    const state = getConnectionState();
    if (!state.connected) {
      isLoopActive = false;
      broadcastLoopStatus();
      return;
    }

    autoSyncIntervalSec = intervalSec;
    isLoopActive = true;

    if (autoSyncTimer) {
      clearInterval(autoSyncTimer);
      autoSyncTimer = null;
    }

    autoSyncTimer = setInterval(async () => {
      const curState = getConnectionState();
      if (!curState.connected || !isLoopActive) {
        stopAutoSyncLoop();
        return;
      }

      if (!accessToken) {
        const cached = getStoredToken();
        if (cached) accessToken = cached;
      }

      if (accessToken) {
        console.log(`[GMAIL-SYNC] 🔄 Auto-Check transaksi BCA (seperti auto absen)... [${new Date().toLocaleTimeString('id-ID')}]`);
        await syncNow({ isAutoLoop: true });
      }
    }, autoSyncIntervalSec * 1000);

    broadcastLoopStatus();
  }

  function stopAutoSyncLoop() {
    isLoopActive = false;
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer);
      autoSyncTimer = null;
    }
    broadcastLoopStatus();
  }

  function getStoredToken() {
    try {
      const raw = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Valid jika masa berlaku token masih ada lebih dari 60 detik ke depan
      if (data && data.token && data.expires_at > (Date.now() + 60000)) {
        return data.token;
      }
    } catch (_) {}
    return null;
  }

  function saveStoredToken(token, expiresInSec = 3500) {
    try {
      const expiresAt = Date.now() + (Number(expiresInSec) * 1000);
      localStorage.setItem(STORAGE_TOKEN_KEY, JSON.stringify({
        token,
        expires_at: expiresAt
      }));
    } catch (_) {}
  }

  function clearStoredToken() {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    } catch (_) {}
  }

  // Antrean Tinjauan (Review Queue) di Memori
  let reviewQueue = [];
  let currentQueueIndex = 0;

  // Listener Callback UI saat state antrean/sinkron berubah
  let onQueueChangeCallback = null;
  let onStatusChangeCallback = null;

  /**
   * Helper Penyimpanan State Koneksi & ID Pesan yang Telah Diproses
   */
  function getConnectionState() {
    try {
      const v = localStorage.getItem(STORAGE_CONNECTED_KEY);
      if (v) {
        const obj = JSON.parse(v);
        return {
          connected: Boolean(obj.connected),
          email: obj.email || obj.login_hint || '',
          login_hint: obj.email || obj.login_hint || '',
          locked: Boolean(obj.locked)
        };
      }
    } catch (_) {}
    return { connected: false, email: '', login_hint: '', locked: false };
  }

  function setConnectionState(state) {
    try {
      localStorage.setItem(STORAGE_CONNECTED_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function clearConnectionState() {
    try {
      localStorage.removeItem(STORAGE_CONNECTED_KEY);
    } catch (_) {}
  }

  async function fetchUserProfile(token) {
    if (!token) return null;
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.emailAddress) {
          return data.emailAddress;
        }
      }
    } catch (_) {}
    return null;
  }

  function getProcessedMap() {
    try {
      const v = localStorage.getItem(STORAGE_PROCESSED_KEY);
      return v ? JSON.parse(v) : {};
    } catch (_) {
      return {};
    }
  }

  function saveProcessedMap(map) {
    try {
      localStorage.setItem(STORAGE_PROCESSED_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function markMessageStatus(messageId, status) {
    if (!messageId) return;
    const map = getProcessedMap();
    map[messageId] = status; // 'saved' | 'dismissed' | 'ignored'
    saveProcessedMap(map);
  }

  /**
   * Reset processed map untuk keperluan pengujian via console DevTools
   */
  function resetProcessed() {
    try {
      localStorage.removeItem(STORAGE_PROCESSED_KEY);
      console.log('[GMAIL-SYNC] 🔄 Riwayat ID pesan Gmail yang diproses telah direset.');
    } catch (_) {}
  }

  /**
   * Decode Base64URL dengan dukungan karakter multibyte UTF-8
   * @param {string} input
   * @returns {string}
   */
  function base64UrlDecode(input) {
    if (!input || typeof input !== 'string') return '';
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    try {
      const binaryStr = atob(base64);
      const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_) {
      try {
        return atob(base64);
      } catch (__) {
        return '';
      }
    }
  }

  /**
   * Konversi HTML berstruktur tabel ke teks dengan mempertahankan baris dan sel
   * @param {string} html
   * @returns {string}
   */
  function convertHtmlTableToText(html) {
    if (!html || typeof html !== 'string') return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<\/td>\s*<td[^>]*>/gi, ' ')
      .replace(/<\/th>\s*<th[^>]*>/gi, ' ')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<td[^>]*>/gi, ' ')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Ekstraksi teks isi pesan dari struktur payload pesan Gmail
   * @param {object} payload
   * @returns {string}
   */
  function extractBodyFromPayload(payload) {
    if (!payload) return '';
    let plainText = '';
    let htmlText = '';

    function walkParts(part) {
      if (!part) return;
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        plainText = base64UrlDecode(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        htmlText = base64UrlDecode(part.body.data);
      }
      if (part.parts && Array.isArray(part.parts)) {
        part.parts.forEach(walkParts);
      }
    }

    if (payload.body && payload.body.data) {
      if (payload.mimeType === 'text/plain') plainText = base64UrlDecode(payload.body.data);
      else if (payload.mimeType === 'text/html') htmlText = base64UrlDecode(payload.body.data);
    }
    if (payload.parts) {
      payload.parts.forEach(walkParts);
    }

    // Jika plain text tersedia dan memuat label transaksi, gunakan
    if (plainText && (plainText.includes('Transaction Date') || plainText.includes('Total Payment'))) {
      return plainText;
    }
    // Jika HTML tersedia (kasus umum email BCA), konversi tabel ke teks
    if (htmlText) {
      return convertHtmlTableToText(htmlText);
    }
    return plainText || '';
  }

  /**
   * Cek deteksi duplikasi terhadap transaksi yang sudah tersimpan di storage
   * Syarat: arus sama, nominal sama, dan selisih waktu <= 10 menit
   * Pembanding waktu adalah tanggal hasil parse Transaction Date di isi email, bukan waktu kirim.
   * @param {object} candidateTx
   * @returns {boolean}
   */
  function checkIsDuplicate(candidateTx) {
    if (!candidateTx || !candidateTx.tanggal) return false;
    const storageApi = window.KeuanganStorage || (root && root.KeuanganStorage);
    if (!storageApi || typeof storageApi.getTransactions !== 'function') return false;

    const existingList = storageApi.getTransactions();
    if (!existingList || !existingList.length) return false;

    const candTs = new Date(candidateTx.tanggal.replace(' ', 'T')).getTime();
    if (isNaN(candTs)) return false;

    const TEN_MINUTES_MS = 10 * 60 * 1000;

    return existingList.some(existing => {
      if (existing.arus !== candidateTx.arus) return false;
      if (Number(existing.total) !== Number(candidateTx.total)) return false;
      if (!existing.tanggal) return false;
      const existTs = new Date(existing.tanggal.replace(' ', 'T')).getTime();
      if (isNaN(existTs)) return false;
      return Math.abs(candTs - existTs) <= TEN_MINUTES_MS;
    });
  }

  /**
   * Update Status UI & Trigger Callback
   */
  function broadcastStatus(stateKey, message, details = {}) {
    if (typeof onStatusChangeCallback === 'function') {
      onStatusChangeCallback({ state: stateKey, message, details });
    }
  }

  function broadcastQueue() {
    if (typeof onQueueChangeCallback === 'function') {
      onQueueChangeCallback({
        queue: reviewQueue,
        count: reviewQueue.length,
        currentIndex: currentQueueIndex,
        currentItem: reviewQueue[currentQueueIndex] || null
      });
    }
  }

  let onConnectSuccessCallback = null;
  let onConnectErrorCallback = null;
  let openModalCallback = null;

  function setModalHandler(fn) {
    openModalCallback = fn;
  }

  function openConnectModal(initialAlertMsg = '') {
    if (typeof openModalCallback === 'function') {
      openModalCallback(initialAlertMsg);
    }
  }

  function onConnectSuccess(fn) {
    onConnectSuccessCallback = fn;
  }

  function onConnectError(fn) {
    onConnectErrorCallback = fn;
  }

  /**
   * Inisialisasi Google Identity Services (GIS) Token Client
   */
  function initGsiClient() {
    if (typeof window === 'undefined') return false;
    const config = window.GmailConfig || (root && root.GmailConfig);
    const effectiveClientId = config && config.getClientId ? config.getClientId() : (config && config.CLIENT_ID);
    if (!effectiveClientId || effectiveClientId === 'GANTI_DENGAN_CLIENT_ID') {
      broadcastStatus('unconfigured', 'Client ID Google belum dikonfigurasi');
      return false;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      return false;
    }

    if (tokenClient && lastClientId === effectiveClientId) {
      return true;
    }

    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: config.SCOPE,
        callback: async (resp) => {
          if (resp && resp.access_token) {
            accessToken = resp.access_token;
            saveStoredToken(resp.access_token, resp.expires_in || 3500);

            // Ambil alamat email aktual dari profile API Google
            let userEmail = '';
            try {
              const actualEmail = await fetchUserProfile(resp.access_token);
              if (actualEmail) userEmail = actualEmail;
            } catch (_) {}

            const state = getConnectionState();
            const finalEmail = userEmail || state.email || state.login_hint || 'raidenarya070906@gmail.com';

            setConnectionState({
              connected: true,
              email: finalEmail,
              login_hint: finalEmail,
              locked: true
            });

            broadcastStatus('connected', `Terhubung dengan Gmail (${finalEmail})`, { email: finalEmail });

            if (typeof onConnectSuccessCallback === 'function') {
              onConnectSuccessCallback(resp);
            }
            // Jalankan sinkronisasi langsung & aktifkan loop otomatis seperti auto absen
            syncNow();
            startAutoSyncLoop();
          } else if (resp && resp.error) {
            console.warn('[GMAIL-SYNC] OAuth error:', resp.error);
            broadcastStatus('auth_error', `Gagal otorisasi: ${resp.error}`);
            if (typeof onConnectErrorCallback === 'function') {
              onConnectErrorCallback(resp.error);
            }
          }
        },
        error_callback: (err) => {
          console.warn('[GMAIL-SYNC] GSI error callback:', err);
          const isBlocked = (err && (err.type === 'popup_failed_to_open' || (err.message && err.message.includes('popup')))) || true;
          const msg = isBlocked 
            ? '<strong>Pop-up Google Diblokir oleh Chrome!</strong><br><br>' +
              '1. Lihat <strong>Bilah Alamat (URL)</strong> di bagian atas browser.<br>' +
              '2. Di <strong>ujung paling kanan</strong> bilah alamat, klik ikon jendela bertanda silang merah 🚫 (<em>Pop-up diblokir</em>).<br>' +
              '3. Pilih opsi <strong>"Selalu izinkan pop-up dan pengalihan dari http://127.0.0.1:8080"</strong> lalu klik <strong>Selesai</strong>.<br>' +
              '4. Klik tombol biru <strong>"Buka Pop-up Login Google"</strong> sekali lagi.'
            : 'Jendela login dibatalkan atau terhalang browser.';
          broadcastStatus('auth_error', msg);
          if (typeof onConnectErrorCallback === 'function') {
            onConnectErrorCallback(msg);
          }
        }
      });
      lastClientId = effectiveClientId;
      isGsiLoaded = true;
      return true;
    } catch (e) {
      console.warn('[GMAIL-SYNC] Gagal inisialisasi GSI:', e);
      return false;
    }
  }

  /**
   * Meminta token otorisasi Google OAuth 2.0 (GIS)
   * Mengunci akun yang terhubung agar TIDAK PERNAH berganti akun sendiri.
   * @param {object} [options]
   * @param {boolean} [options.forceSelectAccount=false] - Jika true, paksa jendela pilih akun (hanya saat pengguna klik 'Ganti Akun')
   */
  function loginWithGoogle(options = {}) {
    const { forceSelectAccount = false } = options;
    const config = window.GmailConfig || (root && root.GmailConfig);
    const hasValid = config && config.hasValidClientId ? config.hasValidClientId() : false;
    if (!hasValid) {
      openConnectModal('Silakan masukkan Google OAuth Client ID terlebih dahulu.');
      return;
    }

    const ready = initGsiClient();
    if (!ready) {
      if (!window.google || !window.google.accounts) {
        broadcastStatus('auth_error', 'Layanan Google Identity Services sedang dimuat atau koneksi terputus.');
        if (typeof onConnectErrorCallback === 'function') {
          onConnectErrorCallback('Layanan Google Identity Services belum siap. Pastikan koneksi internet aktif.');
        }
      }
      return;
    }

    try {
      const state = getConnectionState();
      const hasLockedAccount = Boolean(state.connected && (state.email || state.login_hint));

      // Jika forceSelectAccount === false dan akun sudah terkunci:
      // JANGAN memunculkan pilihan akun ('select_account')! Gunakan prompt: '' dan login_hint terkunci!
      let promptVal = 'select_account';
      let hintVal = undefined;

      if (!forceSelectAccount && hasLockedAccount) {
        promptVal = '';
        hintVal = state.email || state.login_hint;
      }

      broadcastStatus('connecting', hasLockedAccount ? `Menyambungkan akun ${hintVal}...` : 'Membuka otorisasi Google...');

      tokenClient.requestAccessToken({
        prompt: promptVal,
        login_hint: hintVal
      });
    } catch (e) {
      console.error('[GMAIL-SYNC] Gagal meminta token:', e);
      broadcastStatus('auth_error', 'Gagal memicu jendela persetujuan Google.');
      if (typeof onConnectErrorCallback === 'function') {
        onConnectErrorCallback('Gagal memicu jendela persetujuan Google: ' + (e.message || e));
      }
    }
  }

  /**
   * Fungsi Ganti Akun Eksplisit ("Ganti Sendiri")
   */
  function switchAccount() {
    loginWithGoogle({ forceSelectAccount: true });
  }

  /**
   * Menghubungkan akun Gmail pengguna (dipicu oleh tombol strip atau modal)
   */
  function connect() {
    openConnectModal();
  }

  /**
   * Mencoba sinkronisasi senyap saat halaman dibuka jika flag koneksi aktif
   */
  function trySilentSync() {
    if (silentSyncAttempted) return;
    silentSyncAttempted = true;

    // 1. Pulihkan token yang masih aktif dari penyimpanan lokal (1x login bertahan)
    const cachedToken = getStoredToken();
    const state = getConnectionState();

    if (state.connected) {
      const email = state.email || state.login_hint || '';
      const emailTag = email ? ` (${email})` : '';

      if (cachedToken) {
        accessToken = cachedToken;
        broadcastStatus('connected', `Terhubung dengan Gmail${emailTag}`, { email });
        syncNow();
        startAutoSyncLoop();
        return;
      } else {
        // PERMANENT LOCK: Jangan pernah turunkan ke 'disconnected' atau 'reauth_needed'
        // Status tetap terhubung dan siap disinkronkan untuk akun yang sama!
        broadcastStatus('connected', `Terhubung dengan Gmail${emailTag} • Siap Sinkron`, { email });
        startAutoSyncLoop();
      }
    } else {
      broadcastStatus('disconnected', 'Gmail belum terhubung');
    }

    // Inisialisasi tokenClient di background agar siap seketika saat pengguna mengklik tombol
    let attempts = 0;
    const checkTimer = setInterval(() => {
      attempts++;
      if (initGsiClient() || attempts > 15) {
        clearInterval(checkTimer);
      }
    }, 300);
  }

  /**
   * Menjalankan sinkronisasi pesan Gmail sekarang
   * @param {object} [options]
   * @param {boolean} [options.isAutoLoop=false] - Jika true, dijalankan otomatis oleh background loop
   */
  async function syncNow(options = {}) {
    const { isAutoLoop = false } = options;
    if (isSyncing) return;
    if (!accessToken) {
      if (!isAutoLoop) {
        // Selalu kunci akun yang sama tanpa dialog pilih akun jika sudah terhubung
        loginWithGoogle({ forceSelectAccount: false });
      }
      return;
    }

    const config = window.GmailConfig || (root && root.GmailConfig);
    const parserApi = window.BcaEmailParser || (root && root.BcaEmailParser);
    if (!parserApi || typeof parserApi.parseBcaEmail !== 'function') {
      console.error('[GMAIL-SYNC] BcaEmailParser tidak ditemukan!');
      broadcastStatus('error', 'Parser email BCA tidak tersedia.');
      return;
    }

    isSyncing = true;
    broadcastStatus('syncing', 'Memeriksa email notifikasi transaksi BCA...');

    try {

      async function fetchMessageList(q) {
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${config.MAX_MESSAGES}`;
        console.log(`[GMAIL-SYNC] 🔎 Menjalankan pencarian Gmail dengan query: "${q}"`);
        const listRes = await fetch(listUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (listRes.status === 401) {
          accessToken = null;
          isSyncing = false;
          const state = getConnectionState();
          const email = state.email || state.login_hint || '';
          const emailTag = email ? ` (${email})` : '';
          broadcastStatus('connected', `Sesi token habis. Klik Sinkron Sekarang untuk memperbarui akun${emailTag}.`, { email });
          return null;
        }

        if (!listRes.ok) {
          let errDetail = '';
          try {
            const errData = await listRes.json();
            if (errData && errData.error && errData.error.message) {
              errDetail = errData.error.message;
            }
          } catch (_) {}

          if (listRes.status === 403) {
            isSyncing = false;
            console.warn('[GMAIL-SYNC] 403 Forbidden:', errDetail);
            if (errDetail.toLowerCase().includes('disabled') || errDetail.toLowerCase().includes('has not been used')) {
              broadcastStatus('error', 'Layanan Gmail API belum diaktifkan di Google Cloud Console. Silakan aktifkan Gmail API.');
            } else {
              broadcastStatus('error', 'Akses Gmail ditolak (403). Pastikan email terdaftar di Test Users.');
            }
            return null;
          }

          throw new Error(`Gmail API List error: HTTP ${listRes.status} ${errDetail}`);
        }

        const listData = await listRes.json();
        return listData.messages || [];
      }

      // 1. Bersihkan status 'ignored' lama dari penyimpanan lokal agar email dapat dievaluasi ulang
      const processedMap = getProcessedMap();
      let mapCleaned = false;
      for (const k of Object.keys(processedMap)) {
        if (processedMap[k] === 'ignored') {
          delete processedMap[k];
          mapCleaned = true;
        }
      }
      if (mapCleaned) {
        saveProcessedMap(processedMap);
      }

      // 2. Strategi pencarian bertingkat dan agregasi pesan transaksi BCA:
      const candidateMap = new Map();
      function addCandidates(list) {
        if (Array.isArray(list)) {
          for (const m of list) {
            if (m && m.id && !candidateMap.has(m.id)) {
              candidateMap.set(m.id, m);
            }
          }
        }
      }

      // Prioritas 1: Pencarian langsung dari domain resmi BCA untuk "Internet Transaction Journal"
      const qJournal = config.JOURNAL_QUERY || 'from:(bca.co.id OR klikbca.com) "Internet Transaction Journal"';
      console.log(`[GMAIL-SYNC] 🎯 Menjalankan pencarian prioritas utama: "${qJournal}"`);
      const listJournal = await fetchMessageList(qJournal);
      if (listJournal !== null) addCandidates(listJournal);

      // Prioritas 2: Pencarian subjek spesifik "Internet Transaction Journal"
      const qSubjectJournal = config.SUBJECT_JOURNAL_QUERY || 'subject:"Internet Transaction Journal"';
      console.log(`[GMAIL-SYNC] 🎯 Menjalankan pencarian subjek: "${qSubjectJournal}"`);
      const listSubj = await fetchMessageList(qSubjectJournal);
      if (listSubj !== null) addCandidates(listSubj);

      // Prioritas 3: Hanya jika kandidat masih sedikit (< 5), cari transaksi BCA bertarget lainnya dari pengirim resmi BCA
      if (candidateMap.size < 5) {
        const qTx = config.TARGETED_QUERY || 'from:(bca.co.id OR klikbca.com) ("Internet Transaction Journal" OR subject:transaksi OR subject:transfer OR subject:pembayaran OR subject:bukti OR subject:journal)';
        const listTx = await fetchMessageList(qTx);
        if (listTx !== null) addCandidates(listTx);
      }

      // Prioritas 4: Fallback hanya jika belum ada hasil sama sekali (tetap batasi domain resmi BCA)
      if (candidateMap.size === 0) {
        const domainQuery = config.DOMAIN_QUERY || 'from:bca.co.id OR from:klikbca.com';
        const domainList = await fetchMessageList(domainQuery);
        if (domainList !== null) addCandidates(domainList);
      }

      const messages = Array.from(candidateMap.values());

      if (!messages.length) {
        isSyncing = false;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        broadcastStatus('idle', `Tidak ada email BCA ditemukan di Gmail. Terakhir sinkron ${timeStr}`);
        broadcastQueue();
        return;
      }

      console.log(`[GMAIL-SYNC] 📬 Terkumpul ${messages.length} email resmi BCA untuk dianalisis...`);

      let newItemsFound = 0;
      let autoSavedCount = 0;

      for (const item of messages) {
        const id = item.id;
        // Hanya lewati jika transaksi ini sudah secara sadar disimpan ('saved') atau diabaikan ('dismissed') oleh pengguna
        if (processedMap[id] === 'saved' || processedMap[id] === 'dismissed') {
          continue;
        }

        // Ambil isi lengkap pesan
        const getUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
        const msgRes = await fetch(getUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!msgRes.ok) continue;

        const msgData = await msgRes.json();
        const payload = msgData.payload || {};
        const headers = payload.headers || [];

        // Ambil hanya header From dan Subject (Header To secara tegas diabaikan sesuai privasi)
        const fromHeader = (headers.find(h => h.name && h.name.toLowerCase() === 'from') || {}).value || '';
        const subjectHeader = (headers.find(h => h.name && h.name.toLowerCase() === 'subject') || {}).value || '';

        console.log(`[GMAIL-SYNC] Memeriksa email [${id}]: From="${fromHeader}", Subject="${subjectHeader}"`);

        const bodyText = extractBodyFromPayload(payload);
        const parseResult = parserApi.parseBcaEmail({
          subject: subjectHeader,
          from: fromHeader,
          bodyText,
          internalDate: msgData.internalDate
        });

        if (!parseResult || !parseResult.tx) {
          console.log(`[GMAIL-SYNC] ⏩ Email [${id}] ("${subjectHeader}") bukan notifikasi transaksi finansial BCA (dilewati).`);
          continue;
        }

        const { tx, warnings } = parseResult;
        tx.gmail_message_id = id;
        console.log(`[GMAIL-SYNC] ✅ Transaksi BCA berhasil diekstrak: ${tx.tujuan} - Rp ${tx.total} (${tx.tanggal})`);

        // Cek deteksi duplikasi terhadap transaksi yang sudah tersimpan
        const isDuplicate = checkIsDuplicate(tx);
        if (isDuplicate) {
          warnings.push('Mungkin duplikat: Transaksi serupa tercatat pada waktu yang berdekatan');
        }

        // Jika Auto-Input aktif dan bukan duplikat, simpan langsung ke riwayat transaksi kas
        const storageApi = window.KeuanganStorage || (root && root.KeuanganStorage);
        if (isAutoInputEnabled() && !isDuplicate && storageApi && typeof storageApi.addTransaction === 'function') {
          storageApi.addTransaction(tx);
          markMessageStatus(id, 'saved');
          autoSavedCount++;
          console.log(`[GMAIL-SYNC] ⚡ Transaksi [${id}] otomatis disimpan ke Pengeluaran/Pemasukan: Rp ${tx.total}`);
          continue;
        }

        // Cek apakah item ini sudah ada di antrean memori saat ini
        const alreadyInQueue = reviewQueue.some(q => q.messageId === id);
        if (!alreadyInQueue) {
          reviewQueue.push({
            messageId: id,
            tx,
            warnings: warnings || []
          });
          newItemsFound++;
        }
      }

      isSyncing = false;
      const now = new Date();
      lastSyncTime = now;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (autoSavedCount > 0 && typeof onAutoSaveCallback === 'function') {
        onAutoSaveCallback(autoSavedCount);
      }

      if (autoSavedCount > 0 && reviewQueue.length === 0) {
        broadcastStatus('idle', `✅ ${autoSavedCount} transaksi BCA berhasil diinput otomatis ke Kas! Terakhir sinkron ${timeStr}`);
      } else if (autoSavedCount > 0 && reviewQueue.length > 0) {
        broadcastStatus('has_items', `✅ ${autoSavedCount} diinput otomatis, ${reviewQueue.length} menunggu tinjauan.`);
      } else if (reviewQueue.length > 0) {
        broadcastStatus('has_items', `${reviewQueue.length} transaksi menunggu tinjauan.`);
      } else {
        broadcastStatus('idle', `Dipindai ${messages.length} email BCA, tidak ditemukan transaksi baru. Terakhir sinkron ${timeStr}`);
      }

      broadcastQueue();
      broadcastLoopStatus();
    } catch (err) {
      console.warn('[GMAIL-SYNC] Gagal sinkronisasi:', err);
      isSyncing = false;
      broadcastStatus('error', 'Gagal menyinkronkan email. Periksa koneksi internet Anda.');
    }
  }

  /**
   * Putuskan koneksi akun Gmail
   */
  function disconnect() {
    stopAutoSyncLoop();
    if (accessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(accessToken, () => {});
      } catch (_) {}
    }
    accessToken = null;
    clearStoredToken();
    clearConnectionState();
    reviewQueue = [];
    currentQueueIndex = 0;
    broadcastStatus('disconnected', 'Gmail telah diputuskan.');
    broadcastQueue();
  }

  /**
   * Manajemen Antrean Tinjauan
   */
  function getQueue() {
    return reviewQueue;
  }

  function getCurrentItem() {
    if (!reviewQueue.length) return null;
    if (currentQueueIndex >= reviewQueue.length) {
      currentQueueIndex = 0;
    }
    return reviewQueue[currentQueueIndex] || null;
  }

  function markItemSaved(messageId) {
    markMessageStatus(messageId, 'saved');
    reviewQueue = reviewQueue.filter(item => item.messageId !== messageId);
    if (currentQueueIndex >= reviewQueue.length) {
      currentQueueIndex = Math.max(0, reviewQueue.length - 1);
    }
    broadcastQueue();
    if (reviewQueue.length === 0) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      broadcastStatus('idle', `Semua transaksi telah ditinjau. Terakhir sinkron ${timeStr}`);
    }
  }

  function markItemDismissed(messageId) {
    markMessageStatus(messageId, 'dismissed');
    reviewQueue = reviewQueue.filter(item => item.messageId !== messageId);
    if (currentQueueIndex >= reviewQueue.length) {
      currentQueueIndex = Math.max(0, reviewQueue.length - 1);
    }
    broadcastQueue();
    if (reviewQueue.length === 0) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      broadcastStatus('idle', `Seluruh antrean selesai. Terakhir sinkron ${timeStr}`);
    }
  }

  function saveAllQueueItems() {
    const storageApi = window.KeuanganStorage || (root && root.KeuanganStorage);
    if (!storageApi || !reviewQueue.length) return 0;
    let saved = 0;
    for (const item of reviewQueue) {
      storageApi.addTransaction(item.tx);
      markMessageStatus(item.messageId, 'saved');
      saved++;
    }
    reviewQueue = [];
    currentQueueIndex = 0;
    broadcastQueue();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    broadcastStatus('idle', `✅ ${saved} transaksi BCA berhasil disimpan ke Kas! Terakhir sinkron ${timeStr}`);
    if (typeof onAutoSaveCallback === 'function') {
      onAutoSaveCallback(saved);
    }
    return saved;
  }

  function onAutoSave(fn) {
    onAutoSaveCallback = fn;
  }

  function skipItem() {
    if (reviewQueue.length <= 1) return;
    currentQueueIndex = (currentQueueIndex + 1) % reviewQueue.length;
    broadcastQueue();
  }

  function onQueueChange(fn) {
    onQueueChangeCallback = fn;
  }

  function onStatusChange(fn) {
    onStatusChangeCallback = fn;
  }

  // Smart Visibility Wake-up: Saat pengguna kembali ke tab, otomatis periksa jika interval sudah lewat
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isLoopActive) {
        const state = getConnectionState();
        if (state.connected && accessToken) {
          const now = Date.now();
          if (!lastSyncTime || (now - lastSyncTime.getTime()) > (120 * 1000)) {
            console.log('[GMAIL-SYNC] 👁️ Tab aktif kembali, menjalankan auto-check transaksi...');
            syncNow({ isAutoLoop: true });
          }
        }
      }
    });
  }

  const api = {
    connect,
    loginWithGoogle,
    switchAccount,
    openConnectModal,
    setModalHandler,
    onConnectSuccess,
    onConnectError,
    trySilentSync,
    syncNow,
    startAutoSyncLoop,
    stopAutoSyncLoop,
    isAutoSyncLoopActive: () => isLoopActive,
    isAutoSyncLoopEnabled,
    setAutoSyncLoopEnabled,
    onLoopStatusChange,
    getLoopState,
    disconnect,
    resetProcessed,
    getQueue,
    getCurrentItem,
    markItemSaved,
    markItemDismissed,
    skipItem,
    saveAllQueueItems,
    isAutoInputEnabled,
    setAutoInputEnabled,
    onAutoSave,
    onQueueChange,
    onStatusChange,
    getConnectionState,
    convertHtmlTableToText,
    base64UrlDecode
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GmailSync = api;
  }
})(typeof window !== 'undefined' ? window : this);
