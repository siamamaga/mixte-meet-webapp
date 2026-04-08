// js/pages/profile.js
const ProfilePage = (() => {
  function render() {
    const user = AuthService.getUser() || { first_name:'Utilisateur', country_code:'FR', is_premium:false, coins:0 };
    const flag = (code) => {
      if (!code || code.length !== 2) return '🌍';
      return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    };

    document.getElementById('page-profile').innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Mon Profil</div>
        <button class="header-btn" onclick="App.navigate('settings');SettingsPage.render()">⚙️</button>
      </div>
      <div style="padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:16px;">

        <!-- Avatar avec upload -->
        <div style="position:relative;width:100px;height:100px;cursor:pointer;" onclick="ProfilePage.triggerPhotoUpload()">
          <div id="profile-avatar" style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:48px;border:3px solid rgba(232,49,122,0.4);">
            👤
          </div>
          <div style="position:absolute;bottom:0;right:0;width:30px;height:30px;background:var(--pink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid var(--dark);">
            📷
          </div>
        </div>
        <input type="file" id="photo-input" accept="image/*" style="display:none;" onchange="ProfilePage.uploadPhoto(this)">

        <div style="text-align:center;">
          <h2 style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;">${Utils.escapeHtml(user.first_name)}</h2>
          <p style="font-size:14px;color:var(--muted);margin-top:4px;">${flag(user.country_code || 'FR')} · ${user.is_premium?'<span style="color:var(--gold);">⭐ Premium</span>':'Gratuit'}</p>
        </div>

        <div class="stat-cards" style="width:100%;">
          <div class="stat-card"><div class="stat-card-n" id="stat-likes">0</div><div class="stat-card-l">Likes reçus</div></div>
          <div class="stat-card"><div class="stat-card-n" id="stat-matchs">0</div><div class="stat-card-l">Matchs</div></div>
          <div class="stat-card"><div class="stat-card-n">${user.coins||0}</div><div class="stat-card-l">Coins</div></div>
        </div>

        <!-- Mes photos -->
        <div style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="font-size:14px;font-weight:600;">Mes photos</span>
            <button onclick="ProfilePage.triggerPhotoUpload()" style="background:var(--pink);border:none;color:white;padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer;font-family:'Outfit',sans-serif;">+ Ajouter</button>
          </div>
          <div id="photos-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            <div style="aspect-ratio:1;background:rgba(255,255,255,0.05);border:1px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;" onclick="ProfilePage.triggerPhotoUpload()">+</div>
          </div>
        </div>

        <!-- Complétion -->
        <div style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:14px;font-weight:500;">Complétion du profil</span>
            <span style="font-size:14px;color:var(--pink);font-weight:600;" id="completion-pct">30%</span>
          </div>
          <div class="progress-bar"><div class="progress-bar-fill" id="completion-bar" style="width:30%;"></div></div>
          <p style="font-size:12px;color:var(--muted);margin-top:8px;">Ajoutez des photos pour augmenter vos matchs de 3x</p>
        </div>

        <!-- Premium banner -->
        ${!user.is_premium ? `
          <div onclick="PricingPage.show()" style="width:100%;background:linear-gradient(135deg,rgba(232,49,122,0.15),rgba(196,31,101,0.08));border:1px solid rgba(232,49,122,0.3);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:14px;cursor:pointer;">
            <span style="font-size:28px;">⭐</span>
            <div><div style="font-size:15px;font-weight:600;">Passer Premium</div><div style="font-size:12px;color:var(--muted);">Accès à toutes les fonctionnalités</div></div>
            <span style="color:var(--pink);margin-left:auto;">→</span>
          </div>` : ''}
      </div>

      <!-- Menu -->
      <div style="padding:0 16px 24px;display:flex;flex-direction:column;gap:2px;">
        ${[
          {icon:'✍️', label:'Modifier ma bio',     sub:'Partagez votre histoire',       fn:'ProfilePage.editBio()'},
          {icon:'🤳', label:'Vérifier mon profil', sub:'Obtenez le badge ✅ certifié', fn:'Toast.info(\'Vérification bientôt disponible\')'},
          {icon:'🎯', label:'Mes préférences',     sub:'Qui je recherche',              fn:'Toast.info(\'Préférences bientôt disponibles\')'},
          {icon:'⚙️', label:'Paramètres',          sub:'Confidentialité, notifications',fn:'App.navigate(\'settings\');SettingsPage.render()'},
          {icon:'🚪', label:'Déconnexion',         sub:'',                              fn:'AuthService.logout()', red:true},
        ].map(r=>`
          <div class="settings-row" onclick="${r.fn}">
            <span class="settings-icon">${r.icon}</span>
            <div class="settings-text"><span ${r.red?'style="color:var(--red);"':''}>${r.label}</span>${r.sub?`<small>${r.sub}</small>`:''}</div>
            <span class="settings-arrow">›</span>
          </div>`).join('')}
      </div>
    `;

    // Charger les photos existantes
    loadPhotos();
  }

  async function loadPhotos() {
    try {
      const res = await API.get('/me/photos');
      const photos = res.data || [];
      const grid = document.getElementById('photos-grid');
      if (!grid) return;

      grid.innerHTML = photos.map(p => `
        <div style="position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;">
          <img src="${p.url_thumb || p.url}" style="width:100%;height:100%;object-fit:cover;">
          <button onclick="ProfilePage.deletePhoto(${p.id})" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);border:none;color:white;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px;">✕</button>
          ${p.is_main ? '<div style="position:absolute;bottom:4px;left:4px;background:var(--pink);color:white;font-size:9px;padding:2px 6px;border-radius:10px;">Principale</div>' : ''}
        </div>
      `).join('') + `
        ${photos.length < 6 ? `<div style="aspect-ratio:1;background:rgba(255,255,255,0.05);border:1px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;" onclick="ProfilePage.triggerPhotoUpload()">+</div>` : ''}
      `;

      // Mettre à jour la complétion
      const pct = Math.min(30 + photos.length * 10, 100);
      const pctEl = document.getElementById('completion-pct');
      const barEl = document.getElementById('completion-bar');
      if (pctEl) pctEl.textContent = pct + '%';
      if (barEl) barEl.style.width = pct + '%';

      // Mettre à jour l'avatar principal
      const main = photos.find(p => p.is_main);
      if (main) {
        const av = document.getElementById('profile-avatar');
        if (av) av.innerHTML = `<img src="${main.url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      }
    } catch(e) {
      console.log('Photos:', e.message);
    }
  }

  return {
    render,

    triggerPhotoUpload() {
      document.getElementById('photo-input')?.click();
    },

    async uploadPhoto(input) {
      const file = input.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) { Toast.error('Photo trop lourde (max 10Mo)'); return; }

      Toast.info('Upload en cours... ⏳');

      const formData = new FormData();
      formData.append('photo', file);

      try {
        const res = await API.upload('/me/photos', formData);
        Toast.success('Photo ajoutée ! ✅');
        loadPhotos();
      } catch(err) {
        Toast.error(err.message || 'Erreur lors de l\'upload');
      }
      input.value = '';
    },

    async deletePhoto(photoId) {
      if (!confirm('Supprimer cette photo ?')) return;
      try {
        await API.delete(`/me/photos/${photoId}`);
        Toast.success('Photo supprimée');
        loadPhotos();
      } catch(err) {
        Toast.error(err.message || 'Erreur');
      }
    },

    editBio() {
      Modal.show(`
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="input-group">
            <label class="input-label">Votre bio</label>
            <textarea id="bio-input" class="input-field" rows="4" placeholder="Parlez de vous..." style="resize:none;"></textarea>
          </div>
          <div class="input-group">
            <label class="input-label">Profession</label>
            <input id="prof-input" type="text" class="input-field" placeholder="Ex: Ingénieur, Médecin...">
          </div>
          <button class="btn btn-primary btn-full" onclick="ProfilePage.saveBio()">Sauvegarder</button>
        </div>
      `, '✍️ Ma bio');
    },

    async saveBio() {
      const bio  = document.getElementById('bio-input')?.value.trim();
      const prof = document.getElementById('prof-input')?.value.trim();
      try {
        await API.put('/me', { bio, profession: prof });
        Toast.success('Profil mis à jour ✅');
        Modal.close();
        render();
      } catch(err) {
        Toast.error(err.message || 'Erreur');
      }
    },

    showPremium() {
      Modal.show(`
        <div style="text-align:center;padding-bottom:8px;">
          <div style="font-size:48px;margin-bottom:12px;">⭐</div>
          <h3 style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin-bottom:8px;">Passez Premium</h3>
          <p style="font-size:14px;color:var(--muted);margin-bottom:20px;">Débloquez toutes les fonctionnalités Mixte-Meet</p>
          <div style="display:flex;flex-direction:column;gap:10px;text-align:left;margin-bottom:24px;">
            ${['Super Likes illimités','Appels vidéo HD','Traduction automatique','Mode Incognito','Voir qui vous a liké','Undo (annuler un swipe)'].map(f=>`
              <div style="display:flex;gap:10px;align-items:center;">
                <span style="color:var(--pink);font-weight:700;">✓</span>
                <span style="font-size:14px;">${f}</span>
              </div>`).join('')}
          </div>
          <button class="btn btn-primary btn-full" onclick="Modal.close();PricingPage.show()">
            Essayer 3 jours gratuits
          </button>
          <p style="font-size:11px;color:var(--muted);margin-top:10px;">Puis 9 900 CFA/mois · Annulable à tout moment</p>
        </div>
      `, '');
    },
  };
})();

