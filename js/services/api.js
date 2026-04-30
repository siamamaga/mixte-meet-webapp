// js/services/api.js
const API = (() => {
  const BASE = 'https://api.mixte-meet.fr/api';

  async function request(method, path, body = null, isFormData = false) {
    const token = AuthService.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    try {
      const res  = await fetch(BASE + path, opts);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          AuthService.logout();
          location.reload();
        }
        throw { status: res.status, message: data.message || 'Erreur serveur' };
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, message: 'Impossible de contacter le serveur.' };
    }
  }

  return {
    get:    (path)             => request('GET',    path),
    post:   (path, body)       => request('POST',   path, body),
    put:    (path, body)       => request('PUT',    path, body),
    delete: (path)             => request('DELETE', path),
    upload: (path, formData)   => request('POST',   path, formData, true),
  };
})();

