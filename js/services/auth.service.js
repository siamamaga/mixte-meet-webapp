// js/services/auth.service.js — Production
const AuthService = (() => {
  const KEYS  = { token: 'mm_token', refresh: 'mm_refresh', user: 'mm_user' };
  const API_BASE = 'https://mixte-meet-backend.onrender.com/api';

  let refreshPromise = null; // évite les doubles refresh simultanés

  // ── Getters ──────────────────────────────────────────────────────────────
  const getToken   = () => localStorage.getItem(KEYS.token);
  const getRefresh = () => localStorage.getItem(KEYS.refresh);
  const getUser    = () => {
    try { return JSON.parse(localStorage.getItem(KEYS.user) || 'null'); }
    catch { return null; }
  };
  const isLoggedIn = () => !!localStorage.getItem(KEYS.token);

  // ── Sauvegarde des credentials ────────────────────────────────────────────
  function save(data) {
    if (data.accessToken)  localStorage.setItem(KEYS.token,   data.accessToken);
    if (data.refreshToken) localStorage.setItem(KEYS.refresh, data.refreshToken);
    if (data.user)         localStorage.setItem(KEYS.user,    JSON.stringify(data.user));
  }

  function clear() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  // ── Refresh automatique du token ──────────────────────────────────────────
  async function refreshTokens() {
    if (refreshPromise) return refreshPromise; // évite les doublons
    const refreshToken = getRefresh();
    if (!refreshToken) { clear(); App.showAuth(); return; }

    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken }),
        });
        const data = await res.json();
        if (data.success) {
          save(data.data);
          return data.data.accessToken;
        } else {
          clear();
          App.showAuth();
          return null;
        }
      } catch {
        clear();
        App.showAuth();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  // ── Requête authentifiée avec retry auto si 401 ───────────────────────────
  async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(url, { ...options, headers });

    // Token expiré → refresh et retry
    if (res.status === 401) {
      const newToken = await refreshTokens();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers });
      } else {
        return null;
      }
    }
    return res;
  }

  // ── Auth methods ──────────────────────────────────────────────────────────
  async function login(email, password) {
    const res = await API.post('/auth/login', { email, password });
    save(res.data);
    // Mettre à jour les infos user complètes depuis /me
    try {
      const me = await API.get('/me');
      if (me?.data) {
        localStorage.setItem(KEYS.user, JSON.stringify(me.data));
      }
    } catch {}
    return res.data;
  }

  async function register(payload) {
    const res = await API.post('/auth/register', payload);
    save(res.data);
    return res.data;
  }

  async function logout() {
    try { await API.post('/auth/logout', {}); } catch {}
    clear();
    if (typeof SocketService !== 'undefined') SocketService.disconnect();
    App.showAuth();
  }

  // ── Mise à jour profil local ──────────────────────────────────────────────
  function updateUser(patch) {
    const user = getUser() || {};
    const updated = { ...user, ...patch };
    localStorage.setItem(KEYS.user, JSON.stringify(updated));
    return updated;
  }

  // ── Refresh auto au démarrage si token proche d'expiration ───────────────
  async function init() {
    if (!isLoggedIn()) return;
    try {
      // Vérifier que le token est valide en chargeant /me
      const data = await API.get('/me');
      if (data?.data) {
        localStorage.setItem(KEYS.user, JSON.stringify(data.data));
      }
    } catch (e) {
      if (e?.status === 401) await refreshTokens();
    }
  }

  return {
    getToken, getRefresh, getUser, isLoggedIn,
    save, clear, refreshTokens, fetchWithAuth,
    login, register, logout, updateUser, init,
  };
})();