const SettingsPage = {
  render() {
    document.getElementById('page-settings').innerHTML = `
      <div class="page-header">
        <button class="header-btn" onclick="App.navigate('profile')">←</button>
        <div class="page-header-title">Paramètres</div>
      </div>
      <div style="padding:12px 8px 40px;">
        ${[
          {label:'Compte', items:[
            {icon:'✉️', l:'Email',               s: AuthService.getUser()?.email || ''},
            {icon:'🔐', l:'Double auth. (2FA)',  s:'SMS de vérification'},
            {icon:'🔒', l:'Mot de passe',        s:''},
          ]},
          {label:'Confidentialité', items:[
            {icon:'👀', l:'Mode Incognito',      s:'Visible uniquement si vous likez'},
            {icon:'📍', l:'Afficher ma ville',   s:'Dans les résultats de recherche'},
          ]},
          {label:'Notifications', items:[
            {icon:'💞', l:'Nouveaux matchs',     s:''},
            {icon:'💬', l:'Nouveaux messages',   s:''},
          ]},
          {label:'Support', items:[
            {icon:'❓', l:'Centre d\'aide',      s:''},
            {icon:'🚨', l:'Signaler un problème',s:''},
            {icon:'📦', l:'Exporter mes données (RGPD)', s:''},
          ]},
        ].map(section => `
          <div style="padding:16px 8px 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);">${section.label}</div>
          ${section.items.map(r => `
            <div class="settings-row" onclick="Toast.info('${r.l}')">
              <span class="settings-icon">${r.icon}</span>
              <div class="settings-text"><span>${r.l}</span>${r.s ? `<small>${r.s}</small>` : ''}</div>
              <span class="settings-arrow">›</span>
            </div>`).join('')}
        `).join('')}

        <div style="padding:16px 8px 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--red);">Zone dangereuse</div>
        <div class="settings-row" onclick="if(confirm('Supprimer définitivement votre compte ?'))AuthService.logout()">
          <span class="settings-icon">🗑️</span>
          <div class="settings-text"><span style="color:var(--red);">Supprimer mon compte</span></div>
        </div>
        <p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.2);margin-top:24px;">Mixte-Meet v1.0.0 · L'amour sans frontières 🦋</p>
      </div>
    `;
  }
};
