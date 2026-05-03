
// js/pages/feed.js — v2.0 Stack + Carousel + Filtres fonctionnels
const FeedPage = (() => {
  let profiles = [];
  let currentIdx = 0;
  let isDragging = false;
  let startX = 0, startY = 0;
  let currentX = 0;
  let currentFilters = {};
  let photoIndexes = {};

  const FLAG = (code) => {
    if (!code || code.length !== 2) return '🌍';
    try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); } catch { return '🌍'; }
  };

  function parseDate(raw) {
    if (!raw) return null;
    const s = raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
    return new Date(s).getTime();
  }

  async function render() {
    const page = document.getElementById('page-feed');
    if (!page) return;
    page.innerHTML = `
      <div class="page-header" style="padding:12px 16px 8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:22px;">🦋</span>
          <span style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;">Mixte-Meet</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="header-btn" onclick="FeedPage.showFilters()">⚙️</button>
          <button class="header-btn" onclick="FeedPage.showNotifs()">🔔</button>
        </div>
      </div>

      <div id="stories-bar" style="padding:8px 12px;display:flex;gap:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:4px;min-height:65px;"></div>
      <div style="padding:0 12px 10px;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
        <button class="continent-btn active" onclick="FeedPage.filterContinent('',this)">🌍 Tous</button>
        <button class="continent-btn" onclick="FeedPage.filterOnline(this)">🟢 En ligne</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('AF',this)">🌍 Afrique</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('EU',this)">🌎 Europe</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('NA',this)">🌎 Amériques</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('AS',this)">🌏 Asie</button>
      </div>

      <div style="flex:1;position:relative;padding:0 16px;display:flex;flex-direction:column;">
        <div id="feed-card-area" style="position:relative;flex:1;min-height:340px;margin-bottom:16px;"></div>

        <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:0 0 20px;">
          <button onclick="FeedPage.undoSwipe()"
            style="width:46px;height:46px;border-radius:50%;background:#1A1320;border:2px solid rgba(255,200,50,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;"
            title="Annuler">↩️</button>
          <button onclick="FeedPage.swipe('dislike')"
            style="width:60px;height:60px;border-radius:50%;background:#1A1320;border:2px solid rgba(239,68,68,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.4);"
            title="Passer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button onclick="FeedPage.swipe('super_like')"
            style="width:50px;height:50px;border-radius:50%;background:#1A1320;border:2px solid rgba(201,168,76,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;"
            title="Super Like">⭐</button>
          <button onclick="FeedPage.swipe('like')"
            style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(232,49,122,0.5);color:white;"
            title="J'aime">♥</button>
          <button onclick="FeedPage.openChat()"
            style="width:46px;height:46px;border-radius:50%;background:#1A1320;border:2px solid rgba(232,49,122,0.4);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;"
            title="Message">💬</button>
        </div>
      </div>
    `;
    if (typeof StoriesPage !== "undefined") StoriesPage.init();
    await loadProfiles();
  }

  async function loadProfiles(filters = {}) {
    currentFilters = filters;
    try {
      let url = '/feed';
      const params = [];
      if (filters.continent)    params.push('continent=' + filters.continent);
      if (filters.age_min)      params.push('age_min=' + filters.age_min);
      if (filters.age_max)      params.push('age_max=' + filters.age_max);
      if (filters.country_code) params.push('country_code=' + filters.country_code);
      if (params.length) url += '?' + params.join('&');
      const data = await API.get(url);
      let profs = data?.data || [];
      if (filters.onlineOnly) {
        profs = profs.filter(p => {
          if (!p.last_active_at) return false;
          return Date.now() - parseDate(p.last_active_at) < 3600000;
        });
      }
      if (filters.gender) {
        profs = profs.filter(p => p.gender === filters.gender);
      }
      profiles = profs;
      currentIdx = 0;
      photoIndexes = {};
      if (!profiles.length) { showEmpty(); return; }
      renderStack();
    } catch(e) { showError(); }
  }

  // ── PILE DE CARTES ───────────────────────────────────────
  function renderStack() {
    const area = document.getElementById('feed-card-area');
    if (!area) return;
    area.innerHTML = '';

    // Afficher jusqu'à 3 cartes (de derrière vers devant)
    const visible = Math.min(3, profiles.length - currentIdx);
    for (let i = visible - 1; i >= 0; i--) {
      const profile = profiles[currentIdx + i];
      if (!profile) continue;
      const card = buildCard(profile, i);
      area.appendChild(card);
    }
    initSwipeGestures();
  }

  function buildCard(profile, stackPos) {
    const card = document.createElement('div');
    const scale = 1 - stackPos * 0.05;
    const translateY = stackPos * 10;
    card.id = stackPos === 0 ? 'feed-card' : 'feed-card-bg-' + stackPos;
    card.style.cssText = `
      position:absolute;inset:0;
      background:linear-gradient(135deg,#2D1F38,#1A0A14);
      border-radius:20px;overflow:hidden;
      box-shadow:0 ${8 + stackPos*4}px ${30 + stackPos*10}px rgba(0,0,0,0.4);
      transform: scale(${scale}) translateY(${translateY}px);
      transform-origin: bottom center;
      transition: transform 0.3s ease;
      ${stackPos === 0 ? 'cursor:grab;user-select:none;z-index:10;' : 'z-index:' + (9 - stackPos) + ';'}
    `;

    const photoIdx = photoIndexes[profile.uuid] || 0;
    const photos = profile.photos || (profile.main_photo ? [profile.main_photo] : []);
    const imgSrc = photos[photoIdx] || profile.main_photo;

    const age = profile.age || '?';
    const flag = FLAG(profile.country_code);
    const city = profile.city || profile.country_name || '';
    const diff = profile.last_active_at ? Date.now() - parseDate(profile.last_active_at) : Infinity;
    const online = diff < 600000;
    const absent = diff >= 600000 && diff < 3600000;

    card.innerHTML = `
      <div style="position:absolute;inset:0;">
        ${imgSrc
          ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px;">👤</div>`
        }
      </div>
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.15) 50%,transparent 100%);"></div>

      ${stackPos === 0 && photos.length > 1 ? `
        <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:20;">
          ${photos.map((_, i) => `<div style="width:${i===photoIdx?20:6}px;height:4px;border-radius:2px;background:${i===photoIdx?'white':'rgba(255,255,255,0.4)'};transition:width 0.2s;"></div>`).join('')}
        </div>
        <div style="position:absolute;top:0;left:0;width:40%;height:85%;z-index:15;" onclick="FeedPage.prevPhoto('${profile.uuid}')"></div>
        <div style="position:absolute;top:0;right:0;width:40%;height:85%;z-index:15;" onclick="FeedPage.nextPhoto('${profile.uuid}')"></div>
      ` : ''}

      ${online
        ? `<div style="position:absolute;top:14px;right:14px;background:rgba(34,197,94,0.9);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;z-index:11;">🟢 En ligne</div>`
        : absent
        ? `<div style="position:absolute;top:14px;right:14px;background:rgba(245,158,11,0.9);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;z-index:11;">🟡 Absent</div>`
        : ''}

      ${profile.is_verified
        ? `<div style="position:absolute;top:14px;left:14px;background:rgba(34,197,94,0.9);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;z-index:11;">✅ Vérifié</div>`
        : ''}

      <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 20px 16px;z-index:11;">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:white;margin-bottom:4px;">${profile.first_name}, ${age}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:6px;">${flag} ${city}${profile.profession ? ' · ' + profile.profession : ''}</div>
        ${profile.bio ? `<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${profile.bio}</div>` : ''}
      </div>

      <div id="swipe-nope" style="position:absolute;top:30px;left:20px;border:3px solid #EF4444;border-radius:10px;padding:6px 14px;color:#EF4444;font-weight:900;font-size:20px;transform:rotate(-15deg);opacity:0;transition:opacity 0.1s;z-index:12;">NOPE</div>
      <div id="swipe-like" style="position:absolute;top:30px;right:20px;border:3px solid #22C55E;border-radius:10px;padding:6px 14px;color:#22C55E;font-weight:900;font-size:20px;transform:rotate(15deg);opacity:0;transition:opacity 0.1s;z-index:12;">LIKE</div>
      <div id="swipe-super" style="position:absolute;top:30px;left:50%;transform:translateX(-50%);border:3px solid #F59E0B;border-radius:10px;padding:6px 14px;color:#F59E0B;font-weight:900;font-size:18px;opacity:0;transition:opacity 0.1s;z-index:12;">⭐ SUPER</div>
    `;
    return card;
  }

  function initSwipeGestures() {
    const card = document.getElementById('feed-card');
    if (!card) return;

    card.addEventListener('touchstart', e => {
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = 0;
    }, {passive:true});

    card.addEventListener('touchmove', e => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX - startX;
      applyDrag(card, currentX);
    }, {passive:true});

    card.addEventListener('touchend', () => {
      isDragging = false;
      commitSwipe(card);
    });

    card.addEventListener('mousedown', e => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      currentX = 0;
      card.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      currentX = e.clientX - startX;
      applyDrag(card, currentX);
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      if (card) card.style.cursor = 'grab';
      commitSwipe(card);
    });

    document.onkeydown = e => {
      if (e.key === 'ArrowLeft')  FeedPage.swipe('dislike');
      if (e.key === 'ArrowRight') FeedPage.swipe('like');
      if (e.key === 'ArrowUp')    FeedPage.swipe('super_like');
      if (e.key === 'ArrowDown')  FeedPage.undoSwipe();
    };
  }

  function applyDrag(card, dx) {
    card.style.transform = `translateX(${dx}px) rotate(${dx * 0.06}deg)`;
    const nope  = document.getElementById('swipe-nope');
    const like  = document.getElementById('swipe-like');
    if (nope) nope.style.opacity = dx < -30 ? Math.min(1, Math.abs(dx) / 100) : 0;
    if (like) like.style.opacity = dx > 30  ? Math.min(1, dx / 100) : 0;
    // Animer la carte derrière
    const bg = document.getElementById('feed-card-bg-1');
    if (bg) {
      const progress = Math.min(1, Math.abs(dx) / 150);
      const scale = 0.95 + progress * 0.05;
      bg.style.transform = `scale(${scale}) translateY(${10 - progress * 10}px)`;
    }
  }

  function commitSwipe(card) {
    if (Math.abs(currentX) > 80) {
      FeedPage.swipe(currentX > 0 ? 'like' : 'dislike');
    } else {
      if (card) {
        card.style.transition = 'transform 0.35s cubic-bezier(.2,1,.3,1)';
        card.style.transform = '';
        setTimeout(() => { if (card) card.style.transition = ''; }, 350);
      }
      const nope = document.getElementById('swipe-nope');
      const like = document.getElementById('swipe-like');
      if (nope) nope.style.opacity = 0;
      if (like) like.style.opacity = 0;
    }
    currentX = 0;
  }

  function animateOut(direction) {
    const card = document.getElementById('feed-card');
    if (!card) return Promise.resolve();
    return new Promise(resolve => {
      card.style.transition = 'transform 0.4s ease, opacity 0.4s';
      const dx = direction === 'like' || direction === 'super_like' ? 600 : -600;
      const rot = direction === 'like' || direction === 'super_like' ? 30 : -30;
      card.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
      card.style.opacity = '0';
      setTimeout(resolve, 380);
    });
  }

  async function showEmpty() {
    try { await API.delete('/swipes/reset'); } catch(e) {}
    currentIdx = 0;
    profiles = [];
    photoIndexes = {};
    await loadProfiles(currentFilters);
  }

  function showError() {
    const area = document.getElementById('feed-card-area');
    if (!area) return;
    area.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;">
        <div style="font-size:40px;">⚠️</div>
        <div style="font-size:14px;color:var(--muted);">Erreur de chargement</div>
        <button onclick="FeedPage.reload()" style="background:var(--pink);border:none;color:white;padding:10px 24px;border-radius:50px;font-size:13px;cursor:pointer;">Réessayer</button>
      </div>`;
  }

  function showMatchModal(profile) {
    const photo = profile.main_photo
      ? `<img src="${profile.main_photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--pink);">`
      : `<div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:36px;">👤</div>`;
    Modal.show(
      `<div style="text-align:center;padding:16px;">
        <div style="font-size:48px;margin-bottom:12px;">💞</div>
        ${photo}
        <h2 style="font-family:'Playfair Display',serif;font-size:22px;margin:12px 0 8px;">C'est un Match !</h2>
        <p style="color:var(--muted);font-size:14px;margin-bottom:20px;"><strong style="color:white;">${profile.first_name}</strong> vous a aussi liké !</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button onclick="Modal.close();ChatPage.open(FeedPage.getCurrentProfile())" style="background:var(--pink);border:none;color:white;padding:12px 24px;border-radius:50px;font-weight:700;cursor:pointer;">💬 Écrire</button>
          <button onclick="Modal.close()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:white;padding:12px 24px;border-radius:50px;cursor:pointer;">Continuer</button>
        </div>
      </div>`, '');
  }

  return {
    render,
    getCurrentProfile() { return profiles[currentIdx] || null; },

    nextPhoto(uuid) {
      const profile = profiles.find(p => p.uuid === uuid);
      if (!profile) return;
      const photos = profile.photos || (profile.main_photo ? [profile.main_photo] : []);
      const idx = photoIndexes[uuid] || 0;
      photoIndexes[uuid] = Math.min(idx + 1, photos.length - 1);
      renderStack();
    },

    prevPhoto(uuid) {
      const idx = photoIndexes[uuid] || 0;
      photoIndexes[uuid] = Math.max(idx - 1, 0);
      renderStack();
    },

    async swipe(action) {
      const profile = profiles[currentIdx];
      if (!profile) return;
      if (action === 'super_like') {
        const user = AuthService.getUser();
        if (!user?.is_premium) {
          Toast.info('Super Likes illimités avec Premium ⭐');
          App.navigate('pricing');
          return;
        }
      }
      await animateOut(action);
      try {
        if (profile.profile_type !== 'demo') {
          const result = await API.post('/swipe', { uuid: profile.uuid, action });
          if (result?.data?.matched) showMatchModal(profile);
        } else if ((action === 'like' || action === 'super_like') && Math.random() > 0.4) {
          showMatchModal(profile);
        }
      } catch(e) { console.log('Swipe error:', e); }
      currentIdx++;
      if (currentIdx >= profiles.length) showEmpty();
      else renderStack();
    },

    undoSwipe() {
      const user = AuthService.getUser();
      if (!user?.is_premium) {
        Toast.info('Annuler un swipe est une fonctionnalité Premium ⭐');
        App.navigate('pricing');
        return;
      }
      if (currentIdx <= 0) { Toast.info('Aucun swipe à annuler'); return; }
      API.post('/undo', {}).then(() => {
        currentIdx--;
        renderStack();
        Toast.success('Swipe annulé ↩️');
      }).catch(() => Toast.error('Erreur annulation'));
    },

    openChat() {
      const profile = profiles[currentIdx];
      if (!profile) { Toast.info('Aucun profil affiché'); return; }
      ChatPage.open(profile);
    },

    filterContinent(continent, btn) {
  document.querySelectorAll('.continent-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  profiles = []; currentIdx = 0;
  photoIndexes = {};
  const area = document.getElementById('feed-card-area');
  if (area) area.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;">Chargement...</div>';
  loadProfiles({ continent });
},
filterOnline(btn) {
  document.querySelectorAll('.continent-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  profiles = []; currentIdx = 0;
  photoIndexes = {};
  const area = document.getElementById('feed-card-area');
  if (area) area.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;">Chargement...</div>';
  loadProfiles({ onlineOnly: true });
},
    showFilters() {
      const f = currentFilters;
      Modal.show(`
        <div style="display:flex;flex-direction:column;gap:16px;padding-bottom:8px;">

          <div>
            <label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">👤 Genre recherché</label>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button id="fg-all"   onclick="FeedPage._setGenderBtn('')"      style="flex:1;padding:9px 6px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${!f.gender?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:13px;">Tous</button>
              <button id="fg-woman" onclick="FeedPage._setGenderBtn('woman')" style="flex:1;padding:9px 6px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${f.gender==='woman'?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:13px;">♀ Femmes</button>
              <button id="fg-man"   onclick="FeedPage._setGenderBtn('man')"   style="flex:1;padding:9px 6px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${f.gender==='man'?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:13px;">♂ Hommes</button>
            </div>
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">
            <label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">💪 Corpulence</label>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
              <button id="bt-all"      onclick="FeedPage._setBodyType('')"         style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${!f.body_type?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:12px;">Tous</button>
              <button id="bt-slim"     onclick="FeedPage._setBodyType('slim')"     style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${f.body_type==='slim'?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:12px;">🧍 Mince</button>
              <button id="bt-athletic" onclick="FeedPage._setBodyType('athletic')" style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${f.body_type==='athletic'?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:12px;">🏃 Athlétique</button>
              <button id="bt-average"  onclick="FeedPage._setBodyType('average')"  style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${f.body_type==='average'?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:12px;">🧑 Intermédiaire</button>
              <button id="bt-curvy"    onclick="FeedPage._setBodyType('curvy')"    style="padding:7px 12px;border-radius:50px;border:1px solid rgba(255,255,255,0.15);background:${f.body_type==='curvy'?'var(--pink)':'transparent'};color:white;cursor:pointer;font-size:12px;">🍑 Rondelette</button>
            </div>
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">
            <label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">💍 Type de relation</label>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:${!f.relation||f.relation==='any'?'rgba(232,49,122,0.15)':'transparent'}">
                <input type="radio" name="relation" value="any" ${!f.relation||f.relation==='any'?'checked':''} onchange="FeedPage._tmpFilters.relation=this.value" style="accent-color:var(--pink);">
                <span style="font-size:13px;">🌟 Peu importe</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:${f.relation==='serious'?'rgba(232,49,122,0.15)':'transparent'}">
                <input type="radio" name="relation" value="serious" ${f.relation==='serious'?'checked':''} onchange="FeedPage._tmpFilters.relation=this.value" style="accent-color:var(--pink);">
                <span style="font-size:13px;">💍 Relation sérieuse</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:${f.relation==='fun'?'rgba(232,49,122,0.15)':'transparent'}">
                <input type="radio" name="relation" value="fun" ${f.relation==='fun'?'checked':''} onchange="FeedPage._tmpFilters.relation=this.value" style="accent-color:var(--pink);">
                <span style="font-size:13px;">💋 Fun / Casual</span>
              </label>
            </div>
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">
            <label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">🎂 Âge : <span id="lbl-amin">${f.age_min||18}</span> – <span id="lbl-amax">${f.age_max||60}</span> ans</label>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
              <input type="range" min="18" max="65" value="${f.age_min||18}" style="width:100%;accent-color:var(--pink);"
                oninput="document.getElementById('lbl-amin').textContent=this.value;FeedPage._tmpFilters.age_min=+this.value">
              <input type="range" min="18" max="70" value="${f.age_max||60}" style="width:100%;accent-color:var(--pink);"
                oninput="document.getElementById('lbl-amax').textContent=this.value;FeedPage._tmpFilters.age_max=+this.value">
            </div>
          </div>

          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">
            <label class="input-label" style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">🌍 Continent</label>
            <select id="filter-continent" style="width:100%;margin-top:8px;padding:11px;border-radius:12px;background:#1A1320;color:white;border:1px solid rgba(255,255,255,0.15);font-size:13px;">
              <option value="">Tous les continents</option>
              <option value="AF" ${f.continent==='AF'?'selected':''}>🌍 Afrique</option>
              <option value="EU" ${f.continent==='EU'?'selected':''}>🌎 Europe</option>
              <option value="NA" ${f.continent==='NA'?'selected':''}>🌎 Amériques</option>
              <option value="AS" ${f.continent==='AS'?'selected':''}>🌏 Asie</option>
              <option value="OC" ${f.continent==='OC'?'selected':''}>🌏 Océanie</option>
            </select>
          </div>

          <div style="display:flex;gap:10px;margin-top:4px;">
            <button onclick="FeedPage._resetFilters()" style="flex:1;background:transparent;border:1px solid rgba(255,255,255,0.15);color:var(--muted);padding:12px;border-radius:50px;cursor:pointer;font-size:13px;">Réinitialiser</button>
            <button onclick="FeedPage._applyFilters()" style="flex:2;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;font-size:14px;">Afficher les résultats</button>
          </div>

        </div>`, '⚙️ Filtres avancés');
      this._tmpFilters = { ...f };
    },

    _tmpFilters: {},
    _pendingGender: '',

    _setGenderBtn(g) {
      this._tmpFilters.gender = g;
      ['all','woman','man'].forEach(k => {
        const el = document.getElementById('fg-' + k);
        if (el) el.style.background = (k === (g||'all')) ? 'var(--pink)' : 'transparent';
      });
    },

    _applyFilters() {
      const continent = document.getElementById('filter-continent')?.value || '';
      const newFilters = { ...this._tmpFilters, continent };
      Modal.close();
      loadProfiles(newFilters);
      Toast.success('Filtres appliqués ✓');
    },

    _resetFilters() {
      this._tmpFilters = {};
      Modal.close();
      loadProfiles({});
      Toast.info('Filtres réinitialisés');
    },

    showNotifs() { App.navigate('matches'); },

    async reload() {
  currentIdx = 0;
  profiles = [];
  photoIndexes = {};
  const area = document.getElementById('feed-card-area');
  if (area) area.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;">🔄 Rechargement...</div>';
  try { await API.delete('/swipes/reset'); } catch(e) {}
  loadProfiles({});
},
  };
})();
