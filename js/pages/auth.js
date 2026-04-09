// js/pages/auth.js
const AuthPage = (() => {

  const COUNTRIES = [
    {code:'BJ',name:'Bénin',flag:'🇧🇯'},{code:'CI',name:'Côte d\'Ivoire',flag:'🇨🇮'},
    {code:'SN',name:'Sénégal',flag:'🇸🇳'},{code:'NG',name:'Nigéria',flag:'🇳🇬'},
    {code:'GH',name:'Ghana',flag:'🇬🇭'},{code:'CM',name:'Cameroun',flag:'🇨🇲'},
    {code:'TG',name:'Togo',flag:'🇹🇬'},{code:'ML',name:'Mali',flag:'🇲🇱'},
    {code:'MA',name:'Maroc',flag:'🇲🇦'},{code:'DZ',name:'Algérie',flag:'🇩🇿'},
    {code:'TN',name:'Tunisie',flag:'🇹🇳'},{code:'EG',name:'Égypte',flag:'🇪🇬'},
    {code:'KE',name:'Kenya',flag:'🇰🇪'},{code:'ZA',name:'Afrique du Sud',flag:'🇿🇦'},
    {code:'FR',name:'France',flag:'🇫🇷'},{code:'BE',name:'Belgique',flag:'🇧🇪'},
    {code:'CH',name:'Suisse',flag:'🇨🇭'},{code:'DE',name:'Allemagne',flag:'🇩🇪'},
    {code:'GB',name:'Royaume-Uni',flag:'🇬🇧'},{code:'ES',name:'Espagne',flag:'🇪🇸'},
    {code:'IT',name:'Italie',flag:'🇮🇹'},{code:'PT',name:'Portugal',flag:'🇵🇹'},
    {code:'US',name:'États-Unis',flag:'🇺🇸'},{code:'CA',name:'Canada',flag:'🇨🇦'},
    {code:'BR',name:'Brésil',flag:'🇧🇷'},{code:'AE',name:'Émirats',flag:'🇦🇪'},
  ];

  let onboardingData = {};
  let currentStep = 1;
  const TOTAL_STEPS = 5;

  function render() {
    const view = document.getElementById('view-auth');
    view.innerHTML = `
      <div style="min-height:100vh;background:var(--dark);display:flex;flex-direction:column;">
        <!-- Header Auth -->
        <div style="padding:56px 24px 0;text-align:center;">
          <div style="width:64px;height:64px;background:linear-gradient(135deg,var(--pink),#C41F65);border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 28px rgba(232,49,122,0.4);">
            <svg width="40" height="40" viewBox="0 0 56 56" fill="none">
              <path d="M28 36 C22 28, 8 26, 5 31 C2 36, 11 44, 23 39 C25.5 38, 27 37, 28 36Z" fill="white" opacity="0.9"/>
              <path d="M28 36 C24 30, 12 22, 8 25 C4 28, 10 38, 22 37 C25 37, 27 36.5, 28 36Z" fill="white" opacity="0.6"/>
              <path d="M28 36 C34 28, 48 26, 51 31 C54 36, 45 44, 33 39 C30.5 38, 29 37, 28 36Z" fill="black" opacity="0.85"/>
              <path d="M28 36 C32 30, 44 22, 48 25 C52 28, 46 38, 34 37 C31 37, 29 36.5, 28 36Z" fill="black" opacity="0.55"/>
            </svg>
          </div>
          <h1 style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;margin-bottom:6px;">Mixte-Meet</h1>
          <p style="font-size:14px;color:var(--muted);">L'amour n'a pas de frontières 🌍</p>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:0;padding:32px 24px 0;border-bottom:1px solid var(--border);margin-top:32px;">
          <button id="tab-login" onclick="AuthPage.showLogin()"
            style="flex:1;padding:12px;background:none;border:none;border-bottom:2px solid var(--pink);color:var(--white);font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;cursor:pointer;">
            Connexion
          </button>
          <button id="tab-register" onclick="AuthPage.showRegister()"
            style="flex:1;padding:12px;background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-family:'Outfit',sans-serif;font-size:15px;font-weight:500;cursor:pointer;">
            S'inscrire
          </button>
        </div>

        <!-- Form container -->
        <div id="auth-form-container" style="flex:1;padding:28px 24px;overflow-y:auto;">
          ${renderLoginForm()}
        </div>
      </div>
    `;
  }

  function renderLoginForm() {
    return `
      <form id="login-form" onsubmit="AuthPage.submitLogin(event)">
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="input-group">
            <label class="input-label">Email</label>
            <div class="input-icon-wrap">
              <span class="input-icon">✉️</span>
              <input name="email" type="email" class="input-field" placeholder="votre@email.com" autocomplete="email" required>
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Mot de passe</label>
            <div class="input-icon-wrap">
              <span class="input-icon">🔒</span>
              <input name="password" type="password" class="input-field" placeholder="••••••••" autocomplete="current-password" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:8px;">
            Se connecter
          </button>
          <div class="divider">ou</div>
          <button type="button" class="btn btn-secondary btn-full" onclick="AuthPage.demoLogin()">
            🎭 Connexion démo
          </button>
          <p style="text-align:center;font-size:13px;color:var(--muted);margin-top:8px;">
            Pas encore inscrit ? <button type="button" onclick="AuthPage.showRegister()" style="background:none;border:none;color:var(--pink-light);cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;">Créer un compte</button>
          </p>
        </div>
      </form>
    `;
  }

  function renderOnboardingStep(step) {
    const steps = {
      1: `
        <div class="onboarding-step">
          <div style="padding:20px 24px 0;display:flex;align-items:center;gap:12px;">
            ${step > 1 ? `<button onclick="AuthPage.prevStep()" class="header-btn">←</button>` : ''}
            <div class="progress-bar" style="flex:1;"><div class="progress-bar-fill" style="width:${(step/TOTAL_STEPS)*100}%"></div></div>
            <span style="font-size:12px;color:var(--muted);">${step}/${TOTAL_STEPS}</span>
          </div>
          <div class="onboarding-content">
            <div class="onboarding-title">Bonjour ! Je suis <em>ravie</em> de vous accueillir 🦋</div>
            <p class="onboarding-desc">Commençons par votre identité. Ces informations ne seront jamais partagées.</p>
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div class="input-group">
                <label class="input-label">Prénom *</label>
                <input id="ob-firstname" type="text" class="input-field" placeholder="Votre prénom" value="${onboardingData.first_name||''}">
              </div>
              <div class="input-group">
                <label class="input-label">Date de naissance *</label>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                  <select id="ob-birth-day" class="input-field" style="padding:12px 8px;font-size:13px;"><option value="">Jour</option><option value="01">1</option><option value="02">2</option><option value="03">3</option><option value="04">4</option><option value="05">5</option><option value="06">6</option><option value="07">7</option><option value="08">8</option><option value="09">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option><option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option><option value="20">20</option><option value="21">21</option><option value="22">22</option><option value="23">23</option><option value="24">24</option><option value="25">25</option><option value="26">26</option><option value="27">27</option><option value="28">28</option><option value="29">29</option><option value="30">30</option><option value="31">31</option></select>
                  <select id="ob-birth-month" class="input-field" style="padding:12px 8px;font-size:13px;"><option value="">Mois</option><option value="01">Janvier</option><option value="02">Février</option><option value="03">Mars</option><option value="04">Avril</option><option value="05">Mai</option><option value="06">Juin</option><option value="07">Juillet</option><option value="08">Août</option><option value="09">Septembre</option><option value="10">Octobre</option><option value="11">Novembre</option><option value="12">Décembre</option></select>
                  <select id="ob-birth-year" class="input-field" style="padding:12px 8px;font-size:13px;"><option value="">Année</option><option value="2006">2006</option><option value="2005">2005</option><option value="2004">2004</option><option value="2003">2003</option><option value="2002">2002</option><option value="2001">2001</option><option value="2000">2000</option><option value="1999">1999</option><option value="1998">1998</option><option value="1997">1997</option><option value="1996">1996</option><option value="1995">1995</option><option value="1994">1994</option><option value="1993">1993</option><option value="1992">1992</option><option value="1991">1991</option><option value="1990">1990</option><option value="1989">1989</option><option value="1988">1988</option><option value="1987">1987</option><option value="1986">1986</option><option value="1985">1985</option><option value="1984">1984</option><option value="1983">1983</option><option value="1982">1982</option><option value="1981">1981</option><option value="1980">1980</option><option value="1979">1979</option><option value="1978">1978</option><option value="1977">1977</option><option value="1976">1976</option><option value="1975">1975</option><option value="1974">1974</option><option value="1973">1973</option><option value="1972">1972</option><option value="1971">1971</option><option value="1970">1970</option><option value="1969">1969</option><option value="1968">1968</option><option value="1967">1967</option><option value="1966">1966</option><option value="1965">1965</option><option value="1964">1964</option><option value="1963">1963</option><option value="1962">1962</option><option value="1961">1961</option><option value="1960">1960</option></select>
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">Email *</label>
                <input id="ob-email" type="email" class="input-field" placeholder="votre@email.com" value="${onboardingData.email||''}">
              </div>
              <div class="input-group">
                <label class="input-label">Mot de passe *</label>
                <div style="position:relative;">
                  <input id="ob-password" type="password" class="input-field" placeholder="Minimum 8 caractères" style="padding-right:48px;">
                  <button type="button" onclick="AuthPage.togglePassword('ob-password',this)" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:rgba(255,255,255,0.5);padding:4px;">👁️</button>
                </div>
              </div>
            </div>
          </div>
          <div style="padding:0 24px 24px;">
            <button class="btn btn-primary btn-full" onclick="AuthPage.nextStep(1)">Continuer →</button>
          </div>
        </div>
      `,
      2: `
        <div class="onboarding-step">
          <div style="padding:20px 24px 0;display:flex;align-items:center;gap:12px;">
            <button onclick="AuthPage.prevStep()" class="header-btn">←</button>
            <div class="progress-bar" style="flex:1;"><div class="progress-bar-fill" style="width:${(step/TOTAL_STEPS)*100}%"></div></div>
            <span style="font-size:12px;color:var(--muted);">${step}/${TOTAL_STEPS}</span>
          </div>
          <div class="onboarding-content">
            <div class="onboarding-title">Je suis...</div>
            <p class="onboarding-desc">Sélectionnez votre genre.</p>
            <div class="option-grid">
              ${[{v:'man',icon:'👨',l:'Homme'},{v:'woman',icon:'👩',l:'Femme'},{v:'non_binary',icon:'🧑',l:'Non-binaire'},{v:'other',icon:'💫',l:'Autre'}]
                .map(g => `<div class="option-card ${onboardingData.gender===g.v?'selected':''}" onclick="AuthPage.selectGender('${g.v}')">
                  <div class="option-card-icon">${g.icon}</div>
                  <div class="option-card-label">${g.l}</div>
                </div>`).join('')}
            </div>
          </div>
          <div style="padding:0 24px 24px;">
            <button class="btn btn-primary btn-full" onclick="AuthPage.nextStep(2)">Continuer →</button>
          </div>
        </div>
      `,
      3: `
        <div class="onboarding-step">
          <div style="padding:20px 24px 0;display:flex;align-items:center;gap:12px;">
            <button onclick="AuthPage.prevStep()" class="header-btn">←</button>
            <div class="progress-bar" style="flex:1;"><div class="progress-bar-fill" style="width:${(step/TOTAL_STEPS)*100}%"></div></div>
            <span style="font-size:12px;color:var(--muted);">${step}/${TOTAL_STEPS}</span>
          </div>
          <div class="onboarding-content">
            <div class="onboarding-title">Je recherche...</div>
            <p class="onboarding-desc">Vous pourrez affiner vos préférences plus tard.</p>
            <div class="option-grid">
              ${[{v:'man',icon:'👨',l:'Des hommes'},{v:'woman',icon:'👩',l:'Des femmes'},{v:'non_binary',icon:'🧑',l:'Non-binaires'},{v:'all',icon:'💞',l:'Tout le monde'}]
                .map(g => `<div class="option-card ${onboardingData.looking_for===g.v?'selected':''}" onclick="AuthPage.selectLookingFor('${g.v}')">
                  <div class="option-card-icon">${g.icon}</div>
                  <div class="option-card-label">${g.l}</div>
                </div>`).join('')}
            </div>
          </div>
          <div style="padding:0 24px 24px;">
            <button class="btn btn-primary btn-full" onclick="AuthPage.nextStep(3)">Continuer →</button>
          </div>
        </div>
      `,
      4: `
        <div class="onboarding-step">
          <div style="padding:20px 24px 0;display:flex;align-items:center;gap:12px;">
            <button onclick="AuthPage.prevStep()" class="header-btn">←</button>
            <div class="progress-bar" style="flex:1;"><div class="progress-bar-fill" style="width:${(step/TOTAL_STEPS)*100}%"></div></div>
            <span style="font-size:12px;color:var(--muted);">${step}/${TOTAL_STEPS}</span>
          </div>
          <div class="onboarding-content">
            <div class="onboarding-title">D'où venez-vous ? 🌍</div>
            <p class="onboarding-desc">Votre origine est votre richesse — partagez-la.</p>
            <div class="input-group">
              <label class="input-label">Votre pays</label>
              <select id="ob-country" class="input-field">
                <option value="">Sélectionnez votre pays...</option>
                ${COUNTRIES.map(c => `<option value="${c.code}" ${onboardingData.country_code===c.code?'selected':''}>${c.flag} ${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="input-group" style="margin-top:14px;">
              <label class="input-label">Ville (optionnel)</label>
              <input id="ob-city" type="text" class="input-field" placeholder="Ex: Paris, Abidjan..." value="${onboardingData.city||''}">
            </div>
            <div class="toggle-row" style="margin-top:20px;">
              <div>
                <div class="toggle-label">Ouvert(e) aux rencontres mixtes</div>
                <div class="toggle-desc">Rencontres interculturelles, interraciales</div>
              </div>
              <div class="toggle on" id="toggle-interracial" onclick="this.classList.toggle('on')"></div>
            </div>
          </div>
          <div style="padding:0 24px 24px;">
            <button class="btn btn-primary btn-full" onclick="AuthPage.nextStep(4)">Continuer →</button>
          </div>
        </div>
      `,
      5: `
        <div class="onboarding-step">
          <div style="padding:20px 24px 0;display:flex;align-items:center;gap:12px;">
            <button onclick="AuthPage.prevStep()" class="header-btn">←</button>
            <div class="progress-bar" style="flex:1;"><div class="progress-bar-fill" style="width:100%"></div></div>
            <span style="font-size:12px;color:var(--muted);">${step}/${TOTAL_STEPS}</span>
          </div>
          <div class="onboarding-content">
            <div class="onboarding-title">Parlez-nous de <em>vous</em> ✨</div>
            <p class="onboarding-desc">Quelques mots qui vous définissent. Vous pourrez modifier ça plus tard.</p>
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div class="input-group">
                <label class="input-label">Votre bio</label>
                <textarea id="ob-bio" class="input-field" placeholder="Je suis curieux(se), j'aime voyager, la cuisine et les rencontres authentiques..." rows="4" style="resize:none;">${onboardingData.bio||''}</textarea>
              </div>
              <div class="input-group">
                <label class="input-label">Profession (optionnel)</label>
                <input id="ob-profession" type="text" class="input-field" placeholder="Ex: Ingénieur, Enseignant, Entrepreneur..." value="${onboardingData.profession||''}">
              </div>
              <div class="input-group">
                <label class="input-label">Langues parlées</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
                  ${[{v:'fr',l:'🇫🇷 Français'},{v:'en',l:'🇬🇧 Anglais'},{v:'es',l:'🇪🇸 Espagnol'},{v:'pt',l:'🇧🇷 Portugais'},{v:'ar',l:'🇸🇦 Arabe'}]
                    .map(lang => `<div class="filter-chip ${(onboardingData.languages||[]).includes(lang.v)?'active':''}" onclick="AuthPage.toggleLang('${lang.v}',this)">${lang.l}</div>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <div style="padding:0 24px 24px;">
            <button class="btn btn-primary btn-full" onclick="AuthPage.submitRegister()" id="btn-finish">
              🦋 Créer mon profil
            </button>
          </div>
        </div>
      `,
    };
    return steps[step] || steps[1];
  }

  return {
    render,

    showLogin() {
      document.getElementById('tab-login').style.borderBottomColor = 'var(--pink)';
      document.getElementById('tab-login').style.color = 'var(--white)';
      document.getElementById('tab-login').style.fontWeight = '600';
      document.getElementById('tab-register').style.borderBottomColor = 'transparent';
      document.getElementById('tab-register').style.color = 'var(--muted)';
      document.getElementById('tab-register').style.fontWeight = '500';
      document.getElementById('auth-form-container').innerHTML = renderLoginForm();
    },

    showRegister() {
      document.getElementById('tab-register').style.borderBottomColor = 'var(--pink)';
      document.getElementById('tab-register').style.color = 'var(--white)';
      document.getElementById('tab-register').style.fontWeight = '600';
      document.getElementById('tab-login').style.borderBottomColor = 'transparent';
      document.getElementById('tab-login').style.color = 'var(--muted)';
      document.getElementById('tab-login').style.fontWeight = '500';
      currentStep = 1;
      onboardingData = {};
      document.getElementById('auth-form-container').innerHTML = renderOnboardingStep(1);
    },

    prevStep() {
      if (currentStep > 1) { currentStep--; document.getElementById('auth-form-container').innerHTML = renderOnboardingStep(currentStep); }
    },

    nextStep(step) {
      // Validation
      if (step === 1) {
        const fn = document.getElementById('ob-firstname')?.value.trim();
        const day   = document.getElementById('ob-birth-day')?.value;
        const month = document.getElementById('ob-birth-month')?.value;
        const year  = document.getElementById('ob-birth-year')?.value;
        const bd    = (day && month && year) ? `${year}-${month}-${day}` : '';
        const em = document.getElementById('ob-email')?.value.trim();
        const pw = document.getElementById('ob-password')?.value;
        if (!fn) return Toast.error('Prénom requis');
        if (!bd) return Toast.error('Date de naissance requise');
        if (!em) return Toast.error('Email requis');
        if (!pw || pw.length < 8) return Toast.error('Mot de passe : 8 caractères minimum');
        Object.assign(onboardingData, { first_name: fn, birthdate: bd, email: em, password: pw });
      }
      if (step === 2 && !onboardingData.gender) return Toast.error('Sélectionnez votre genre');
      if (step === 3 && !onboardingData.looking_for) return Toast.error('Sélectionnez vos préférences');
      if (step === 4) {
        const country = document.getElementById('ob-country')?.value;
        if (!country) return Toast.error('Sélectionnez votre pays');
        const city = document.getElementById('ob-city')?.value.trim();
        const interracial = document.getElementById('toggle-interracial')?.classList.contains('on');
        const countryObj = COUNTRIES.find(c => c.code === country);
        Object.assign(onboardingData, { country_code: country, country_name: countryObj?.name, city, open_to_interracial: interracial });
      }
      currentStep++;
      document.getElementById('auth-form-container').innerHTML = renderOnboardingStep(currentStep);
    },

    selectGender(v)      { onboardingData.gender = v; document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected')); event.currentTarget.classList.add('selected'); },
    selectLookingFor(v)  { onboardingData.looking_for = v; document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected')); event.currentTarget.classList.add('selected'); },
    toggleLang(v, el) {
      onboardingData.languages = onboardingData.languages || [];
      if (onboardingData.languages.includes(v)) { onboardingData.languages = onboardingData.languages.filter(l => l !== v); el.classList.remove('active'); }
      else { onboardingData.languages.push(v); el.classList.add('active'); }
    },

    async submitLogin(event) {
      event.preventDefault();
      const form = event.target;
      await Utils.handleForm(form, async () => {
        const email = form.email.value.trim();
        const password = form.password.value;
        await AuthService.login(email, password);
        Toast.success('Bienvenue sur Mixte-Meet ! 🦋');
        setTimeout(() => App.showApp(), 500);
      });
    },

    async demoLogin() {
      // Mode démo - simuler un utilisateur connecté
      AuthService.save({
        accessToken: 'demo_token',
        refreshToken: 'demo_refresh',
        user: { id: 1, uuid: 'demo-uuid', email: 'demo@mixte-meet.com', first_name: 'Démo', gender: 'man', country_code: 'FR', is_premium: true, coins: 500 }
      });
      Toast.info('Mode démo activé 🎭');
      setTimeout(() => App.showApp(), 500);
    },

    async submitRegister() {
      // Compléter les données de l'étape 5
      const bio        = document.getElementById('ob-bio')?.value.trim();
      const profession = document.getElementById('ob-profession')?.value.trim();
      Object.assign(onboardingData, { bio, profession });

      if (!onboardingData.languages?.length) onboardingData.languages = ['fr'];

      const btn = document.getElementById('btn-finish');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loader-spinner" style="width:18px;height:18px;margin:0 auto;"></span>'; }

      try {
        await AuthService.register(onboardingData);
        Toast.success('Profil créé ! Bienvenue sur Mixte-Meet 🦋');
        setTimeout(() => App.showApp(), 600);
      } catch (err) {
        Toast.error(err.message || 'Erreur lors de la création du compte');
        if (btn) { btn.disabled = false; btn.innerHTML = '🦋 Créer mon profil'; }
      }
    },
  };
})();
