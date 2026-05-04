// js/pages/search.js
const SearchPage = (() => {

  let allProfiles = [];
  let filtered = [];
  let currentFilters = { q: '', continent: '', age_min: 18, age_max: 70, gender: '', body_type: '', relation: '' };
  let tmpBodyType = '';

  function onlineStatus(last_active_at) {
    if (!last_active_at) return { color: '#6b7280', label: 'Hors ligne' };
    const diff = Date.now() - new Date(last_active_at);
    if (diff < 600000)  return { color: '#22c55e', label: 'En ligne' };
    if (diff < 3600000) return { color: '#f59e0b', label: 'Absent' };
    return { color: '#6b7280', label: 'Hors ligne' };
  }

  function FLAG(code) {
    if (!code || code.length !== 2) return '🌍';
    try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); }
    catch { return '🌍'; }
  }

  function renderCard(p) {
    const status = onlineStatus(p.last_active_at);
    const age = p.age || '?';
    const flag = FLAG(p.country_code);
    const photo = p.main_photo
      ? '<img src="' + p.main_photo + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">'
      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;">👤</div>';

    return '<div onclick="SearchPage.openProfile(\'' + p.uuid + '\')" style="background:linear-gradient(135deg,#2D1F38,#1A0A14);border-radius:16px;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,0.08);position:relative;">' +
      '<div style="position:relative;aspect-ratio:3/4;background:#1A0A14;">' +
        photo +
        '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 50%);"></div>' +
        '<div style="position:absolute;top:8px;right:8px;width:12px;height:12px;border-radius:50%;background:' + status.color + ';border:2px solid #1A0A14;"></div>' +
        (p.is_verified ? '<div style="position:absolute;top:8px;left:8px;background:rgba(34,197,94,0.9);color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;">✅</div>' : '') +
        '<div style="position:absolute;bottom:0;left:0;right:0;padding:10px;">' +
          '<div style="font-family:Playfair Display,serif;font-size:15px;font-weight:700;color:white;">' + p.first_name + ', ' + age + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.7);">' + flag + ' ' + (p.city || p.country_name || '') + '</div>' +
          '<div style="font-size:10px;color:' + status.color + ';margin-top:2px;">● ' + status.label + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;padding:8px;">' +
        '<button onclick="event.stopPropagation();SearchPage.quickLike(\'' + p.uuid + '\',this)" style="flex:1;background:rgba(232,49,122,0.15);border:1px solid rgba(232,49,122,0.3);color:var(--pink);padding:8px;border-radius:50px;font-size:13px;cursor:pointer;">♥</button>' +
        '<button onclick="event.stopPropagation();SearchPage.quickChat(\'' + p.uuid + '\')" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:white;padding:8px;border-radius:50px;font-size:13px;cursor:pointer;">💬</button>' +
      '</div>' +
    '</div>';
  }

  function applyFilters() {
    filtered = allProfiles.filter(function(p) {
      if (currentFilters.q) {
        const q = currentFilters.q.toLowerCase();
        if (!(p.first_name||'').toLowerCase().includes(q) &&
            !(p.city||'').toLowerCase().includes(q) &&
            !(p.profession||'').toLowerCase().includes(q)) return false;
      }
      if (currentFilters.gender && p.gender !== currentFilters.gender) return false;
      if (currentFilters.continent && p.continent !== currentFilters.continent) return false;
      if (currentFilters.body_type && p.body_type !== currentFilters.body_type) return false;
      if (currentFilters.relation && currentFilters.relation !== 'any' && p.relation_type !== currentFilters.relation) return false;
      if (p.age && p.age < currentFilters.age_min) return false;
      if (p.age && p.age > currentFilters.age_max) return false;
      return true;
    });
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('search-grid');
    const count = document.getElementById('search-count');
    if (!grid) return;
    if (count) count.textContent = filtered.length + ' membre' + (filtered.length > 1 ? 's' : '');
    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);"><div style="font-size:40px;margin-bottom:12px;">🔍</div><p>Aucun profil ne correspond à votre recherche</p></div>';
      return;
    }
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  async function render() {
    const page = document.getElementById('page-search');
    if (!page) return;

    page.innerHTML =
      '<div class="page-header"><div class="page-header-title">Recherche 🔍</div></div>' +
      '<div style="padding:12px 16px;display:flex;gap:8px;">' +
        '<div style="flex:1;position:relative;">' +
          '<input id="search-input" type="text" placeholder="Prénom, ville, profession..." style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:50px;padding:10px 16px 10px 40px;color:white;font-family:Outfit,sans-serif;font-size:14px;outline:none;box-sizing:border-box;" oninput="SearchPage.doSearch(this.value)">' +
          '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:16px;">🔍</span>' +
        '</div>' +
        '<button onclick="SearchPage.showFilters()" style="width:44px;height:44px;border-radius:50%;background:var(--surface);border:1px solid var(--border);color:white;cursor:pointer;font-size:18px;flex-shrink:0;">⚙️</button>' +
      '</div>' +
      '<div style="padding:0 16px 10px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;">' +
        '<button class="continent-btn active" onclick="SearchPage.filterGender(\'\',this)">Tous</button>' +
        '<button class="continent-btn" onclick="SearchPage.filterGender(\'woman\',this)">👩 Femmes</button>' +
        '<button class="continent-btn" onclick="SearchPage.filterGender(\'man\',this)">👨 Hommes</button>' +
        '<button class="continent-btn" onclick="SearchPage.filterContinent(\'AF\',this)">🌍 Afrique</button>' +
        '<button class="continent-btn" onclick="SearchPage.filterContinent(\'EU\',this)">🇪🇺 Europe</button>' +
        '<button class="continent-btn" onclick="SearchPage.filterContinent(\'NA\',this)">🌎 Amériques</button>' +
      '</div>' +
      '<div style="padding:0 16px 8px;display:flex;justify-content:space-between;align-items:center;">' +
        '<span id="search-count" style="font-size:13px;color:var(--muted);">Chargement...</span>' +
        '<span style="font-size:12px;color:var(--muted);">● En ligne &nbsp; 🟡 Absent</span>' +
      '</div>' +
      '<div id="search-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 12px 80px;">' +
        '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">Chargement...</div>' +
      '</div>';

    try {
      const data = await API.get('/search');
      allProfiles = data?.data || [];
      filtered = allProfiles;
      renderGrid();
    } catch(e) {
      const grid = document.getElementById('search-grid');
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">Erreur de chargement</div>';
    }
  }

  return {
    render,

    doSearch(q) {
      currentFilters.q = q;
      applyFilters();
    },

    filterGender(gender, btn) {
      document.querySelectorAll('.continent-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      currentFilters.gender = gender;
      currentFilters.continent = '';
      applyFilters();
    },

    filterContinent(continent, btn) {
      document.querySelectorAll('.continent-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      currentFilters.continent = continent;
      currentFilters.gender = '';
      applyFilters();
    },

    showFilters() {
      const f = currentFilters;
      tmpBodyType = f.body_type || '';
      Modal.show(
        '<div style="display:flex;flex-direction:column;gap:16px;">' +

          '<div>' +
            '<label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">💪 Corpulence</label>' +
            '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">' +
              '<button id="sbt-all"      onclick="SearchPage._setBodyType(\'\')"         style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:' + (!f.body_type?'var(--pink)':'transparent') + ';color:white;cursor:pointer;font-size:12px;">Tous</button>' +
              '<button id="sbt-slim"     onclick="SearchPage._setBodyType(\'slim\')"     style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:' + (f.body_type==='slim'?'var(--pink)':'transparent') + ';color:white;cursor:pointer;font-size:12px;">🧍 Mince</button>' +
              '<button id="sbt-athletic" onclick="SearchPage._setBodyType(\'athletic\')" style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:' + (f.body_type==='athletic'?'var(--pink)':'transparent') + ';color:white;cursor:pointer;font-size:12px;">🏃 Athlétique</button>' +
              '<button id="sbt-average"  onclick="SearchPage._setBodyType(\'average\')"  style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:' + (f.body_type==='average'?'var(--pink)':'transparent') + ';color:white;cursor:pointer;font-size:12px;">🧑 Intermédiaire</button>' +
              '<button id="sbt-curvy"    onclick="SearchPage._setBodyType(\'curvy\')"    style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:' + (f.body_type==='curvy'?'var(--pink)':'transparent') + ';color:white;cursor:pointer;font-size:12px;">🍑 Rondelette</button>' +
            '</div>' +
          '</div>' +

          '<div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">' +
            '<label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">💍 Type de relation</label>' +
            '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">' +
              '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:' + (!f.relation||f.relation==='any'?'rgba(232,49,122,0.15)':'transparent') + '">' +
                '<input type="radio" name="srelation" value="any" ' + (!f.relation||f.relation==='any'?'checked':'') + ' style="accent-color:var(--pink);"><span style="font-size:13px;">🌟 Peu importe</span>' +
              '</label>' +
              '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:' + (f.relation==='serious'?'rgba(232,49,122,0.15)':'transparent') + '">' +
                '<input type="radio" name="srelation" value="serious" ' + (f.relation==='serious'?'checked':'') + ' style="accent-color:var(--pink);"><span style="font-size:13px;">💍 Relation sérieuse</span>' +
              '</label>' +
              '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:' + (f.relation==='fun'?'rgba(232,49,122,0.15)':'transparent') + '">' +
                '<input type="radio" name="srelation" value="fun" ' + (f.relation==='fun'?'checked':'') + ' style="accent-color:var(--pink);"><span style="font-size:13px;">💋 Fun / Casual</span>' +
              '</label>' +
            '</div>' +
          '</div>' +

          '<div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">' +
            '<label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">🎂 Âge : <span id="sf-lbl-min">' + (f.age_min||18) + '</span> – <span id="sf-lbl-max">' + (f.age_max||60) + '</span> ans</label>' +
            '<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">' +
              '<input type="range" id="sf-age-min" min="18" max="65" value="' + (f.age_min||18) + '" style="width:100%;accent-color:var(--pink);" oninput="document.getElementById(\'sf-lbl-min\').textContent=this.value">' +
              '<input type="range" id="sf-age-max" min="18" max="70" value="' + (f.age_max||60) + '" style="width:100%;accent-color:var(--pink);" oninput="document.getElementById(\'sf-lbl-max\').textContent=this.value">' +
            '</div>' +
          '</div>' +

          '<div style="display:flex;gap:10px;margin-top:4px;">' +
            '<button onclick="SearchPage._resetFilters()" style="flex:1;background:transparent;border:1px solid rgba(255,255,255,0.15);color:var(--muted);padding:12px;border-radius:50px;cursor:pointer;font-size:13px;">Réinitialiser</button>' +
            '<button onclick="SearchPage._applyAdvFilters()" style="flex:2;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;font-size:14px;">Afficher les résultats</button>' +
          '</div>' +

        '</div>', '⚙️ Filtres avancés');
    },

    _setBodyType(bt) {
      tmpBodyType = bt;
      ['all','slim','athletic','average','curvy'].forEach(k => {
        const el = document.getElementById('sbt-' + k);
        if (el) el.style.background = (k === (bt||'all')) ? 'var(--pink)' : 'transparent';
      });
    },

    _resetFilters() {
      currentFilters = { q: currentFilters.q, continent: '', age_min: 18, age_max: 70, gender: '', body_type: '', relation: '' };
      tmpBodyType = '';
      Modal.close();
      applyFilters();
    },

    _applyAdvFilters() {
      currentFilters.age_min = parseInt(document.getElementById('sf-age-min')?.value || 18);
      currentFilters.age_max = parseInt(document.getElementById('sf-age-max')?.value || 70);
      currentFilters.body_type = tmpBodyType || '';
      currentFilters.relation = document.querySelector('input[name="srelation"]:checked')?.value || '';
      Modal.close();
      applyFilters();
    },

    openProfile(uuid) {
      const profile = allProfiles.find(p => p.uuid === uuid);
      if (!profile) return;
      const status = onlineStatus(profile.last_active_at);
      const flag = FLAG(profile.country_code);
      Modal.show(
        '<div style="text-align:center;">' +
          '<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));margin:0 auto 16px;overflow:hidden;border:3px solid rgba(232,49,122,0.4);position:relative;">' +
            (profile.main_photo ? '<img src="' + profile.main_photo + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:56px;">👤</div>') +
            '<div style="position:absolute;bottom:4px;right:4px;width:16px;height:16px;border-radius:50%;background:' + status.color + ';border:2px solid #1A0A14;"></div>' +
          '</div>' +
          '<h2 style="font-family:Playfair Display,serif;font-size:22px;font-weight:700;margin-bottom:4px;">' + profile.first_name + ', ' + (profile.age || '?') + '</h2>' +
          '<p style="font-size:14px;color:var(--muted);margin-bottom:4px;">' + flag + ' ' + (profile.city || profile.country_name || '') + (profile.profession ? ' · ' + profile.profession : '') + '</p>' +
          '<p style="font-size:12px;color:' + status.color + ';margin-bottom:16px;">● ' + status.label + '</p>' +
          (profile.bio ? '<p style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;margin-bottom:20px;text-align:left;background:rgba(255,255,255,0.04);padding:12px;border-radius:12px;">' + profile.bio + '</p>' : '') +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="SearchPage.quickLike(\'' + profile.uuid + '\',null);Modal.close()" style="flex:1;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;">♥ Liker</button>' +
            '<button onclick="SearchPage.quickChat(\'' + profile.uuid + '\');Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:white;padding:12px;border-radius:50px;cursor:pointer;">💬 Message</button>' +
          '</div>' +
        '</div>', profile.first_name);
    },

    async quickLike(uuid, btn) {
      try {
        if (btn) { btn.textContent = '✓'; btn.style.color = 'var(--green)'; }
        await API.post('/swipe', { uuid, action: 'like' });
        Toast.success('Liké ! 💕');
      } catch(e) { Toast.error(e.message || 'Erreur'); }
    },

    async quickChat(uuid) {
      const profile = allProfiles.find(p => p.uuid === uuid);
      if (!profile) return;
      ChatPage.open(profile);
    },
  };
})();