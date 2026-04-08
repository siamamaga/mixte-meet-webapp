// js/utils.js

// ── Toast ─────────────────────────────────────
const Toast = {
  show(message, type = 'info', duration = 3000) {
    const icons = { success: '✅', error: '❌', info: '🦋', warning: '⚠️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error:   (msg) => Toast.show(msg, 'error'),
  info:    (msg) => Toast.show(msg, 'info'),
};

// ── Modal ─────────────────────────────────────
const Modal = {
  show(html, title = '') {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      ${title ? `<div style="padding:20px 20px 0;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;">${title}</h3>
        <button onclick="Modal.close()" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;">✕</button>
      </div>` : ''}
      <div style="padding:${title ? '16px' : '20px'} 20px 24px;">${html}</div>
    `;
    overlay.classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },
};

// ── Helpers ───────────────────────────────────
const Utils = {
  timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `${Math.floor(diff/60)}min`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    if (diff < 604800)return `${Math.floor(diff/86400)}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  },

  formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },

  escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  countryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  },

  async handleForm(formEl, submitFn) {
    formEl.querySelectorAll('.input-error').forEach(el => el.textContent = '');
    formEl.querySelectorAll('.input-field').forEach(el => el.classList.remove('error'));
    const btn = formEl.querySelector('[type=submit]');
    const origText = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loader-spinner" style="width:18px;height:18px;margin:0 auto;"></span>'; }
    try {
      await submitFn();
    } catch (err) {
      Toast.error(err.message || 'Une erreur est survenue');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
  },
};
