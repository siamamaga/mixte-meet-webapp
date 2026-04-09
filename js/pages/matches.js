// js/pages/matches.js
const MatchesPage = (() => {
  let matches = [];

  // Données démo de secours si l'API échoue
  const DEMO_MATCHES = [
    { id:1, uuid:'m1', first_name:'Amina',  age:26, country_code:'CI', city:'Abidjan',   emoji:'👩🏾', online:true,  unread:2, last_message:'Bonjour ! Ravi de te rencontrer 😊', last_message_at: new Date(Date.now()-300000).toISOString(),   conversation_id:1 },
    { id:2, uuid:'m2', first_name:'Laure',  age:28, country_code:'FR', city:'Lyon',      emoji:'👩🏼', online:false, unread:0, last_message:"J'adore la cuisine africaine !",      last_message_at: new Date(Date.now()-7200000).toISOString(),  conversation_id:2 },
    { id:3, uuid:'m3', first_name:'Fatou',  age:24, country_code:'SN', city:'Dakar',     emoji:'👩🏿', online:true,  unread:1, last_message:'Quand est-ce qu\'on se voit ? 🌍',    last_message_at: new Date(Date.now()-86400000).toISOString(), conversation_id:3 },
    { id:4, uuid:'m4', first_name:'Sofia',  age:30, country_code:'BR', city:'São Paulo', emoji:'👩🏽', online:false, unread:0, last_message:'Tu parles portugais ? 🇧🇷',            last_message_at: new Date(Date.now()-172800000).toISOString(),conversation_id:4 },
  ];

  async function loadMatches() {
    try {
      const data = await API.get('/matches');
      if (data?.data && data.data.length > 0) {
        matches = data.data;
      } else {
        // Pas encore de vrais matchs → afficher démo
        matches = DEMO_MATCHES;
      }
    } catch(e) {
      console.log('Matches API error, fallback démo:', e);
      matches = DEMO_MATCHES;
    }
  }

  async function render() {
    const page = document.getElementById('page-matches');
    if (!page) return;

    // Afficher un loader pendant le chargement
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Mes Matchs 💞</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted);font-size:14px;">
        Chargement...
      </div>`;

    await loadMatches();

    const totalUnread = matches.reduce((a, m) => a + (m.unread || 0), 0);
    const badge = document.getElementById('badge-matches');
    if (badge) {
      if (totalUnread > 0) { badge.textContent = totalUnread; badge.classList.remove('hidden'); }
      else { badge.classList.add('hidden'); }
    }

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Mes Matchs 💞</div>
        <span style="font-size:13px;color:var(--muted);">${matches.length} match${matches.length > 1 ? 's' : ''}</span>
      </div>

      <!-- Nouveaux matchs (horizontal) -->
      <div class="section-head">
        <h3>Nouveaux matchs</h3>
        <p>Dites bonjour !</p>
      </div>
      <div style="display:flex;gap:14px;overflow-x:auto;padding:0 16px 20px;scrollbar-width:none;">
        ${matches.map(m => `
          <div onclick="ChatPage.open(${JSON.stringify(m).replace(/"/g,'&quot;')})" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;">
            <div style="position:relative;">
              <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:36px;border:2.5px solid ${m.unread ? 'var(--pink)' : 'var(--border)'};">
                ${m.main_photo
                  ? `<img src="${m.main_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'">`
                  : (m.emoji || '👤')}
              </div>
              ${m.online ? '<div style="position:absolute;bottom:2px;right:2px;width:14px;height:14px;background:var(--green);border:2px solid var(--dark);border-radius:50%;"></div>' : ''}
            </div>
            <span style="font-size:12px;font-weight:500;color:${m.unread ? 'var(--white)' : 'var(--muted)'};">${m.first_name}</span>
          </div>
        `).join('')}
      </div>

      <!-- Liste conversations -->
      <div class="section-head">
        <h3>Messages</h3>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;padding:0 8px;">
        ${matches.map(m => `
          <div class="match-item" onclick="ChatPage.open(${JSON.stringify(m).replace(/"/g,'&quot;')})">
            <div class="match-avatar">
              <div class="match-avatar-emoji" style="background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:32px;border-radius:50%;overflow:hidden;">
                ${m.main_photo
                  ? `<img src="${m.main_photo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='${m.emoji || '👤'}'">`
                  : (m.emoji || '👤')}
              </div>
              ${m.online ? '<div class="match-online-dot"></div>' : ''}
            </div>
            <div class="match-info">
              <div class="match-name">${m.first_name} <span style="font-size:12px;color:var(--muted);font-weight:400;">${Utils.countryFlag ? Utils.countryFlag(m.country_code) : ''}</span></div>
              <div class="match-preview" ${m.unread ? 'style="color:rgba(255,255,255,0.8);font-weight:500;"' : ''}>${m.last_message || '...'}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
              <span class="match-time">${m.last_message_at ? Utils.timeAgo(m.last_message_at) : ''}</span>
              ${m.unread ? `<span class="match-unread-badge">${m.unread}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${matches.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">💞</div>
          <h3>Pas encore de matchs</h3>
          <p>Continuez à découvrir des profils pour obtenir vos premiers matchs !</p>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="App.navigate('feed')">Découvrir des profils</button>
        </div>
      ` : ''}
    `;
  }

  return { render };
})();
