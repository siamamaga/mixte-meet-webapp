// js/app.js — Mixte-Meet SPA Router

const App = (() => {
  let currentPage = 'feed';
  const pages = {
    feed:     { el: 'page-feed',     module: FeedPage,     navBtn: 'feed' },
    matches:  { el: 'page-matches',  module: MatchesPage,  navBtn: 'matches' },
    chat:     { el: 'page-chat',     module: ChatPage,     navBtn: 'matches' },
    profile:  { el: 'page-profile',  module: ProfilePage,  navBtn: 'profile' },
    settings: { el: 'page-settings', module: SettingsPage, navBtn: 'profile' },
  };

  // ── Navigation ─────────────────────────────────────────
  function navigate(page) {
    if (!pages[page]) return;
    currentPage = page;

    // Masquer toutes les pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    // Afficher la page cible
    const el = document.getElementById(pages[page].el);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }

    // Mettre à jour la nav
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-page="${pages[page].navBtn}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Masquer/montrer la bottom nav (chat = fullscreen)
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = (page === 'chat' || page === 'settings') ? 'none' : 'flex';

    // Render la page
    const mod = pages[page].module;
    if (mod?.render) mod.render();
  }

  // ── Démarrage ──────────────────────────────────────────
  async function init() {
    // Simuler un temps de chargement
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
  }

  // Wake-up immediat au demarrage
  fetch('https://mixte-meet-backend.onrender.com/api/ping').catch(() => {});
  // Keep-alive toutes les 5 min
  setInterval(() => {
    fetch('https://mixte-meet-backend.onrender.com/api/ping').catch(() => {});
  }, 300000);

  // Démarrer au chargement
  document.addEventListener('DOMContentLoaded', init);

  // Gestion du bouton retour hardware (Android) + bouton navigateur
  window.addEventListener('popstate', (e) => {
    e.preventDefault();
    if (currentPage === 'chat') {
      Modal.show(
        '<div style="text-align:center;padding:8px;">' +
          '<div style="font-size:40px;margin-bottom:12px;">🦋</div>' +
          '<p style="font-size:15px;margin-bottom:6px;font-weight:600;">Quitter Mixte-Meet ?</p>' +
          '<p style="font-size:13px;color:var(--muted);margin-bottom:20px;">Vous avez une conversation en cours.</p>' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:Outfit,sans-serif;">Rester</button>' +
            '<button onclick="Modal.close();ChatPage.close()" style="flex:1;background:var(--pink);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">Quitter</button>' +
          '</div>' +
        '</div>', '');
      history.pushState(null, '', window.location.href);
    } else if (currentPage === 'settings') {
      navigate('profile');
      history.pushState(null, '', window.location.href);
    } else if (currentPage !== 'feed') {
      navigate('feed');
      history.pushState(null, '', window.location.href);
    } else {
      // Sur la page feed - demander confirmation pour quitter l'app
      Modal.show(
        '<div style="text-align:center;padding:8px;">' +
          '<div style="font-size:48px;margin-bottom:12px;">🦋</div>' +
          '<p style="font-size:15px;margin-bottom:6px;font-weight:600;">Quitter Mixte-Meet ?</p>' +
          '<p style="font-size:13px;color:var(--muted);margin-bottom:20px;">L\'amour n\'a pas de frontières — restez encore un peu !</p>' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="Modal.close();history.pushState(null,\\'\\',window.location.href)" style="flex:1;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">Rester 🦋</button>' +
            '<button onclick="Modal.close();history.back()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:Outfit,sans-serif;">Quitter</button>' +
          '</div>' +
        '</div>', '');
      history.pushState(null, '', window.location.href);
    }
  });
  // Initialiser l'historique pour intercepter le retour
  history.pushState(null, '', window.location.href);

  return { navigate, showAuth, showApp };
})();



