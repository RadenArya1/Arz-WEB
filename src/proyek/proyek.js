/* =========================================================
   FITUR: PROYEK WEB (LEMBARAN KIRI) - GRIMOIRE ARZ
   Logic Manajemen Katalog Proyek & Integrasi Sinyal ke Konsol
   ========================================================= */

(function initProyekWeb() {
  const STORAGE_KEY = 'grimoire_web_projects_v11';

  const DEFAULT_PROJECTS = [
    {
      id: 'proj_money_tracker',
      title: 'Money Tracker (Pencatatan Keuangan)',
      icon: 'fa-coins',
      status: 'active',
      statusLabel: 'Aktif',
      desc: 'Aplikasi web mandiri untuk pencatatan pengeluaran harian, deteksi kategori otomatis dari teks struk BCA QR & m-Transfer, serta analitik grafik Chart.js.',
      target: 'keuangan.html (Web Mandiri)',
      url: 'keuangan.html',
      tags: ['Money Tracker', 'Vanilla JS', 'Chart.js', 'Smart Parser', 'Auto Category']
    },
    {
      id: 'proj_ethol_sync',
      title: 'Ethol Academic Notifier',
      icon: 'fa-calendar-check',
      status: 'active',
      statusLabel: 'Aktif',
      desc: 'Executive Presensi Deck ETHOL PENS — automasi presensi cerdas, radial countdown ring, linimasa kehadiran real-time, audit bukti layar, dan metamorfosis warna tema saat loop.',
      target: 'ethol-notifier/ (Web Mandiri)',
      url: 'ethol-notifier/index.html',
      tags: ['Ethol PENS', 'Puppeteer', 'Executive Deck', 'Auto Absen', 'Radial Ring', 'Loop Theme', 'SSE']
    },
    {
      id: 'proj_student_web',
      title: 'Student Website & Expense Tracker',
      icon: 'fa-building-columns',
      status: 'active',
      statusLabel: 'Aktif',
      desc: 'Website pribadi mahasiswa untuk manajemen tugas perkuliahan dan pencatatan pengeluaran harian dari foto nota via Tesseract OCR (ind+eng).',
      target: 'casaos.raidenarya.my.id (Live)',
      url: 'http://casaos.raidenarya.my.id',
      tags: ['Node.js', 'Express', 'MySQL', 'EJS', 'Tesseract OCR', 'CasaOS']
    },
    {
      id: 'proj_grimoire_ui',
      title: 'Grimoire Dashboard - Arz',
      icon: 'fa-book-skull',
      status: 'active',
      statusLabel: 'Aktif',
      desc: 'Portal antarmuka mistis dengan simulasi buku interaktif, audio ambien alam, partikel sihir, dan konsol pemantau event terintegrasi.',
      target: 'Dashboard Utama (Halaman Ini)',
      url: '#',
      tags: ['Vanilla JS', 'Canvas Particle', 'Theme System', 'Web Audio']
    },
    {
      id: 'proj_alchemist_wiki',
      title: 'Alchemist Study Notes & Wiki',
      icon: 'fa-feather-pointed',
      status: 'wip',
      statusLabel: 'Perbaikan',
      desc: 'Sistem dokumentasi dan catatan kuliah berbasis Markdown bergaya Frieren yang tenang, cepat, dan nyaman dibaca saat belajar.',
      target: 'Static Site / SSR',
      url: '#',
      tags: ['Markdown', 'KaTeX Math', 'Search Index', 'Clean Serif']
    },
    {
      id: 'proj_task_bot',
      title: 'AutoTask Telegram / Discord Bot',
      icon: 'fa-robot',
      status: 'wip',
      statusLabel: 'Perbaikan',
      desc: 'Bot pintar pengirim notifikasi pengingat tenggat waktu tugas kuliah H-3 & H-1 langsung ke ponsel melalui webhook (sedang dalam perbaikan).',
      target: 'Webhook Receiver',
      url: '#',
      tags: ['Telegram Bot API', 'Discord.js', 'Webhook', 'Push Alert']
    },
    {
      id: 'proj_grimoire_lab',
      title: 'Grimoire Sandbox & Tester Hub',
      icon: 'fa-flask-vial',
      status: 'active',
      statusLabel: 'Aktif',
      desc: 'Pusat isolasi website uji coba purwarupa (lab/auto-absen/) dan web tester TestSprite (testsprite_tests/) — eksklusif localhost, terproteksi dari deploy pw.',
      target: 'lab/ (Localhost Only)',
      url: 'lab/index.html',
      tags: ['Sandbox', 'TestSprite', 'Web Tester', 'Localhost Only', 'Experimental']
    }
  ];

  function getProjects() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('grimoire_web_projects_v9') || localStorage.getItem('grimoire_web_projects_v8');
      if (stored) {
        let parsed = JSON.parse(stored);
        
        // 1. Hapus status 'idea': konversikan seluruh proyek hanya ke 'active' atau 'wip'
        parsed = parsed.map(p => {
          if (p.status === 'idea' || (p.status !== 'active' && p.status !== 'wip')) {
            return { ...p, status: 'wip', statusLabel: 'Perbaikan' };
          }
          if (p.status === 'active' && !p.statusLabel) p.statusLabel = 'Aktif';
          if (p.status === 'wip' && !p.statusLabel) p.statusLabel = 'Perbaikan';
          return p;
        });

        // 2. Sinkronisasi Ikon Baku & Info Resmi dari DEFAULT_PROJECTS (Override ikon lama/duplikat di localStorage)
        DEFAULT_PROJECTS.forEach(def => {
          const idx = parsed.findIndex(p => p.id === def.id || (p.url && def.url && p.url !== '#' && p.url === def.url));
          if (idx !== -1) {
            parsed[idx].icon = def.icon; // Pastikan ikon resmi selalu diterapkan
            parsed[idx].title = def.title;
            parsed[idx].url = def.url;
            parsed[idx].target = def.target;
          } else {
            parsed.push(def);
          }
        });

        // 3. Audit Anti-Duplikasi Ikon Menyeluruh: Jika masih ada ikon kembar, ganti otomatis dengan ikon unik
        const seenIcons = new Set();
        const fallbackPool = ['fa-coins', 'fa-calendar-check', 'fa-building-columns', 'fa-book-skull', 'fa-feather-pointed', 'fa-robot', 'fa-compass', 'fa-fire-flame-curved', 'fa-microchip', 'fa-wand-magic-sparkles', 'fa-shield-halved'];
        
        parsed.forEach(p => {
          if (!p.icon || seenIcons.has(p.icon)) {
            const nextUnique = fallbackPool.find(ic => !seenIcons.has(ic)) || 'fa-cube';
            console.warn(`[KATALOG] Duplikasi ikon terdeteksi pada '${p.title}'. Mengubah '${p.icon}' -> '${nextUnique}'.`);
            p.icon = nextUnique;
          }
          seenIcons.add(p.icon);
        });

        saveProjects(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca projects dari localStorage:', e);
    }
    saveProjects(DEFAULT_PROJECTS);
    return DEFAULT_PROJECTS;
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Gagal menyimpan projects:', e);
    }
  }

  let currentProjects = getProjects();
  let globalRender = null;

  document.addEventListener('DOMContentLoaded', () => {
    let searchQuery = '';
    let currentCategory = 'ALL';

    const container = document.getElementById('projectsContainer');
    const searchInput = document.getElementById('projectSearchInput');
    const catTabs = document.getElementById('projectCategoryTabs');

    function render() {
      if (!container) return;

      const filtered = currentProjects.filter(p => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q || 
          p.title.toLowerCase().includes(q) || 
          p.desc.toLowerCase().includes(q) || 
          (p.tags && p.tags.some(t => t.toLowerCase().includes(q)));
        
        const matchesCategory = currentCategory === 'ALL' || p.status === currentCategory;
        return matchesSearch && matchesCategory;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="projects-empty">
            <i class="fa-solid fa-scroll"></i>
            <p>Tidak ada proyek untuk kategori atau kata kunci tersebut.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(p => {
        const statusClass = p.status || 'idea';
        const isGrimoire = p.id === 'proj_grimoire_ui';
        
        let linkBtn = '';
        if (p.url && p.url !== '#' && !isGrimoire) {
          linkBtn = `<a href="${p.url}" class="btn-popover-link" title="Buka Aplikasi Web (${p.url})"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka</a>`;
        }

        const actionsHtml = isGrimoire ? `
              <div class="popover-actions">
                <span class="popover-host-badge" title="Halaman dashboard utama yang sedang aktif">
                  <i class="fa-solid fa-circle-check"></i> Status: Aktif (Host Utama)
                </span>
              </div>
        ` : `
              <div class="popover-actions">
                <button class="btn-popover-ping" data-id="${p.id}" title="Kirim sinyal uji ke Konsol Notifikasi">
                  <i class="fa-solid fa-tower-broadcast"></i> Sinyal
                </button>
                ${linkBtn}
                <button class="btn-popover-del" data-id="${p.id}" title="Hapus dari katalog">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
        `;

        return `
          <div class="project-icon-tile status-${statusClass}${isGrimoire ? ' tile-grimoire' : ''}" data-id="${p.id}" tabindex="0">
            <div class="project-icon-box" data-id="${p.id}" title="${escapeHtml(p.title)} (${escapeHtml(p.statusLabel || p.status)})">
              <span class="status-pulse-dot" title="${escapeHtml(p.statusLabel || p.status)}"></span>
              <i class="fa-solid ${p.icon || 'fa-globe'}"></i>
            </div>
            <span class="project-icon-label" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</span>

            <!-- Popover Detail Interaktif -->
            <div class="project-popover">
              <div class="popover-header">
                <span class="popover-badge ${statusClass}">
                  <i class="fa-solid fa-circle" style="font-size: 0.38rem;"></i> ${escapeHtml(p.statusLabel || p.status)}
                </span>
                <span class="popover-target"><i class="fa-solid fa-server"></i> ${escapeHtml(p.target || 'Web App')}</span>
              </div>
              <h4 class="popover-title">${escapeHtml(p.title)}</h4>
              <p class="popover-desc">${escapeHtml(p.desc)}</p>
              ${p.note ? `<div class="popover-note-badge" style="margin: 4px 0 8px; font-size: 0.72rem; color: #b45309; background: rgba(245, 158, 11, 0.18); padding: 4px 6px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.35); text-align: left;"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Kendala:</strong> ${escapeHtml(p.note)}</div>` : ''}
              ${actionsHtml}
            </div>
          </div>
        `;
      }).join('');

      // Pasang event listener untuk Klik Langsung pada Kotak Icon
      container.querySelectorAll('.project-icon-box').forEach(box => {
        box.addEventListener('click', (e) => {
          // Cegah trigger jika klik berasal dari popover
          if (e.target.closest('.project-popover')) return;

          const id = box.getAttribute('data-id');
          const targetProj = currentProjects.find(p => p.id === id);
          if (!targetProj) return;

          // Khusus Grimoire Dashboard: tidak ada logic buka, hanya memunculkan status saja via popover
          if (targetProj.id === 'proj_grimoire_ui') {
            e.stopPropagation();
            const tile = box.closest('.project-icon-tile');
            if (tile) {
              const wasOpen = tile.classList.contains('show-popover');
              container.querySelectorAll('.project-icon-tile.show-popover').forEach(t => t.classList.remove('show-popover'));
              if (!wasOpen) {
                tile.classList.add('show-popover');
              }
            }
            return;
          }

          if (targetProj.url && targetProj.url !== '#') {
            window.location.href = targetProj.url;
          } else {
            // Jika tidak ada URL aktif, kirim sinyal uji
            handlePingSignal(targetProj, box);
          }
        });
      });

      // Klik di luar area project-icon-tile untuk menutup popover yang terbuka lewat klik
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.project-icon-tile')) {
          container.querySelectorAll('.project-icon-tile.show-popover').forEach(t => t.classList.remove('show-popover'));
        }
      });

      // Pasang event listener untuk Tombol Ping Sinyal di Popover
      container.querySelectorAll('.btn-popover-ping').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const targetProj = currentProjects.find(p => p.id === id);
          if (targetProj) {
            handlePingSignal(targetProj, btn);
          }
        });
      });

      // Pasang event listener untuk Hapus di Popover
      container.querySelectorAll('.btn-popover-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const targetProj = currentProjects.find(p => p.id === id);
          if (targetProj && confirm(`Hapus "${targetProj.title}" dari katalog?`)) {
            currentProjects = currentProjects.filter(p => p.id !== id);
            saveProjects(currentProjects);
            render();
            if (window.GrimoireConsole) {
              window.GrimoireConsole.log('WARN', 'KATALOG', `Proyek '${targetProj.title}' telah dihapus dari daftar rencana.`);
            }
          }
        });
      });
    }

    function handlePingSignal(project, btnElement) {
      const isButton = btnElement.tagName.toLowerCase() === 'button';
      const originalText = isButton ? btnElement.innerHTML : null;

      if (isButton) {
        btnElement.innerHTML = '<i class="fa-solid fa-circle-check"></i> Terkirim!';
        btnElement.style.background = '#4a5b48';
      } else {
        btnElement.style.transform = 'scale(0.92)';
      }

      setTimeout(() => {
        if (isButton && originalText) {
          btnElement.innerHTML = originalText;
          btnElement.style.background = '';
        } else {
          btnElement.style.transform = '';
        }
      }, 1000);

      if (typeof playMagicChime === 'function') {
        playMagicChime();
      }

      if (window.GrimoireConsole) {
        const tag = project.title.split(' ')[0].toUpperCase();
        window.GrimoireConsole.log(
          'EVENT', 
          tag, 
          `📡 Sinyal diterima dari [${project.title}]: Host '${project.target}' terverifikasi normal!`
        );
      }
    }

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Event Search Real-time
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    // Event Filter Kategori Proyek
    if (catTabs) {
      catTabs.querySelectorAll('.proj-cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          catTabs.querySelectorAll('.proj-cat-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          currentCategory = tab.getAttribute('data-category') || 'ALL';
          render();
        });
      });
    }

    // Render awal
    globalRender = render;
    render();
  });

  // ─── PUBLIC API: MANAJEMEN STATUS SHORTCUT & AUTO-REGISTER ───
  function setProjectStatus(idOrUrl, newStatus, errorNote) {
    const status = (newStatus === 'active') ? 'active' : 'wip';
    const statusLabel = (status === 'active') ? 'Aktif' : 'Perbaikan';
    let list = getProjects();
    const query = String(idOrUrl).toLowerCase();

    const idx = list.findIndex(p => 
      p.id.toLowerCase() === query || 
      (p.url && p.url.toLowerCase().includes(query)) || 
      p.title.toLowerCase().includes(query)
    );

    if (idx !== -1) {
      list[idx].status = status;
      list[idx].statusLabel = statusLabel;
      if (errorNote) {
        list[idx].note = errorNote;
      } else if (status === 'active') {
        delete list[idx].note;
      }
      currentProjects = list;
      saveProjects(list);
      if (typeof globalRender === 'function') {
        globalRender();
      }
      if (window.GrimoireConsole) {
        const level = (status === 'active') ? 'SUCCESS' : 'WARN';
        window.GrimoireConsole.log(
          level, 
          'KATALOG', 
          `Status shortcut '${list[idx].title}' diperbarui: [${statusLabel}]${errorNote ? ' — Kendala: ' + errorNote : ''}`
        );
      }
      return true;
    }
    return false;
  }

  function registerProjectShortcut(proj) {
    if (!proj || !proj.title) return false;
    let list = getProjects();
    const id = proj.id || ('proj_' + proj.title.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    const status = (proj.status === 'wip') ? 'wip' : 'active';
    const statusLabel = (status === 'active') ? 'Aktif' : 'Perbaikan';

    // Validasi Ikon Wajib Unik (Anti-Duplikasi Ikon)
    let icon = proj.icon || 'fa-globe';
    const usedIcons = list.filter(p => p.id !== id && (!proj.url || p.url !== proj.url)).map(p => p.icon);
    if (usedIcons.includes(icon)) {
      console.warn(`[KATALOG] Peringatan: Ikon '${icon}' sudah dipakai oleh proyek lain! Ikon di katalog wajib unik.`);
      const fallbackIcons = ['fa-cube', 'fa-compass', 'fa-fire-flame-curved', 'fa-scroll', 'fa-microchip', 'fa-wand-magic-sparkles', 'fa-shield-halved', 'fa-meteor'];
      icon = fallbackIcons.find(ic => !usedIcons.includes(ic)) || 'fa-shapes';
    }

    const newEntry = {
      id: id,
      title: proj.title,
      icon: icon,
      status: status,
      statusLabel: statusLabel,
      desc: proj.desc || 'Modul web mandiri Grimoire Ecosystem.',
      target: proj.target || (proj.url ? proj.url : 'Web Mandiri'),
      url: proj.url || '#',
      tags: proj.tags || [proj.title, 'Web App']
    };
    if (proj.note) newEntry.note = proj.note;

    const existingIdx = list.findIndex(p => p.id === id || (p.url && proj.url && p.url === proj.url));
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...newEntry };
    } else {
      list.push(newEntry);
    }
    currentProjects = list;
    saveProjects(list);
    if (typeof globalRender === 'function') {
      globalRender();
    }
    if (window.GrimoireConsole) {
      window.GrimoireConsole.log('EVENT', 'KATALOG', `Shortcut baru '${newEntry.title}' [${statusLabel}] berhasil didaftarkan ke katalog (Ikon: ${newEntry.icon}).`);
    }
    return true;
  }

  function getUsedIcons() {
    return getProjects().map(p => p.icon);
  }

  // Ekspos ke global window
  window.GrimoireCatalog = {
    getProjects,
    saveProjects,
    setProjectStatus,
    registerProjectShortcut,
    getUsedIcons,
  };
  window.setProjectStatus = setProjectStatus;
  window.registerProjectShortcut = registerProjectShortcut;
  window.getUsedIcons = getUsedIcons;
})();
