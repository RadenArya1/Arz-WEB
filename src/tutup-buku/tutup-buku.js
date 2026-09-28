/* =========================================================
   FITUR: TUTUP BUKU - GRIMOIRE ARZ
   Aksi Penutupan Grimoire dan Kembali ke Sampul Depan
   ========================================================= */

(function initTutupBuku() {
  document.addEventListener('DOMContentLoaded', () => {
    const btnCloseBook = document.getElementById('btnCloseBook');
    const coverView = document.getElementById('coverView');
    const dashboardView = document.getElementById('dashboardView');

    // TUTUP BUKU: Kembali dari Dashboard ke Sampul Depan dengan Efek Suara
    if (btnCloseBook && coverView && dashboardView) {
      btnCloseBook.addEventListener('click', () => {
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }
        dashboardView.classList.add('hidden');
        coverView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });
})();
