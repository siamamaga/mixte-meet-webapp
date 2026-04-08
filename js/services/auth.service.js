// js/services/auth.service.js
const AuthService = (() => {
  const KEYS = { token: 'mm_token', refresh: 'mm_refresh', user: 'mm_user' };

  return {
    getToken:    ()  => localStorage.getItem(KEYS.token),
    getRefresh:  ()  => localStorage.getItem(KEYS.refresh),
    getUser:     ()  => JSON.parse(localStorage.getItem(KEYS.user) || 'null'),
    isLoggedIn:  ()  => !!localStorage.getItem(KEYS.token),

    save(data) {
      if (data.accessToken)  localStorage.setItem(KEYS.token,   data.accessToken);
      if (data.refreshToken) localStorage.setItem(KEYS.refresh,  data.refreshToken);
      if (data.user)         localStorage.setItem(KEYS.user, JSON.stringify(data.user));
    },

    clear() {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    },

    async refreshTokens() {
      const refreshToken = this.getRefresh();
      if (!refreshToken) { this.clear(); App.showAuth(); return; }
      try {
        const res = await fetch('http://localhost:3000/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const data = await res.json();
        if (data.success) this.save(data.data);
        else { this.clear(); App.showAuth(); }
      } catch { this.clear(); App.showAuth(); }
    },

    async login(email, password) {
      const res = await API.post('/auth/login', { email, password });
      this.save(res.data);
      return res.data;
    },

    async register(payload) {
      const res = await API.post('/auth/register', payload);
      this.save(res.data);
      return res.data;
    },

    async logout() {
      try { await API.post('/auth/logout', {}); } catch {}
      this.clear();
      SocketService.disconnect();
      App.showAuth();
    },
  };
})();
