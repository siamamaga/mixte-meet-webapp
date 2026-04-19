// js/app.js
// Parse date depuis format MySQL DD/MM/YYYY HH:MM:SS ou YYYY-MM-DD HH:MM:SS
function parseDate(str) {
  if (!str) return null;
  const m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
  if (m1) return new Date(m1[3], m1[2]-1, m1[1], m1[4], m1[5], m1[6]);
  return new Date(str.replace(' ', 'T'));
}

// Mixte-Meet SPA Router
const App = (() => {
  let currentPage = 'feed';
  const pages = {
    feed:     { el: 'page-feed',     module: FeedPage,     navBtn: 'feed' },
    matches:  { el: 'page-matches',  module: MatchesPage,  navBtn: 'matches' },
    chat:     { el: 'page-chat',     module: ChatPage,     navBtn: 'matches' },
    profile:  { el: 'page-profile',  module: ProfilePage,  navBtn: 'profile' },
    settings: { el: 'page-settings', module: SettingsPage, navBtn: 'profile' },
    search:   { el: 'page-search',   module: SearchPage,   navBtn: 'search' },
    pricing:  { el: 'page-pricing',  module: PricingPage,  navBtn: 'profile' },
  };

  // Navigation
  function navigate(page) {
    if (!pages[page]) return;
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const el = document.getElementById(pages[page].el);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector('[data-page="' + pages[page].navBtn + '"]');
    if (activeBtn) activeBtn.classList.add('active');
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = (page === 'chat' || page === 'settings') ? 'none' : 'flex';
    const mod = pages[page].module;
    if (mod && mod.render) mod.render();
  }

  // Demarrage
  async function init() {
    await new Promise(r => setTimeout(r, 1200));
    const loader = document.getElementById('app-loader');
    const app    = document.getElementById('app');
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; app.classList.remove('hidden'); }, 500);
    if (AuthService.isLoggedIn()) {
      showApp();
    } else {
      showAuth();
    }
  }

  function showAuth() {
    document.getElementById('view-auth').classList.remove('hidden');
    document.getElementById('view-app').classList.add('hidden');
    AuthPage.render();
  }

  function showApp() {
    document.getElementById('view-auth').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');
    navigate('feed');
    SocketService.connect();
    // Sync user toutes les 30s
    async function syncUser() {
      try {
        const res = await API.get('/me?t=' + Date.now());
        if (res && res.data) AuthService.updateUser(res.data);
      } catch(e) {}
    }
    syncUser();
    setInterval(syncUser, 30000);
  }

  // Écouter les appels entrants
  async function listenIncomingCalls() {
    try {
      const matches = await API.get('/matches');
      const convs = matches?.data || [];
      for (const conv of convs) {
        if (!conv.conversation_id) continue;
        const res = await API.get('/call/' + conv.conversation_id + '/signal');
        const signals = res?.data || [];
        for (const signal of signals) {
          if (signal.type === 'offer') {
            VideoCall._handleIncoming(signal, conv);
            return;
          }
        }
      }
    } catch(e) {}
  }
  setInterval(listenIncomingCalls, 10000);

  // Wake-up et keep-alive
  fetch('https://mixte-meet-backend.onrender.com/api/ping').catch(() => {});
  setInterval(function() {
    fetch('https://mixte-meet-backend.onrender.com/api/ping').catch(() => {});
  }, 60000);

  document.addEventListener('DOMContentLoaded', init);

  // Bouton retour navigateur
  history.pushState(null, '', window.location.href);
  window.addEventListener('popstate', function() {
    history.pushState(null, '', window.location.href);
    if (currentPage === 'feed') {
      Modal.show(
        '<div style="text-align:center;padding:16px;">' +
          '<div style="font-size:48px;margin-bottom:12px;">🦋</div>' +
          '<p style="font-size:16px;font-weight:600;margin-bottom:8px;">Quitter Mixte-Meet ?</p>' +
          '<p style="font-size:13px;color:var(--muted);margin-bottom:20px;">L\'amour n\'a pas de frontières !</p>' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="Modal.close()" style="flex:1;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">Rester 🦋</button>' +
            '<button onclick="Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:Outfit,sans-serif;">Quitter</button>' +
          '</div>' +
        '</div>', '');
    } else if (currentPage === 'chat') {
      navigate('matches');
    } else if (currentPage === 'settings') {
      navigate('profile');
    } else if (currentPage === 'pricing') {
      navigate('profile');
    } else {
      navigate('feed');
    }
  });

  return { navigate, showAuth, showApp };
})();

