// js/pages/matches.js
const MatchesPage = (() => {
  let matches = [];

  const DEMO_MATCHES = [
    { id:1, uuid:'m1', first_name:'Amina', age:26, country_code:'CI', city:'Abidjan', emoji:'👩🏾', online:true, unread:2, last_message:'Bonjour !', last_message_at: new Date(Date.now()-300000).toISOString(), conversation_id:1 },
    { id:2, uuid:'m2', first_name:'Laure', age:28, country_code:'FR', city:'Lyon', emoji:'👩🏼', online:false, unread:0, last_message:"J'adore ca !", last_message_at: new Date(Date.now()-7200000).toISOString(), conversation_id:2 },
  ];

  function openMatch(uuid) {
    const match = matches.find(m => String(m.uuid) === String(uuid));
    if (!match) { Toast.error('Match introuvable'); return; }
    ChatPage.open(match);
  }

  async function loadMatches() {
    try {
      const data = await API.get('/matches');
      if (data?.data && data.data.length > 0) {
        // Calculer le vrai statut en ligne depuis last_active_at
      matches = data.data.map(function(m) {
        const rawDate = m.last_active_at ? m.last_active_at : null;
        const lastActive = rawDate ? new Date(rawDate) : null;
        const diff = lastActive ? (Date.now() - lastActive) : Infinity;
        m.online = diff < 1800000;
        m.absent = diff >= 1800000 && diff < 7200000;
        m.onlineColor = diff < 1800000 ? '#22c55e' : (diff < 7200000 ? '#f59e0b' : null);
        return m;
      });
      } else {
        matches = DEMO_MATCHES;
      }
    } catch(e) {
      console.log('Matches error:', e);
      matches = DEMO_MATCHES;
    }
  }

  async function render() {
    const page = document.getElementById('page-matches');
    if (!page) return;

    page.innerHTML = '<div class="page-header"><div class="page-header-title">Mes Matchs</div></div>' +
      '<div style="display:flex;align-items:center;justify-content:center;height:120px;color:var(--muted);font-size:14px;">Chargement...</div>';

    await loadMatches();

    const totalUnread = matches.reduce((a, m) => a + (m.unread_count || m.unread || 0), 0);
    const badge = document.getElementById('badge-matches');
    if (badge) {
      if (totalUnread > 0) { badge.textContent = totalUnread; badge.classList.remove('hidden'); }
      else { badge.classList.add('hidden'); }
    }

    // Construire le HTML avec UUID comme identifiant (pas index)
    let html = '<div class="page-header">' +
      '<div class="page-header-title">Mes Matchs 💞</div>' +
      '<span style="font-size:13px;color:var(--muted);">' + matches.length + ' match' + (matches.length > 1 ? 's' : '') + '</span>' +
      '</div>';

    if (matches.length === 0) {
      html += '<div class="empty-state">' +
        '<div class="empty-state-icon">💞</div>' +
        '<h3>Pas encore de matchs</h3>' +
        '<p>Continuez a decouvrir des profils !</p>' +
        '<button class="btn btn-primary" style="margin-top:16px;" onclick="App.navigate(\'feed\')">Decouvrir des profils</button>' +
        '</div>';
      page.innerHTML = html;
      return;
    }

    // Section bulles
    html += '<div class="section-head"><h3>Nouveaux matchs</h3><p>Dites bonjour !</p></div>';
    html += '<div style="display:flex;gap:14px;overflow-x:auto;padding:0 16px 20px;scrollbar-width:none;">';
    matches.forEach(function(m) {
      const hasUnread = (m.unread_count || m.unread || 0) > 0;
      html += '<div onclick="MatchesPage.openMatch(\'' + m.uuid + '\')" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;">' +
        '<div style="position:relative;">' +
          '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:36px;border:2.5px solid ' + (hasUnread ? 'var(--pink)' : 'var(--border)') + ';overflow:hidden;">' +
            (m.main_photo ? '<img src="' + m.main_photo + '" style="width:100%;height:100%;object-fit:cover;">' : (m.emoji || '👤')) +
          '</div>' +
          (m.onlineColor ? '<div style="position:absolute;bottom:2px;right:2px;width:14px;height:14px;background:' + m.onlineColor + ';border:2px solid var(--dark);border-radius:50%;box-shadow:0 0 6px ' + m.onlineColor + ';"></div>' : '') +
        '</div>' +
        '<span style="font-size:12px;font-weight:500;color:white;">' + m.first_name + '</span>' +
      '</div>';
    });
    html += '</div>';

    // Section messages
    html += '<div class="section-head"><h3>Messages</h3></div>';
    html += '<div style="display:flex;flex-direction:column;gap:2px;padding:0 8px;">';
    matches.forEach(function(m) {
      const hasUnread = (m.unread_count || m.unread || 0) > 0;
      const flag = Utils.countryFlag ? Utils.countryFlag(m.country_code) : '';
      const timeAgo = m.last_message_at ? Utils.timeAgo(m.last_message_at) : '';
      html += '<button class="match-item" onclick="MatchesPage.openMatch(\'' + m.uuid + '\')" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;">' +
        '<div class="match-avatar">' +
          '<div style="background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:32px;border-radius:50%;overflow:hidden;">' +
            (m.main_photo ? '<img src="' + m.main_photo + '" style="width:100%;height:100%;object-fit:cover;">' : (m.emoji || '👤')) +
          '</div>' +
          (m.onlineColor ? '<div class="match-online-dot" style="background:' + m.onlineColor + ';box-shadow:0 0 6px ' + m.onlineColor + ';"></div>' : '') +
        '</div>' +
        '<div class="match-info">' +
          '<div class="match-name">' + m.first_name + ' <span style="font-size:12px;color:var(--muted);font-weight:400;">' + flag + '</span></div>' +
          '<div class="match-preview"' + (hasUnread ? ' style="color:rgba(255,255,255,0.8);font-weight:500;"' : '') + '>' + (m.last_message || '...') + '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">' +
          '<span class="match-time">' + timeAgo + '</span>' +
          (hasUnread ? '<span class="match-unread-badge">' + (m.unread_count || m.unread) + '</span>' : '') +
        '</div>' +
      '</button>';
    });
    html += '</div>';

    page.innerHTML = html;
  }

  return { render, openMatch };
})();





