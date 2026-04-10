// js/utils.js — Production

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: '🦋', warning: '⚠️' };
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || '•'}</span><span style="flex:1;">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (msg, d)  => Toast.show(msg, 'success', d),
  error:   (msg, d)  => Toast.show(msg, 'error',   d),
  info:    (msg, d)  => Toast.show(msg, 'info',    d),
  warning: (msg, d)  => Toast.show(msg, 'warning', d),
};

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = {
  show(html, title = '') {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;
    content.innerHTML =
      (title
        ? `<div style="padding:20px 20px 0;display:flex;align-items:center;justify-content:space-between;">
             <h3 style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;">${title}</h3>
             <button onclick="Modal.close()" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1;">✕</button>
           </div>`
        : '') +
      `<div style="padding:${title ? '16px' : '20px'} 20px 24px;">${html}</div>`;
    overlay.classList.remove('hidden');
    // Fermer en cliquant à l'extérieur
    overlay.onclick = (e) => { if (e.target === overlay) Modal.close(); };
  },
  close() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  },
};

// ── Utils généraux ────────────────────────────────────────────────────────────
const Utils = {

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)     return 'À l\'instant';
    if (diff < 3600)   return `${Math.floor(diff / 60)}min`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  },

  escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  },

  countryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); }
    catch { return '🌍'; }
  },

  // Calcul de l'âge depuis une date de naissance
  calcAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const bd    = new Date(birthDate);
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age;
  },

  // Formater une taille de fichier
  formatSize(bytes) {
    if (bytes < 1024)        return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  },

  // Débounce
  debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  },

  // Throttle
  throttle(fn, limit = 1000) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= limit) { last = now; fn(...args); }
    };
  },

  // Gestion form avec loader sur le bouton submit
  async handleForm(formEl, submitFn) {
    formEl.querySelectorAll('.input-error').forEach(el => el.textContent = '');
    formEl.querySelectorAll('.input-field').forEach(el => el.classList.remove('error'));
    const btn = formEl.querySelector('[type=submit]');
    const origHTML = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="loader-spinner" style="width:18px;height:18px;margin:0 auto;display:block;"></span>';
    }
    try {
      await submitFn();
    } catch (err) {
      Toast.error(err.message || 'Une erreur est survenue');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    }
  },

  // Copier dans le presse-papier
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Toast.success('Copié !');
    } catch {
      Toast.error('Impossible de copier');
    }
  },

  // Vérifier si un email est valide
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Vérifier force d'un mot de passe
  passwordStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 'faible',  color: 'var(--red)',   pct: 25 };
    if (score <= 2) return { level: 'moyen',   color: 'orange',       pct: 50 };
    if (score <= 3) return { level: 'bon',     color: 'var(--gold)',  pct: 75 };
    return              { level: 'fort',    color: 'var(--green)', pct: 100 };
  },
};