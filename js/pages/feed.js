// js/pages/feed.js
const FeedPage = (() => {
  let profiles = [];
  let currentIdx = 0;
  let isDragging = false;
  let startX = 0;
  let currentX = 0;

  const FLAG = (code) => {
    if (!code || code.length !== 2) return '🌍';
    try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); } catch { return '🌍'; }
  };

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

      <div style="padding:0 12px 10px;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
        <button class="continent-btn active" onclick="FeedPage.filterContinent('',this)">🌍 Tous</button><button class="continent-btn" onclick="FeedPage.filterOnline(this)">🟢 En ligne</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('AF',this)">🌍 Afrique</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('EU',this)">EU Europe</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('NA',this)">🌎 Amériques</button>
        <button class="continent-btn" onclick="FeedPage.filterContinent('AS',this)">🌏 Asie</button>
      </div>
filterOnline(btn) {
  document.querySelectorAll('.continent-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  profiles = profiles.filter(function(p) {
    if (!p.last_active_at) return false;
    const d = Date.now() - new Date(p.last_active_at.replace(' ','T') + 'Z');
    return d < 3600000;
  });
  currentIdx = 0;
  showProfile();
},

      <div style="flex:1;position:relative;padding:0 16px;display:flex;flex-direction:column;gap:0;">
        <div id="feed-card-area" style="position:relative;flex:1;min-height:380px;margin-bottom:16px;">
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;">
            <div style="font-size:40px;">🦋</div>
            <div style="font-size:14px;color:var(--muted);">Chargement...</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:0 0 20px;">

          <!-- DISLIKE rouge -->
          <button onclick="FeedPage.swipe('dislike')"
            style="width:56px;height:56px;border-radius:50%;background:#1A1320;border:2px solid rgba(239,68,68,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.4);"
            title="Passer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- SUPER LIKE or -->
          <button onclick="FeedPage.swipe('super_like')"
            style="width:52px;height:52px;border-radius:50%;background:#1A1320;border:2px solid rgba(201,168,76,0.4);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.4);font-size:22px;color:var(--gold);"
            title="Super Like">⭐</button>

          <!-- LIKE rose -->
          <button onclick="FeedPage.swipe('like')"
            style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(232,49,122,0.5);color:white;"
            title="J'aime">♥</button>

          <!-- MESSAGE — remplace la fleche -->
          <button onclick="FeedPage.openChat()"
            style="width:52px;height:52px;border-radius:50%;background:#1A1320;border:2px solid rgba(232,49,122,0.4);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(232,49,122,0.2);font-size:22px;"
            title="Envoyer un message">💬</button>

        </div>
      </div>
    `;
    await loadProfiles();
  }

  async function loadProfiles(continent = '') {
    try {
      let url = '/feed';
      if (continent) url += `?continent=${continent}`;
      const data = await API.get(url);
      profiles = data?.data || [];
      currentIdx = 0;
      if (!profiles.length) { showEmpty(); return; }
      showProfile(profiles[currentIdx]);
    } catch(e) { showError(); }
  }

  function showProfile(profile) {
    const area = document.getElementById('feed-card-area');
    if (!area || !profile) return;

    const isDemo = profile.profile_type === 'demo';
    const age    = profile.age || '?';
    const flag   = FLAG(profile.country_code);
    const city   = profile.city || profile.country_name || '';
    const online = isDemo || (profile.last_active_at && (Date.now() - new Date(profile.last_active_at)) < 900000);

    const avatarContent = profile.main_photo
      ? `<img src="${profile.main_photo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px;\\'>${profile.emoji||'👤'}</div>'">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px;">${profile.emoji||'👤'}</div>`;

    area.innerHTML = `
      <div id="feed-card" style="position:absolute;inset:0;background:linear-gradient(135deg,#2D1F38,#1A0A14);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);cursor:grab;user-select:none;">
        <div style="position:absolute;inset:0;">${avatarContent}</div>
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.2) 50%,transparent 100%);"></div>
        ${online ? `<div style="position:absolute;top:14px;right:14px;background:rgba(34,197,94,0.9);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">● En ligne</div>` : ''}
        ${profile.is_verified ? `<div style="position:absolute;top:14px;left:14px;background:rgba(34,197,94,0.9);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">✅ Vérifié</div>` : ''}
        <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 20px 16px;">
          <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:white;margin-bottom:4px;">${profile.first_name}, ${age}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:6px;">${flag} ${city}${profile.profession ? ' · ' + profile.profession : ''}</div>
          ${profile.bio ? `<div style="font-size:12px;color:rgba(255,255,255,0.65);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${profile.bio}</div>` : ''}
        </div>
        <div id="swipe-nope" style="position:absolute;top:30px;left:20px;border:3px solid #EF4444;border-radius:10px;padding:6px 14px;color:#EF4444;font-weight:900;font-size:20px;transform:rotate(-15deg);opacity:0;transition:opacity 0.1s;">NOPE</div>
        <div id="swipe-like" style="position:absolute;top:30px;right:20px;border:3px solid #22C55E;border-radius:10px;padding:6px 14px;color:#22C55E;font-weight:900;font-size:20px;transform:rotate(15deg);opacity:0;transition:opacity 0.1s;">LIKE</div>
      </div>`;
    initSwipe();
  }

  function initSwipe() {
    const card = document.getElementById('feed-card');
    if (!card) return;
    card.addEventListener('touchstart', e => { isDragging=true; startX=e.touches[0].clientX; currentX=0; }, {passive:true});
    card.addEventListener('touchmove', e => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX - startX;
      card.style.transform = `translateX(${currentX}px) rotate(${currentX*0.08}deg)`;
      const n=document.getElementById('swipe-nope'), l=document.getElementById('swipe-like');
      if(n) n.style.opacity = currentX<-30 ? Math.min(1,Math.abs(currentX)/100) : 0;
      if(l) l.style.opacity = currentX>30  ? Math.min(1,currentX/100) : 0;
    }, {passive:true});
    card.addEventListener('touchend', () => {
      isDragging=false;
      if(currentX>80) FeedPage.swipe('like');
      else if(currentX<-80) FeedPage.swipe('dislike');
      else { card.style.transition='transform 0.3s'; card.style.transform=''; setTimeout(()=>card.style.transition='',300); }
      currentX=0;
    });
    card.addEventListener('mousedown', e => { isDragging=true; startX=e.clientX; currentX=0; card.style.cursor='grabbing'; e.preventDefault(); });
    document.addEventListener('mousemove', e => {
      if(!isDragging) return;
      currentX = e.clientX - startX;
      card.style.transform = `translateX(${currentX}px) rotate(${currentX*0.08}deg)`;
      const n=document.getElementById('swipe-nope'), l=document.getElementById('swipe-like');
      if(n) n.style.opacity = currentX<-30 ? Math.min(1,Math.abs(currentX)/100) : 0;
      if(l) l.style.opacity = currentX>30  ? Math.min(1,currentX/100) : 0;
    });
    document.addEventListener('mouseup', () => {
      if(!isDragging) return;
      isDragging=false;
      if(card) card.style.cursor='grab';
      if(currentX>80) FeedPage.swipe('like');
      else if(currentX<-80) FeedPage.swipe('dislike');
      else { if(card){card.style.transition='transform 0.3s';card.style.transform='';setTimeout(()=>card.style.transition='',300);} }
      currentX=0;
    });
    document.onkeydown = e => {
      if(e.key==='ArrowLeft')  FeedPage.swipe('dislike');
      if(e.key==='ArrowRight') FeedPage.swipe('like');
      if(e.key==='ArrowUp')    FeedPage.swipe('super_like');
    };
  }

  function animateSwipe(dir) {
    const card = document.getElementById('feed-card');
    if(!card) return;
    card.style.transition = 'transform 0.4s ease, opacity 0.4s';
    card.style.transform  = `translateX(${dir==='like'?500:-500}px) rotate(${dir==='like'?30:-30}deg)`;
    card.style.opacity    = '0';
  }

  function showEmpty() {
    const area = document.getElementById('feed-card-area');
    if(!area) return;
    area.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;text-align:center;padding:32px;">
      <div style="font-size:56px;">🦋</div>
      <div style="font-size:20px;font-weight:700;font-family:'Playfair Display',serif;">Vous avez tout vu !</div>
      <div style="font-size:14px;color:var(--muted);">Revenez plus tard pour de nouveaux profils</div>
      <button onclick="FeedPage.reload()" style="background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;">🔄 Recommencer</button>
    </div>`;
  }

  function showError() {
    const area = document.getElementById('feed-card-area');
    if(!area) return;
    area.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;">
      <div style="font-size:40px;">⚠️</div>
      <div style="font-size:14px;color:var(--muted);">Erreur de chargement</div>
      <button onclick="FeedPage.reload()" style="background:var(--pink);border:none;color:white;padding:10px 24px;border-radius:50px;font-size:13px;cursor:pointer;font-family:'Outfit',sans-serif;">Réessayer</button>
    </div>`;
  }

  function showMatchModal(profile) {
    Modal.show(`
      <div style="text-align:center;padding:16px;">
        <div style="font-size:56px;margin-bottom:12px;">💞</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:22px;margin-bottom:8px;">C'est un Match !</h2>
        <p style="color:var(--muted);font-size:14px;margin-bottom:20px;"><strong style="color:white;">${profile.first_name}</strong> vous a aussi liké !</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button onclick="Modal.close();ChatPage.open(FeedPage.getCurrentProfile())" style="background:var(--pink);border:none;color:white;padding:12px 24px;border-radius:50px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;">💬 Écrire un message</button>
          <button onclick="Modal.close()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:white;padding:12px 24px;border-radius:50px;cursor:pointer;font-family:'Outfit',sans-serif;">Continuer</button>
        </div>
      </div>`, '');
  }

  return {
    render,

    getCurrentProfile() { return profiles[currentIdx] || null; },

    async swipe(action) {
      const profile = profiles[currentIdx];
      if(!profile) return;
      animateSwipe(action==='like'||action==='super_like' ? 'like' : 'dislike');
      try {
        if(profile.profile_type !== 'demo') {
          const result = await API.post('/swipe', {uuid:profile.uuid, action});
          if(result?.data?.matched) {
            setTimeout(() => showMatchModal(profile), 400);
          }
        } else if((action==='like'||action==='super_like') && Math.random()>0.4) {
          setTimeout(() => showMatchModal(profile), 400);
        }
      } catch(e) { console.log('Swipe error:', e); }
      setTimeout(() => {
        currentIdx++;
        if(currentIdx >= profiles.length) showEmpty();
        else showProfile(profiles[currentIdx]);
      }, 350);
    },

    openChat() {
      const profile = profiles[currentIdx];
      if (!profile) { Toast.info('Aucun profil affiché'); return; }
      ChatPage.open(profile);
    },

    filterContinent(continent, btn) {
      document.querySelectorAll('.continent-btn').forEach(b => b.classList.remove('active'));
      if(btn) btn.classList.add('active');
      currentIdx=0; profiles=[];
      const area = document.getElementById('feed-card-area');
      if(area) area.innerHTML='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;">Chargement...</div>';
      loadProfiles(continent);
    },

    showFilters() {
      Modal.show(`
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="input-group"><label class="input-label">Âge minimum</label><input type="range" min="18" max="65" value="18" style="width:100%;" oninput="this.nextElementSibling.textContent=this.value+' ans'"><span style="color:var(--muted);font-size:13px;">18 ans</span></div>
          <div class="input-group"><label class="input-label">Âge maximum</label><input type="range" min="18" max="65" value="50" style="width:100%;" oninput="this.nextElementSibling.textContent=this.value+' ans'"><span style="color:var(--muted);font-size:13px;">50 ans</span></div>
          <button onclick="Modal.close();Toast.success('Filtres appliqués')" style="background:var(--pink);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;width:100%;">Appliquer</button>
        </div>`, '⚙️ Filtres');
    },

    showNotifs() { Toast.info('Aucune nouvelle notification'); },
    async reload() {
      try {
        await fetch('https://mixte-meet-backend.onrender.com/api/swipes/reset', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('mm_token') || '') }
        });
      } catch(e) { console.log('reset error:', e); }
      currentIdx = 0;
      profiles = [];
      loadProfiles();
    },
  };
})();





