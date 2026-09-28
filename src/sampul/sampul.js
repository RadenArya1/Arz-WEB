/* =========================================================
   FITUR: SAMPUL BUKU (COVER VIEW) - GRIMOIRE ARZ
   Clock, Greeting, and Enter Grimoire Action
   ========================================================= */

(function initSampul() {
  const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const INDONESIAN_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  function updateLiveTime() {
    const now = new Date();
    
    // Format Jam: HH:MM:SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    // Format Tanggal
    const dayName = INDONESIAN_DAYS[now.getDay()];
    const dateNum = now.getDate();
    const monthName = INDONESIAN_MONTHS[now.getMonth()];
    const year = now.getFullYear();
    const fullDateString = `${dayName}, ${dateNum} ${monthName} ${year}`;
    const shortDateString = `${dayName}, ${dateNum} ${monthName.slice(0, 3)} ${year}`;

    // Tentukan fase hari
    const currentHour = now.getHours();
    let phaseGreeting = "Pagi Hari";
    let greetingWord = "Selamat Pagi, Arz!";
    if (currentHour >= 5 && currentHour < 11) {
      phaseGreeting = "Pagi yang Cerah";
      greetingWord = "Selamat Pagi, Arz!";
    } else if (currentHour >= 11 && currentHour < 15) {
      phaseGreeting = "Siang yang Terik";
      greetingWord = "Selamat Siang, Arz!";
    } else if (currentHour >= 15 && currentHour < 18) {
      phaseGreeting = "Sore yang Tenang";
      greetingWord = "Selamat Sore, Arz!";
    } else {
      phaseGreeting = "Malam Berbintang";
      greetingWord = "Selamat Malam, Arz!";
    }

    // Perbarui elemen UI Cover
    const coverClock = document.getElementById('coverClock');
    const coverDate = document.getElementById('coverDate');
    const phaseText = document.getElementById('phaseText');
    if (coverClock) coverClock.textContent = timeString;
    if (coverDate) coverDate.textContent = fullDateString;
    if (phaseText) phaseText.textContent = phaseGreeting;

    // Perbarui elemen UI Dashboard Navbar
    const navClock = document.getElementById('navClock');
    const navDate = document.getElementById('navDate');
    const greetingTimeText = document.getElementById('greetingTimeText');
    if (navClock) navClock.textContent = timeString;
    if (navDate) navDate.textContent = shortDateString;
    if (greetingTimeText) greetingTimeText.textContent = greetingWord;
  }

  setInterval(updateLiveTime, 1000);
  updateLiveTime();

  // BUKA BUKU & NAVIGASI MOBILE: Tombol Masuk dan Floating Page Switcher
  document.addEventListener('DOMContentLoaded', () => {
    const btnEnter = document.getElementById('btnEnter');
    const coverView = document.getElementById('coverView');
    const dashboardView = document.getElementById('dashboardView');
    const btnMobilePageSwitch = document.getElementById('btnMobilePageSwitch');
    const fabLabel = document.getElementById('fabLabel');
    const fabIcon = document.getElementById('fabIcon');
    const fabArrow = document.getElementById('fabArrow');

    // Fungsi reset tampilan mobile ke Halaman Kiri (Katalog Proyek)
    function resetMobilePageToLeft() {
      if (dashboardView) {
        dashboardView.setAttribute('data-mobile-page', 'left');
      }
      if (fabLabel) fabLabel.textContent = 'Konsol & Status';
      if (fabIcon) fabIcon.className = 'fa-solid fa-terminal';
      if (fabArrow) fabArrow.className = 'fa-solid fa-arrow-right fab-arrow';
    }

    if (btnEnter && coverView && dashboardView) {
      btnEnter.addEventListener('click', () => {
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }
        // Pastikan saat masuk di HP, selalu membuka UI sebelah kiri pertama kali
        resetMobilePageToLeft();

        coverView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        window.scrollTo({ top: 0 });
      });
    }

    // Tombol Melayang (Floating Action Button): Berpindah antara UI Kiri dan Kanan di HP
    if (btnMobilePageSwitch && dashboardView) {
      btnMobilePageSwitch.addEventListener('click', () => {
        const currentPage = dashboardView.getAttribute('data-mobile-page') || 'left';
        
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }

        if (currentPage === 'left') {
          // Pindah ke UI Kanan (Konsol & Status)
          dashboardView.setAttribute('data-mobile-page', 'right');
          if (fabLabel) fabLabel.textContent = 'Katalog Proyek';
          if (fabIcon) fabIcon.className = 'fa-solid fa-book-open';
          if (fabArrow) fabArrow.className = 'fa-solid fa-arrow-left fab-arrow';
        } else {
          // Pindah kembali ke UI Kiri (Katalog Proyek)
          dashboardView.setAttribute('data-mobile-page', 'left');
          if (fabLabel) fabLabel.textContent = 'Konsol & Status';
          if (fabIcon) fabIcon.className = 'fa-solid fa-terminal';
          if (fabArrow) fabArrow.className = 'fa-solid fa-arrow-right fab-arrow';
        }
      });
    }
  });
})();
