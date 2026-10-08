/* =========================================================
   GMAIL CLIENT CONFIGURATION - ARCANUM FINANCE
   Konfigurasi Google Identity Services & Gmail REST API v1
   ========================================================= */

(function(root) {
  // Client ID OAuth 2.0 Web Application Google Cloud
  // Catatan Keamanan: Client ID bersifat publik pada SPA client-side.
  // Jangan pernah menambahkan Client Secret di sini.
  const DEFAULT_CLIENT_ID = '729536543963-d08v26sajgsf5qqglb311mnq0usivbb8.apps.googleusercontent.com';
  const STORAGE_KEY = 'grimoire_google_client_id_v1';

  function getStoredClientId() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && stored.trim()) return stored.trim();
      }
    } catch (e) {}
    return null;
  }

  function setStoredClientId(newId) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (!newId || !newId.trim() || newId.trim() === DEFAULT_CLIENT_ID) {
          window.localStorage.removeItem(STORAGE_KEY);
        } else {
          window.localStorage.setItem(STORAGE_KEY, newId.trim());
        }
      }
    } catch (e) {}
  }

  function getEffectiveClientId() {
    const stored = getStoredClientId();
    // Jika di localStorage masih tersimpan demo atau dummy placeholder, bersihkan segera
    if (stored && (stored.includes('demo') || stored === 'GANTI_DENGAN_CLIENT_ID')) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {}
      return DEFAULT_CLIENT_ID;
    }
    if (stored && stored.length > 20 && stored.includes('.apps.googleusercontent.com')) {
      return stored;
    }
    return DEFAULT_CLIENT_ID;
  }

  function hasValidClientId() {
    const id = getEffectiveClientId();
    return Boolean(
      id && 
      id !== 'GANTI_DENGAN_CLIENT_ID' && 
      !id.includes('demo') && 
      id.includes('.apps.googleusercontent.com')
    );
  }

  // Scope otorisasi: Wajib Read-Only Gmail
  const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

  // Parameter kriteria pencarian email notifikasi BCA
  const SENDER = 'bca@bca.co.id';
  const SUBJECT = '';
  const LOOKBACK_DAYS = 0; // 0 = Pindai seluruh riwayat transaksi tanpa memotong tanggal
  const MAX_MESSAGES = 100;

  // Pembentukan query dasar pencarian Gmail bertarget transaksi BCA resmi
  const JOURNAL_QUERY = 'from:(bca.co.id OR klikbca.com) "Internet Transaction Journal"';
  const SUBJECT_JOURNAL_QUERY = 'subject:"Internet Transaction Journal"';
  const TARGETED_QUERY = 'from:(bca.co.id OR klikbca.com) ("Internet Transaction Journal" OR subject:transaksi OR subject:transfer OR subject:pembayaran OR subject:bukti OR subject:journal)';
  const DOMAIN_QUERY = 'from:bca.co.id OR from:klikbca.com';

  const GMAIL_QUERY = JOURNAL_QUERY;

  /**
   * Menghasilkan query lengkap dengan batas waktu lookback days jika ditentukan
   * @param {number} days
   * @returns {string}
   */
  function getQueryWithLookback(days = LOOKBACK_DAYS) {
    const d = Number(days);
    if (!d || d <= 0) {
      return GMAIL_QUERY;
    }
    return `${GMAIL_QUERY} newer_than:${d}d`;
  }

  const config = {
    DEFAULT_CLIENT_ID,
    STORAGE_KEY,
    getClientId: getEffectiveClientId,
    setClientId: setStoredClientId,
    hasValidClientId,
    SCOPE,
    SENDER,
    SUBJECT,
    LOOKBACK_DAYS,
    MAX_MESSAGES,
    GMAIL_QUERY,
    JOURNAL_QUERY,
    SUBJECT_JOURNAL_QUERY,
    TARGETED_QUERY,
    DOMAIN_QUERY,
    getQueryWithLookback
  };

  // Properti CLIENT_ID dinamis (selalu membaca konfigurasi aktif)
  Object.defineProperty(config, 'CLIENT_ID', {
    get: getEffectiveClientId,
    enumerable: true,
    configurable: true
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
  } else {
    root.GmailConfig = config;
  }
})(typeof window !== 'undefined' ? window : this);
