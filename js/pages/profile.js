// js/pages/profile.js — Production complète
const ProfilePage = (() => {

  const FLAG = (code) => {
    if (!code || code.length !== 2) return '🌍';
    try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); }
    catch { return '🌍'; }
  };

  // ── Calcul complétion profil ────────────────────────────────────────────
  function calcCompletion(user, photos) {
    let score = 0;
    if (user.first_name)   score += 15;
    if (user.bio)          score += 20;
    if (user.profession)   score += 10;
    if (user.birth_date)   score += 10;
    if (user.country_code) score += 5;
    if (user.city)         score += 5;
    if (photos.length >= 1) score += 15;
    if (photos.length >= 3) score += 10;
    if (photos.length >= 6) score += 10;
    if (user.is_verified)  score += 0; // bonus visuel seulement
    return Math.min(score, 100);
  }

  // ── Render principal ────────────────────────────────────────────────────
  async function render() {
    const page = document.getElementById('page-profile');
    if (!page) return;

    // Skeleton loader
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Mon Profil</div>
        <button class="header-btn" onclick="App.navigate('settings');SettingsPage.render()">⚙️</button>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 16px;">
        <div style="width:100px;height:100px;border-radius:50%;background:var(--surface);"></div>
        <div style="width:140px;height:20px;border-radius:8px;background:var(--surface);"></div>
        <div style="width:100%;height:80px;border-radius:12px;background:var(--surface);"></div>
      </div>`;

    // Charger données réelles
    let user  = AuthService.getUser() || {};
    let stats = { likes_received: 0, matches_count: 0 };
    let photos = [];

    try {
      const [meRes, statsRes, photosRes] = await Promise.allSettled([
        API.get('/me'),
        API.get('/me/stats'),
        API.get('/me/photos'),
      ]);
      if (meRes.status === 'fulfilled' && meRes.value?.data) {
        user = meRes.value.data;
        AuthService.updateUser(user);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        stats = statsRes.value.data;
      }
      if (photosRes.status === 'fulfilled' && photosRes.value?.data) {
        photos = photosRes.value.data;
      }
    } catch(e) { console.log('Profile load error:', e); }

    const completion = calcCompletion(user, photos);
    const mainPhoto  = photos.find(p => p.is_main);
    const avatarHtml = mainPhoto
      ? `<img src="${mainPhoto.url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : `<span style="font-size:48px;">👤</span>`;

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Mon Profil</div>
        <button class="header-btn" onclick="App.navigate('settings');SettingsPage.render()">⚙️</button>
      </div>

      <div style="padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:16px;">

        <!-- Avatar -->
        <label for="photo-input" style="position:relative;width:100px;height:100px;cursor:pointer;display:block;">
          <div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid rgba(232,49,122,0.4);">
            ${avatarHtml}
          </div>
          <div style="position:absolute;bottom:0;right:0;width:30px;height:30px;background:var(--pink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid var(--dark);">📷</div>
        </div>
        <label for="photo-input" style="display:none;">Photo</label>
        <input type="file" id="photo-input" accept="image/*" style="position:fixed;top:-999px;left:-999px;width:1px;height:1px;opacity:0;" onchange="ProfilePage.uploadPhoto(this)">

        <!-- Nom + statut -->
        <div style="text-align:center;">
          <h2 style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;">
            ${Utils.escapeHtml(user.first_name || 'Utilisateur')}
            ${user.is_verified ? '<span style="font-size:16px;">✅</span>' : ''}
          </h2>
          <p style="font-size:14px;color:var(--muted);margin-top:4px;">
            ${FLAG(user.country_code)} ${user.city || ''}
            ${user.city && user.country_code ? '·' : ''}
            ${user.is_premium
              ? '<span style="color:var(--gold);">⭐ Premium</span>'
              : '<span>Compte Gratuit</span>'}
          </p>
        </div>

        <!-- Stats réelles -->
        <div class="stat-cards" style="width:100%;">
          <div class="stat-card">
            <div class="stat-card-n">${stats.likes_received || 0}</div>
            <div class="stat-card-l">Likes reçus</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-n">${stats.matches_count || 0}</div>
            <div class="stat-card-l">Matchs</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-n">${stats.profile_views || 0}</div>
            <div class="stat-card-l">Vues</div>
          </div>
        </div>

        <!-- Photos -->
        <div style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="font-size:14px;font-weight:600;">Mes photos <span style="color:var(--muted);font-weight:400;">(${photos.length}/6)</span></span>
            ${photos.length < 6
              ? `<button onclick="ProfilePage.triggerPhotoUpload()" style="background:var(--pink);border:none;color:white;padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer;font-family:'Outfit',sans-serif;">+ Ajouter</button>`
              : ''}
          </div>
          <div id="photos-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${renderPhotosGrid(photos)}
          </div>
        </div>

        <!-- Complétion du profil -->
        <div style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:14px;font-weight:500;">Complétion du profil</span>
            <span style="font-size:14px;color:${completion>=70?'var(--green)':'var(--pink)'};font-weight:700;">${completion}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${completion}%;background:${completion>=70?'var(--green)':'var(--pink)'};"></div>
          </div>
          <p style="font-size:12px;color:var(--muted);margin-top:8px;">
            ${completion < 50  ? '📸 Ajoutez des photos pour 3x plus de matchs !'
            : completion < 80  ? '✍️ Complétez votre bio pour vous démarquer'
            : '🎉 Profil bien complété — continuez à liker !'}
          </p>
        </div>

        <!-- Banner Premium -->
        ${!user.is_premium ? `
          <div onclick="App.navigate('pricing')" style="width:100%;background:linear-gradient(135deg,rgba(232,49,122,0.15),rgba(196,31,101,0.08));border:1px solid rgba(232,49,122,0.3);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:14px;cursor:pointer;">
            <span style="font-size:28px;">⭐</span>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:600;">Passer Premium</div>
              <div style="font-size:12px;color:var(--muted);">Messages illimités · Voir qui vous a liké · Appels vidéo</div>
            </div>
            <span style="color:var(--pink);">›</span>
          </div>` : `
          <div style="width:100%;background:linear-gradient(135deg,rgba(201,168,76,0.15),rgba(160,120,48,0.08));border:1px solid rgba(201,168,76,0.3);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:14px;">
            <span style="font-size:28px;">⭐</span>
            <div>
              <div style="font-size:15px;font-weight:600;color:var(--gold);">Compte Premium actif</div>
              <div style="font-size:12px;color:var(--muted);">Toutes les fonctionnalités débloquées</div>
            </div>
          </div>`}
      </div>

      <!-- Menu actions -->
      <div style="padding:0 16px 40px;display:flex;flex-direction:column;gap:2px;">
        <div class="settings-row" onclick="ProfilePage.editProfile()">
          <span class="settings-icon">✍️</span>
          <div class="settings-text"><span>Modifier mon profil</span><small>Nom, bio, profession, langues</small></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="ProfilePage.editPreferences()">
          <span class="settings-icon">🎯</span>
          <div class="settings-text"><span>Mes préférences</span><small>Âge, distance, genre recherché</small></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="ProfilePage.requestVerification()">
          <span class="settings-icon">🤳</span>
          <div class="settings-text"><span>Vérifier mon profil</span><small>${user.is_verified ? '✅ Déjà vérifié' : 'Obtenez le badge certifié'}</small></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="App.navigate('settings');SettingsPage.render()">
          <span class="settings-icon">⚙️</span>
          <div class="settings-text"><span>Paramètres</span><small>Confidentialité, notifications, sécurité</small></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="ProfilePage.confirmLogout()">
          <span class="settings-icon">🚪</span>
          <div class="settings-text"><span style="color:var(--red);">Déconnexion</span></div>
          <span class="settings-arrow">›</span>
        </div>
      </div>
    `;
  }

  function renderPhotosGrid(photos) {
    let html = photos.map(p => `
      <div style="position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;">
        <img src="${p.url_thumb || p.url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.4),transparent);opacity:0;transition:opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0"></div>
        <button onclick="ProfilePage.deletePhoto(${p.id})" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);border:none;color:white;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">✕</button>
        ${p.is_main ? '<div style="position:absolute;bottom:4px;left:4px;background:var(--pink);color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;">Principale</div>' : `<button onclick="ProfilePage.setMainPhoto(${p.id})" style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.6);border:none;color:white;font-size:9px;padding:2px 6px;border-radius:10px;cursor:pointer;">Mettre en avant</button>`}
      </div>`).join('');

    if (photos.length < 6) {
      html += `<div onclick="ProfilePage.triggerPhotoUpload()" style="aspect-ratio:1;background:rgba(255,255,255,0.04);border:2px dashed rgba(255,255,255,0.12);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--pink)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.12)'">
        <span style="font-size:24px;color:var(--muted);">+</span>
        <span style="font-size:10px;color:var(--muted);">Ajouter</span>
      </div>`;
    }
    return html;
  }

  return {
    render,

    triggerPhotoUpload() {
      document.getElementById('photo-input')?.click();
    },

    async uploadPhoto(input) {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { Toast.error('Photo trop lourde (max 10 Mo)'); return; }
      Toast.info('Upload en cours... ⏳');
      try {
        const formData = new FormData();
        formData.append('photo', file);
        await API.upload('/me/photos', formData);
        Toast.success('Photo ajoutée ✅');
        render();
      } catch(err) {
        Toast.error(err.message || 'Erreur lors du téléchargement');
      }
      input.value = '';
    },

    async deletePhoto(photoId) {
      Modal.show(`
        <div style="text-align:center;padding:8px;">
          <div style="font-size:40px;margin-bottom:12px;">🗑️</div>
          <p style="margin-bottom:20px;color:var(--muted);">Supprimer cette photo définitivement ?</p>
          <div style="display:flex;gap:10px;">
            <button onclick="Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:'Outfit',sans-serif;">Annuler</button>
            <button onclick="ProfilePage._doDeletePhoto(${photoId})" style="flex:1;background:var(--red);border:none;color:white;padding:12px;border-radius:50px;cursor:pointer;font-weight:700;font-family:'Outfit',sans-serif;">Supprimer</button>
          </div>
        </div>`, '');
    },

    async _doDeletePhoto(photoId) {
      Modal.close();
      try {
        await API.delete(`/me/photos/${photoId}`);
        Toast.success('Photo supprimée');
        render();
      } catch(err) {
        Toast.error(err.message || 'Erreur');
      }
    },

    async setMainPhoto(photoId) {
      try {
        await API.put(`/me/photos/${photoId}/main`, {});
        Toast.success('Photo principale mise à jour ✅');
        render();
      } catch(err) {
        Toast.error(err.message || 'Erreur');
      }
    },

    editProfile() {
      const user = AuthService.getUser() || {};
      Modal.show(`
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="input-group">
            <label class="input-label">Prénom</label>
            <input id="edit-firstname" type="text" class="input-field" value="${Utils.escapeHtml(user.first_name || '')}" placeholder="Votre prénom">
          </div>
          <div class="input-group">
            <label class="input-label">Profession</label>
            <input id="edit-profession" type="text" class="input-field" value="${Utils.escapeHtml(user.profession || '')}" placeholder="Ex: Ingénieur, Médecin...">
          </div>
          <div class="input-group">
            <label class="input-label">Ville</label>
            <input id="edit-city" type="text" class="input-field" value="${Utils.escapeHtml(user.city || '')}" placeholder="Votre ville">
          </div>
          <div class="input-group">
            <label class="input-label">Bio</label>
            <textarea id="edit-bio" class="input-field" rows="4" placeholder="Partagez votre histoire, vos passions..." style="resize:none;">${Utils.escapeHtml(user.bio || '')}</textarea>
          </div>
          <div class="input-group">
            <label class="input-label">Langues parlées</label>
            <input id="edit-languages" type="text" class="input-field" value="${Utils.escapeHtml((user.languages || []).join(', '))}" placeholder="Français, Anglais, Wolof...">
          </div>
          <button onclick="ProfilePage.saveProfile()" style="background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:14px;border-radius:50px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;font-size:15px;">
            Sauvegarder ✅
          </button>
        </div>`, '✍️ Mon profil');
    },

    async saveProfile() {
      const payload = {
        first_name: document.getElementById('edit-firstname')?.value.trim(),
        profession: document.getElementById('edit-profession')?.value.trim(),
        city:       document.getElementById('edit-city')?.value.trim(),
        bio:        document.getElementById('edit-bio')?.value.trim(),
        languages:  document.getElementById('edit-languages')?.value.split(',').map(l => l.trim()).filter(Boolean),
      };
      try {
        const res = await API.put('/me', payload);
        if (res?.data) AuthService.updateUser(res.data);
        Toast.success('Profil mis à jour ✅');
        Modal.close();
        render();
      } catch(err) {
        Toast.error(err.message || 'Erreur lors de la mise à jour');
      }
    },

   editPreferences() {
      const user = AuthService.getUser() || {};
      const ageMin = user.age_min || 18;
      const ageMax = user.age_max || 50;

      const genderOptions = [
        { val: 'woman', icon: '👩', label: 'Des femmes' },
        { val: 'man',   icon: '👨', label: 'Des hommes' },
        { val: 'both',  icon: '💞', label: 'Tout le monde', span2: true },
      ];

      const relationOptions = [
        { val: 'serious',    icon: '💍', label: 'Relation sérieuse' },
        { val: 'casual',     icon: '💫', label: 'Rencontre casual' },
        { val: 'friendship', icon: '🤝', label: "Amitié d'abord" },
        { val: 'any',        icon: '🦋', label: 'Ouvert à tout' },
      ];

      let currentGender = 'woman';
try { const lf = typeof user.looking_for==='string'?JSON.parse(user.looking_for):(user.looking_for||[]); if(lf.includes('man')&&lf.includes('woman'))currentGender='both'; else if(lf.includes('man'))currentGender='man'; } catch(e){}
const currentRelation = user.relation_type || 'any';
const currentDist     = user.distance      || 0;

      const genderHtml = genderOptions.map(g =>
        '<div onclick="ProfilePage._selectPref(this,\'pref-gender\',\'' + g.val + '\')" ' +
          'class="option-card ' + (currentGender === g.val ? 'selected' : '') + '" ' +
          'style="padding:12px;text-align:center;cursor:pointer;border-radius:12px;border:1.5px solid ' + (currentGender === g.val ? 'var(--pink)' : 'var(--border)') + ';background:' + (currentGender === g.val ? 'rgba(232,49,122,0.1)' : 'transparent') + ';' + (g.span2 ? 'grid-column:span 2;' : '') + '">' +
          '<div style="font-size:22px;margin-bottom:4px;">' + g.icon + '</div>' +
          '<div style="font-size:12px;font-weight:600;">' + g.label + '</div>' +
        '</div>'
      ).join('');

      const relationHtml = relationOptions.map(r =>
        '<div onclick="ProfilePage._selectPref(this,\'pref-relation\',\'' + r.val + '\')" ' +
          'class="option-card ' + (currentRelation === r.val ? 'selected' : '') + '" ' +
          'style="padding:12px;text-align:center;cursor:pointer;border-radius:12px;border:1.5px solid ' + (currentRelation === r.val ? 'var(--pink)' : 'var(--border)') + ';background:' + (currentRelation === r.val ? 'rgba(232,49,122,0.1)' : 'transparent') + ';">' +
          '<div style="font-size:20px;margin-bottom:4px;">' + r.icon + '</div>' +
          '<div style="font-size:11px;font-weight:500;">' + r.label + '</div>' +
        '</div>'
      ).join('');

      const distOptions = [
        { val: 50,  label: 'Moins de 50 km' },
        { val: 100, label: 'Moins de 100 km' },
        { val: 500, label: 'Moins de 500 km' },
        { val: 0,   label: 'Monde entier' },
      ];

      const distHtml = distOptions.map(d =>
        '<option value="' + d.val + '"' + (currentDist === d.val ? ' selected' : '') + '>' + d.label + '</option>'
      ).join('');

      Modal.show(
        '<div style="display:flex;flex-direction:column;gap:20px;">' +

          '<div class="input-group">' +
            '<label class="input-label">Je recherche</label>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              genderHtml +
            '</div>' +
            '<input type="hidden" id="pref-gender" value="' + currentGender + '">' +
          '</div>' +

          '<div class="input-group">' +
            '<label class="input-label">Tranche d\'âge</label>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;color:var(--muted);">' +
              '<span>Min : <strong id="lbl-min" style="color:white;">' + ageMin + '</strong> ans</span>' +
              '<span>Max : <strong id="lbl-max" style="color:white;">' + ageMax + '</strong> ans</span>' +
            '</div>' +
            '<input type="range" id="pref-age-min" min="18" max="65" value="' + ageMin + '" style="width:100%;accent-color:var(--pink);" oninput="document.getElementById(\'lbl-min\').textContent=this.value">' +
            '<input type="range" id="pref-age-max" min="18" max="70" value="' + ageMax + '" style="width:100%;accent-color:var(--pink);margin-top:8px;" oninput="document.getElementById(\'lbl-max\').textContent=this.value">' +
          '</div>' +

          '<div class="input-group">' +
            '<label class="input-label">Type de relation</label>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              relationHtml +
            '</div>' +
            '<input type="hidden" id="pref-relation" value="' + currentRelation + '">' +
          '</div>' +

          '<div class="input-group">' +
            '<label class="input-label">Distance maximale</label>' +
            '<select id="pref-distance" class="input-field" style="background:var(--surface);">' +
              distHtml +
            '</select>' +
          '</div>' +

          '<button onclick="ProfilePage.savePreferences()" style="background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:14px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;font-size:15px;">Sauvegarder ✅</button>' +
        '</div>',
        '🎯 Mes préférences');
    },

    _selectPref(el, inputId, value) {
      const parent = el.parentElement;
      parent.querySelectorAll('.option-card').forEach(function(c) {
        c.classList.remove('selected');
        c.style.borderColor = 'var(--border)';
        c.style.background  = 'transparent';
      });
      el.classList.add('selected');
      el.style.borderColor = 'var(--pink)';
      el.style.background  = 'rgba(232,49,122,0.1)';
      const input = document.getElementById(inputId);
      if (input) input.value = value;
    },

    async savePreferences() {
  const gender   = document.getElementById('pref-gender')?.value   || 'woman';
  const age_min  = parseInt(document.getElementById('pref-age-min')?.value  || 18);
  const age_max  = parseInt(document.getElementById('pref-age-max')?.value  || 50);
  const relation = document.getElementById('pref-relation')?.value || 'any';
  const distance = parseInt(document.getElementById('pref-distance')?.value || 0);
  const lookingFor = gender === 'both' ? '["man","woman"]' : '["' + gender + '"]';
const payload  = { looking_for: lookingFor, age_min, age_max, relation_type: relation, distance };
  try {
    await API.put('/me', payload);
    Toast.success('Préférences sauvegardées ✅');
    Modal.close();
  } catch(err) { Toast.error(err.message || 'Erreur'); }
},

    async requestVerification() {
      const user = AuthService.getUser() || {};
      if (user.is_verified) { Toast.info('Votre profil est deja verifie !'); return; }

      try {
        const status = await API.get('/me/verify');
        if (status?.data?.verification_status === 'pending') {
          Modal.show(
            '<div style="text-align:center;padding:16px;">' +
              '<div style="font-size:56px;margin-bottom:12px;">⏳</div>' +
              '<h3 style="font-family:Playfair Display,serif;font-size:20px;margin-bottom:8px;">Verification en cours</h3>' +
              '<p style="color:var(--muted);font-size:14px;margin-bottom:8px;">Votre selfie est en cours d\'examen par notre equipe.</p>' +
              '<p style="color:var(--muted);font-size:12px;margin-bottom:20px;">Delai habituel : 24-48h</p>' +
              '<button onclick="Modal.close()" style="background:var(--pink);border:none;color:white;padding:12px 28px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">OK</button>' +
            '</div>', '');
          return;
        }
      } catch(e) {}

      const GESTURES = [
        { emoji: '👋', label: 'Faites un signe de la main' },
        { emoji: '✌️', label: 'Faites le signe V' },
        { emoji: '👍', label: 'Faites un pouce en haut' },
        { emoji: '🤞', label: 'Croisez les doigts' },
        { emoji: '🖐️', label: 'Montrez votre paume ouverte' },
      ];
      const gesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
      ProfilePage._currentGesture = gesture.emoji;

      Modal.show(
        '<div id="verif-step1">' +
          '<div style="text-align:center;padding:8px 0 20px;">' +
            '<div style="font-size:72px;margin-bottom:16px;">' + gesture.emoji + '</div>' +
            '<h3 style="font-family:Playfair Display,serif;font-size:20px;font-weight:700;margin-bottom:8px;">Prenez un selfie</h3>' +
            '<p style="color:var(--muted);font-size:14px;margin-bottom:4px;">Pour verifier votre identite :</p>' +
            '<p style="font-size:16px;font-weight:600;color:white;margin-bottom:20px;">' + gesture.label + '</p>' +
            '<div style="background:rgba(232,49,122,0.1);border:1px solid rgba(232,49,122,0.2);border-radius:12px;padding:12px;margin-bottom:20px;text-align:left;">' +
              '<div style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px;">' +
                '<div>✅ Visage clairement visible</div>' +
                '<div>✅ Bonne luminosite</div>' +
                '<div>✅ Geste bien visible</div>' +
                '<div>❌ Pas de lunettes de soleil</div>' +
                '<div>❌ Pas de filtre photo</div>' +
              '</div>' +
            '</div>' +
            '<input type="file" id="selfie-input" accept="image/*" capture="user" style="position:fixed;top:-9999px;left:-9999px;opacity:0;width:1px;height:1px;" onchange="ProfilePage._previewSelfie(this)">' +
            '<button onclick="document.getElementById(\'selfie-input\').click()" style="background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:14px 32px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;width:100%;font-size:15px;">📷 Prendre le selfie</button>' +
            '<p style="font-size:11px;color:var(--muted);margin-top:10px;">🔒 Photo utilisee uniquement pour verification</p>' +
          '</div>' +
        '</div>' +
        '<div id="verif-step2" style="display:none;text-align:center;">' +
          '<div style="font-size:14px;font-weight:600;margin-bottom:12px;">Verifiez votre selfie</div>' +
          '<div style="width:180px;height:180px;border-radius:50%;overflow:hidden;margin:0 auto 16px;border:3px solid var(--pink);" id="selfie-preview-wrap"></div>' +
          '<p style="color:var(--muted);font-size:13px;margin-bottom:20px;">Le geste est bien visible ?</p>' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="ProfilePage._retakeSelfie()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:Outfit,sans-serif;">🔄 Reprendre</button>' +
            '<button onclick="ProfilePage._submitSelfie()" id="btn-send-selfie" style="flex:1;background:linear-gradient(135deg,var(--pink),#C41F65);border:none;color:white;padding:12px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">✅ Envoyer</button>' +
          '</div>' +
        '</div>',
        '🤳 Verification');
    },

    _currentGesture: null,
    _selfieFile: null,

    _previewSelfie(input) {
      const file = input.files[0];
      if (!file) return;
      ProfilePage._selfieFile = file;
      const reader = new FileReader();
      reader.onload = function(e) {
        const wrap = document.getElementById('selfie-preview-wrap');
        if (wrap) wrap.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
        document.getElementById('verif-step1').style.display = 'none';
        document.getElementById('verif-step2').style.display = 'block';
      };
      reader.readAsDataURL(file);
    },

    _retakeSelfie() {
      ProfilePage._selfieFile = null;
      document.getElementById('verif-step1').style.display = 'block';
      document.getElementById('verif-step2').style.display = 'none';
      document.getElementById('selfie-input').value = '';
    },

    async _submitSelfie() {
      if (!ProfilePage._selfieFile) { Toast.error('Aucun selfie selectionne'); return; }
      const btn = document.getElementById('btn-send-selfie');
      if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }
      try {
        const formData = new FormData();
        formData.append('selfie', ProfilePage._selfieFile);
        formData.append('gesture', ProfilePage._currentGesture || '');
        await API.upload('/me/verify', formData);
        ProfilePage._selfieFile = null;
        ProfilePage._currentGesture = null;
        Modal.close();
        Toast.success('Selfie envoye ! Verification en cours (24-48h) ⏳');
      } catch(err) {
        Toast.error(err.message || 'Erreur lors de l\'envoi');
        if (btn) { btn.disabled = false; btn.textContent = '✅ Envoyer'; }
      }
    },

    confirmLogout() {
      Modal.show(`
        <div style="text-align:center;padding:8px;">
          <div style="font-size:40px;margin-bottom:12px;">🚪</div>
          <p style="margin-bottom:20px;color:var(--muted);">Voulez-vous vraiment vous déconnecter ?</p>
          <div style="display:flex;gap:10px;">
            <button onclick="Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:'Outfit',sans-serif;">Annuler</button>
            <button onclick="Modal.close();AuthService.logout()" style="flex:1;background:var(--red);border:none;color:white;padding:12px;border-radius:50px;cursor:pointer;font-weight:700;font-family:'Outfit',sans-serif;">Déconnexion</button>
          </div>
        </div>`, '');
    },
  };
})();

// ── Settings Page ─────────────────────────────────────────────────────────────
const SettingsPage = {
  render() {
    const user = AuthService.getUser() || {};
    document.getElementById('page-settings').innerHTML = `
      <div class="page-header">
        <button class="header-btn" onclick="App.navigate('profile')">←</button>
        <div class="page-header-title">Paramètres</div>
      </div>
      <div style="padding:12px 8px 60px;">

        <!-- Compte -->
        <div style="padding:16px 8px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);">Compte</div>
        <div class="settings-row" onclick="SettingsPage.changeEmail()">
          <span class="settings-icon">✉️</span>
          <div class="settings-text"><span>Email</span><small>${Utils.escapeHtml(user.email || '')}</small></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="SettingsPage.changePassword()">
          <span class="settings-icon">🔒</span>
          <div class="settings-text"><span>Changer le mot de passe</span></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="Toast.info('Vérification 2FA bientôt disponible')">
          <span class="settings-icon">🔐</span>
          <div class="settings-text"><span>Double authentification</span><small>Sécurisez votre compte</small></div>
          <span class="settings-arrow">›</span>
        </div>

        <!-- Confidentialité -->
        <div style="padding:16px 8px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);">Confidentialité</div>
        <div class="settings-row" onclick="Toast.info('Mode Incognito — fonctionnalité Premium ⭐')">
          <span class="settings-icon">👀</span>
          <div class="settings-text"><span>Mode Incognito</span><small>Visible uniquement si vous likez</small></div>
          <span style="background:var(--gold);color:black;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;">PRO</span>
        </div>
        <div class="settings-row" onclick="Toast.info('Paramètre de localisation mis à jour')">
          <span class="settings-icon">📍</span>
          <div class="settings-text"><span>Afficher ma ville</span><small>Dans les résultats de recherche</small></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="Toast.info('Qui peut vous voir — bientôt')">
          <span class="settings-icon">🌍</span>
          <div class="settings-text"><span>Visibilité du profil</span><small>Tout le monde</small></div>
          <span class="settings-arrow">›</span>
        </div>

        <!-- Notifications -->
        <div style="padding:16px 8px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);">Notifications</div>
        <div class="settings-row">
          <span class="settings-icon">💞</span>
          <div class="settings-text" style="flex:1;"><span>Nouveaux matchs</span></div>
          <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">
            <input type="checkbox" checked style="opacity:0;width:0;height:0;">
            <span style="position:absolute;inset:0;background:var(--pink);border-radius:24px;"></span>
            <span style="position:absolute;left:2px;top:2px;width:20px;height:20px;background:white;border-radius:50%;transition:0.2s;transform:translateX(20px);"></span>
          </label>
        </div>
        <div class="settings-row">
          <span class="settings-icon">💬</span>
          <div class="settings-text" style="flex:1;"><span>Nouveaux messages</span></div>
          <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">
            <input type="checkbox" checked style="opacity:0;width:0;height:0;">
            <span style="position:absolute;inset:0;background:var(--pink);border-radius:24px;"></span>
            <span style="position:absolute;left:2px;top:2px;width:20px;height:20px;background:white;border-radius:50%;transition:0.2s;transform:translateX(20px);"></span>
          </label>
        </div>

        <!-- Support -->
        <div style="padding:16px 8px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);">Support</div>
        <div class="settings-row" onclick="window.open('mailto:support@mixte-meet.fr')">
          <span class="settings-icon">❓</span>
          <div class="settings-text"><span>Contacter le support</span><small>support@mixte-meet.fr</small></div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-row" onclick="SettingsPage.exportData()">
          <span class="settings-icon">📦</span>
          <div class="settings-text"><span>Exporter mes données</span><small>Conformité RGPD</small></div>
          <span class="settings-arrow">›</span>
        </div>

        <!-- Zone dangereuse -->
        <div style="padding:16px 8px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--red);">Zone dangereuse</div>
        <div class="settings-row" onclick="SettingsPage.confirmDeleteAccount()">
          <span class="settings-icon">🗑️</span>
          <div class="settings-text"><span style="color:var(--red);">Supprimer mon compte</span><small style="color:rgba(239,68,68,0.6);">Action irréversible</small></div>
          <span class="settings-arrow" style="color:var(--red);">›</span>
        </div>

        <p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.15);margin-top:32px;padding-bottom:16px;">
          Mixte-Meet v1.0.0 · L'amour sans frontières 🦋<br>
          <span style="color:rgba(255,255,255,0.1);">© 2026 Mixte-Meet — Tous droits réservés</span>
        </p>
      </div>
    `;
  },

  changeEmail() {
    Modal.show(`
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="input-group">
          <label class="input-label">Nouvel email</label>
          <input id="new-email" type="email" class="input-field" placeholder="votre@email.com">
        </div>
        <div class="input-group">
          <label class="input-label">Mot de passe actuel</label>
          <input id="email-pwd" type="password" class="input-field" placeholder="Confirmez votre mot de passe">
        </div>
        <button onclick="SettingsPage._doChangeEmail()" style="background:var(--pink);border:none;color:white;padding:14px;border-radius:50px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;">Mettre à jour</button>
      </div>`, '✉️ Changer l\'email');
  },

  async _doChangeEmail() {
    const email = document.getElementById('new-email')?.value.trim();
    const password = document.getElementById('email-pwd')?.value;
    if (!email || !password) { Toast.error('Remplissez tous les champs'); return; }
    try {
      await API.put('/me/email', { email, password });
      Toast.success('Email mis à jour ✅');
      Modal.close();
    } catch(err) {
      Toast.error(err.message || 'Erreur');
    }
  },

  changePassword() {
    Modal.show(`
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="input-group">
          <label class="input-label">Mot de passe actuel</label>
          <input id="old-pwd" type="password" class="input-field" placeholder="••••••••">
        </div>
        <div class="input-group">
          <label class="input-label">Nouveau mot de passe</label>
          <input id="new-pwd" type="password" class="input-field" placeholder="Min. 8 caractères">
        </div>
        <div class="input-group">
          <label class="input-label">Confirmer</label>
          <input id="confirm-pwd" type="password" class="input-field" placeholder="Répétez le mot de passe">
        </div>
        <button onclick="SettingsPage._doChangePassword()" style="background:var(--pink);border:none;color:white;padding:14px;border-radius:50px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;">Modifier</button>
      </div>`, '🔒 Mot de passe');
  },

  async _doChangePassword() {
    const oldPwd  = document.getElementById('old-pwd')?.value;
    const newPwd  = document.getElementById('new-pwd')?.value;
    const confirm = document.getElementById('confirm-pwd')?.value;
    if (!oldPwd || !newPwd) { Toast.error('Remplissez tous les champs'); return; }
    if (newPwd !== confirm) { Toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPwd.length < 8)  { Toast.error('Minimum 8 caractères'); return; }
    try {
      await API.put('/me/password', { old_password: oldPwd, new_password: newPwd });
      Toast.success('Mot de passe modifié ✅');
      Modal.close();
    } catch(err) {
      Toast.error(err.message || 'Erreur');
    }
  },

  async exportData() {
    Toast.info('Préparation de vos données... ⏳');
    try {
      await API.post('/me/export', {});
      Toast.success('Vous recevrez vos données par email sous 48h ✅');
    } catch {
      Toast.info('Export RGPD disponible prochainement');
    }
  },

  confirmDeleteAccount() {
    Modal.show(`
      <div style="text-align:center;padding:8px;">
        <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
        <h3 style="font-family:'Playfair Display',serif;font-size:18px;margin-bottom:8px;color:var(--red);">Supprimer mon compte</h3>
        <p style="color:var(--muted);font-size:13px;margin-bottom:8px;">Cette action est <strong style="color:white;">irréversible</strong>. Toutes vos données, matchs et conversations seront définitivement supprimés.</p>
        <div class="input-group" style="margin-bottom:16px;">
          <input id="delete-confirm" type="text" class="input-field" placeholder='Tapez "SUPPRIMER" pour confirmer'>
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:'Outfit',sans-serif;">Annuler</button>
          <button onclick="SettingsPage._doDeleteAccount()" style="flex:1;background:var(--red);border:none;color:white;padding:12px;border-radius:50px;cursor:pointer;font-weight:700;font-family:'Outfit',sans-serif;">Supprimer</button>
        </div>
      </div>`, '');
  },

  async _doDeleteAccount() {
    const val = document.getElementById('delete-confirm')?.value;
    if (val !== 'SUPPRIMER') { Toast.error('Tapez exactement "SUPPRIMER" pour confirmer'); return; }
    try {
      await API.delete('/me');
      Modal.close();
      AuthService.clear();
      App.showAuth();
      Toast.info('Votre compte a été supprimé.');
    } catch(err) {
      Toast.error(err.message || 'Erreur lors de la suppression');
    }
  },
};














