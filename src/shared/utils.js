/* =========================================================
   SHARED UTILITIES - GRIMOIRE ARZ
   Storage Keys & Helper Functions
   ========================================================= */

const STORAGE_KEYS = {
  TASKS: 'arz_grimoire_tasks',
  NOTES: 'arz_grimoire_notes',
  CUSTOM_SHORTCUTS: 'arz_grimoire_shortcuts'
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Auto-redirect jika halaman dibuka via protokol file:// dan server lokal 8080 aktif
(function autoRedirectFileToHttp() {
  if (window.location.protocol === 'file:') {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    fetch('http://127.0.0.1:8080/api/absen/status', { signal: AbortSignal.timeout(1500) })
      .then(res => {
        if (res.ok) {
          window.location.replace(`http://127.0.0.1:8080/${filename}`);
        }
      })
      .catch(() => {});
  }
})();
