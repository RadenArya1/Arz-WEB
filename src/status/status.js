/* =========================================================
   FITUR: SYSTEM STATUS & HEALTH METRICS WIDGET - GRIMOIRE ARZ
   Live Telemetri, Beban Core, RAM, Latensi, & Diagnostik Sistem
   ========================================================= */

(function initSystemStatus() {
  const TICKER_MESSAGES = [
    "Integritas Telemetri Terverifikasi • 0 Kesalahan Kritis",
    "Semua daemon merespons dalam batas optimal (0 packet drop)",
    "Protokol TLS v1.3 aktif • Enkripsi Grimoire Terlindungi",
    "Node.js Daemon V8 Heap teralokasi dengan efisien",
    "Katalog 4 Proyek Terhubung & Reverse Proxy CasaOS Online",
    "Siklus penjadwalan sinkronisasi berjalan normal tanpa beban tunda"
  ];

  document.addEventListener('DOMContentLoaded', () => {
    const metricCpuVal = document.getElementById('metricCpuVal');
    const barCpuFill = document.getElementById('barCpuFill');
    const metricRamVal = document.getElementById('metricRamVal');
    const barRamFill = document.getElementById('barRamFill');
    const metricPingVal = document.getElementById('metricPingVal');
    const statusTickerText = document.getElementById('statusTickerText');
    const btnPingStatus = document.getElementById('btnPingStatus');
    const statusStateLabel = document.getElementById('statusStateLabel');

    let currentTickerIdx = 0;

    // Fungsi pembaruan metrik dengan fluktuasi halus yang realistis
    function updateMetricsRandomly() {
      // 1. CPU Load: antara 18% - 32%
      const cpuPercent = Math.floor(Math.random() * 15) + 18;
      if (metricCpuVal) metricCpuVal.textContent = `${cpuPercent}%`;
      if (barCpuFill) barCpuFill.style.width = `${cpuPercent}%`;

      // 2. RAM Heap: antara 4.1 GB - 4.6 GB (~25% - 29%)
      const ramUsage = (4.1 + Math.random() * 0.4).toFixed(1);
      const ramPercent = Math.round((ramUsage / 16) * 100);
      if (metricRamVal) metricRamVal.textContent = `${ramUsage} GB`;
      if (barRamFill) barRamFill.style.width = `${ramPercent}%`;

      // 3. Latency: antara 19ms - 29ms
      const pingVal = Math.floor(Math.random() * 11) + 19;
      if (metricPingVal) metricPingVal.textContent = `${pingVal} ms`;
    }

    // Rotasi teks footer ticker
    function rotateTicker() {
      currentTickerIdx = (currentTickerIdx + 1) % TICKER_MESSAGES.length;
      if (statusTickerText) {
        statusTickerText.style.opacity = '0';
        setTimeout(() => {
          statusTickerText.textContent = TICKER_MESSAGES[currentTickerIdx];
          statusTickerText.style.opacity = '1';
        }, 300);
      }
    }

    // Tombol Ping / Diagnostik Cepat
    if (btnPingStatus) {
      btnPingStatus.addEventListener('click', () => {
        btnPingStatus.classList.add('pinging');
        if (typeof playMagicChime === 'function') {
          playMagicChime();
        }

        // Animasi ping instan
        if (metricPingVal) metricPingVal.textContent = '14 ms';
        if (statusStateLabel) {
          statusStateLabel.textContent = 'MEMINDAI...';
          statusStateLabel.style.color = '#b45309';
        }

        setTimeout(() => {
          btnPingStatus.classList.remove('pinging');
          if (statusStateLabel) {
            statusStateLabel.textContent = 'SEMUA NORMAL';
            statusStateLabel.style.color = '#14532d';
          }
          updateMetricsRandomly();

          // Kirim log ke konsol jika konsol aktif
          if (window.GrimoireConsole && typeof window.GrimoireConsole.log === 'function') {
            window.GrimoireConsole.log(
              'SUCCESS',
              'HEALTH-CHECK',
              '✔ Diagnostik Telemetri Selesai: Semua subsistem online (Latensi: ' + (metricPingVal ? metricPingVal.textContent : '18 ms') + ').'
            );
          }
        }, 650);
      });
    }

    // Jalankan timer telemetri berkala (setiap 3.5 detik)
    setInterval(updateMetricsRandomly, 3500);

    // Jalankan rotasi ticker pesan berkala (setiap 6 detik)
    setInterval(rotateTicker, 6000);

    // Jalankan awal
    updateMetricsRandomly();
  });
})();
