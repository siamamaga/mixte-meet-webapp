// js/pages/pricing.js — Système de tarification avec promotions
const PricingPage = (() => {

  // ── Données des plans avec promotions ─────────────────
  const PLANS = [
    {
      id: 'free',
      name: 'Gratuit',
      duration: 'Pour toujours',
      price_xof: 0,
      price_eur: 0,
      promo: null,
      popular: false,
      coins_bonus: 0,
      features: [
        { text: 'Swipe illimité', included: true },
        { text: '1 Super Like / jour', included: true },
        { text: 'Messagerie de base', included: true },
        { text: 'Profil vérifié', included: true },
        { text: 'Filtres standards', included: true },
        { text: 'Appels vidéo', included: false },
        { text: 'Traduction auto', included: false },
        { text: 'Mode Incognito', included: false },
        { text: 'Super Likes illimités', included: false },
      ]
    },
    {
      id: 'weekly',
      name: 'Premium 1 semaine',
      duration: '7 jours',
      price_xof: 3500,
      price_eur: 5.90,
      promo: null,
      popular: false,
      coins_bonus: 100,
      features: [
        { text: 'Super Likes illimités', included: true },
        { text: 'Appels vidéo HD', included: true },
        { text: 'Traduction automatique', included: true },
        { text: 'Mode Incognito', included: true },
        { text: 'Voir qui vous a liké', included: true },
        { text: 'Undo (annuler un swipe)', included: true },
        { text: '100 Coins offerts', included: true },
      ]
    },
    {
      id: 'monthly',
      name: 'Premium 1 mois',
      duration: '30 jours',
      price_xof: 9900,
      price_eur: 14.90,
      promo: {
        active: true,
        label: '🔥 LANCEMENT',
        discount_pct: 30,
        expires: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 jours
        price_xof: 6930,
        price_eur: 10.43,
      },
      popular: true,
      coins_bonus: 300,
      features: [
        { text: 'Super Likes illimités', included: true },
        { text: 'Appels vidéo HD', included: true },
        { text: 'Traduction automatique', included: true },
        { text: 'Mode Incognito', included: true },
        { text: 'Voir qui vous a liké', included: true },
        { text: 'Undo illimité', included: true },
        { text: '300 Coins offerts', included: true },
        { text: 'Boost profil 1x/mois', included: true },
      ]
    },
    {
      id: 'yearly',
      name: 'Premium 1 an',
      duration: '365 jours',
      price_xof: 79900,
      price_eur: 99.90,
      promo: {
        active: true,
        label: '⭐ MEILLEUR DEAL',
        discount_pct: 33,
        expires: null, // Permanent
        price_xof: 53433,
        price_eur: 66.93,
      },
      popular: false,
      coins_bonus: 5000,
      features: [
        { text: 'Tout Premium inclus', included: true },
        { text: '5 000 Coins offerts', included: true },
        { text: 'Support prioritaire', included: true },
        { text: 'Badge VIP sur profil', included: true },
        { text: 'Boosts mensuels offerts', included: true },
        { text: 'Accès fonctions bêta', included: true },
      ]
    },
  ];

  // ── Compte à rebours ───────────────────────────────────
  let countdownInterval = null;

  function startCountdown(expiresDate) {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const diff = expiresDate - Date.now();
      if (diff <= 0) { clearInterval(countdownInterval); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const el = document.getElementById('promo-countdown');
      if (el) el.textContent = `${d}j ${h}h ${m}m ${s}s`;
    }, 1000);
  }

  // ── Devise sélectionnée ────────────────────────────────
  let currency = 'xof';

  function formatPrice(plan) {
    if (currency === 'xof') return plan.price_xof === 0 ? 'Gratuit' : `${plan.price_xof.toLocaleString('fr-FR')} CFA`;
    return plan.price_eur === 0 ? 'Gratuit' : `${plan.price_eur.toFixed(2)} €`;
  }

  function formatPromoPrice(promo) {
    if (currency === 'xof') return `${promo.price_xof.toLocaleString('fr-FR')} CFA`;
    return `${promo.price_eur.toFixed(2)} €`;
  }

  function renderPlanCard(plan) {
    const hasPromo = plan.promo?.active;
    const isPopular = plan.popular;
    const isFree = plan.id === 'free';

    return `
      <div style="
        background: ${isPopular ? 'linear-gradient(160deg, rgba(232,49,122,0.15), var(--charcoal))' : 'var(--charcoal)'};
        border: 1.5px solid ${isPopular ? 'rgba(232,49,122,0.4)' : hasPromo ? 'rgba(245,158,11,0.3)' : 'var(--border)'};
        border-radius: var(--radius-lg);
        padding: 24px 20px;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s;
        ${isPopular ? 'transform: scale(1.02);' : ''}
      ">
        <!-- Badge populaire / promo -->
        ${isPopular ? `<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);background:var(--pink);color:white;font-size:11px;font-weight:700;padding:4px 16px;border-radius:0 0 10px 10px;white-space:nowrap;letter-spacing:0.5px;">⭐ PLUS POPULAIRE</div>` : ''}
        ${hasPromo && !isPopular ? `<div style="position:absolute;top:12px;right:12px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);color:var(--gold);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">${plan.promo.label}</div>` : ''}
        ${hasPromo && isPopular ? `<div style="position:absolute;top:12px;right:12px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);color:var(--gold);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">${plan.promo.label}</div>` : ''}

        <!-- Nom du plan -->
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:12px;margin-top:${isPopular?'16px':'0'};">${plan.name}</div>

        <!-- Prix -->
        <div style="margin-bottom:4px;">
          ${hasPromo ? `
            <!-- Prix barré -->
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-family:'Playfair Display',serif;font-size:38px;font-weight:700;color:var(--pink);">${formatPromoPrice(plan.promo)}</span>
              <div>
                <div style="font-size:14px;text-decoration:line-through;color:var(--muted);">${formatPrice(plan)}</div>
                <div style="font-size:12px;color:var(--gold);font-weight:700;">-${plan.promo.discount_pct}%</div>
              </div>
            </div>
          ` : `
            <span style="font-family:'Playfair Display',serif;font-size:38px;font-weight:700;color:${isFree ? 'var(--green)' : 'var(--pink)'};">${formatPrice(plan)}</span>
          `}
        </div>

        <!-- Durée -->
        <div style="font-size:13px;color:var(--muted);margin-bottom:16px;">${plan.duration}${plan.coins_bonus > 0 ? ` · <span style="color:var(--gold);">+${plan.coins_bonus} coins</span>` : ''}</div>

        <!-- Compte à rebours promo -->
        ${hasPromo && plan.promo.expires ? `
          <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:8px 12px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">⏰</span>
            <div>
              <div style="font-size:11px;color:var(--gold);font-weight:600;">OFFRE LIMITÉE — Expire dans</div>
              <div style="font-size:14px;font-weight:700;color:white;" id="promo-countdown">--j --h --m --s</div>
            </div>
          </div>
        ` : ''}

        <!-- Features -->
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
          ${plan.features.map(f => `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:${f.included ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)'};">
              <span style="color:${f.included ? 'var(--pink)' : 'rgba(255,255,255,0.2)'};font-weight:700;flex-shrink:0;">${f.included ? '✓' : '✕'}</span>
              ${f.text}
            </div>`).join('')}
        </div>

        <!-- Bouton -->
        ${isFree ? `
          <button onclick="Modal.close()" style="width:100%;padding:13px;border-radius:50px;font-size:14px;font-weight:600;background:transparent;border:1.5px solid var(--border);color:var(--muted);cursor:pointer;font-family:'Outfit',sans-serif;">
            Plan actuel
          </button>
        ` : `
          <button onclick="PricingPage.selectPlan('${plan.id}')" style="width:100%;padding:13px;border-radius:50px;font-size:14px;font-weight:600;background:${isPopular ? 'linear-gradient(135deg,var(--pink),#C41F65)' : 'rgba(232,49,122,0.15)'};border:1.5px solid ${isPopular ? 'var(--pink)' : 'rgba(232,49,122,0.3)'};color:${isPopular ? 'white' : 'var(--pink-light)'};cursor:pointer;font-family:'Outfit',sans-serif;box-shadow:${isPopular ? '0 8px 24px rgba(232,49,122,0.35)' : 'none'};">
            ${isFree ? 'Plan actuel' : hasPromo ? `🔥 Profiter de l'offre` : 'Choisir ce plan'}
          </button>
        `}
      </div>
    `;
  }

  function render(targetEl) {
    const container = targetEl || document.getElementById('page-pricing') || document.getElementById('modal-content');
    if (!container) return;

    // Démarrer les comptes à rebours
    PLANS.forEach(p => {
      if (p.promo?.active && p.promo?.expires) {
        setTimeout(() => startCountdown(p.promo.expires), 100);
      }
    });

    container.innerHTML = `
      <div style="padding:20px;">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:36px;margin-bottom:8px;">⭐</div>
          <h2 style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:8px;">Passez Premium</h2>
          <p style="font-size:14px;color:var(--muted);">L'amour mérite le meilleur. Sans engagement.</p>
        </div>

        <!-- Sélecteur devise -->
        <div style="display:flex;background:var(--surface);border-radius:50px;padding:4px;margin-bottom:20px;max-width:240px;margin-left:auto;margin-right:auto;">
          <button id="btn-xof" onclick="PricingPage.setCurrency('xof')" style="flex:1;padding:8px;border-radius:50px;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;background:var(--pink);color:white;transition:all 0.2s;">
            🇧🇯 CFA
          </button>
          <button id="btn-eur" onclick="PricingPage.setCurrency('eur')" style="flex:1;padding:8px;border-radius:50px;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;background:transparent;color:var(--muted);transition:all 0.2s;">
            🇪🇺 EUR
          </button>
        </div>

        <!-- Plans -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${PLANS.map(plan => renderPlanCard(plan)).join('')}
        </div>

        <!-- Moyens de paiement -->
        <div style="margin-top:20px;padding:16px;background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:10px;">Moyens de paiement acceptés</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
            ${['📱 MTN Mobile Money','🟠 Orange Money','🔵 Wave','💳 Visa/Mastercard','💰 PayPal'].map(p => `
              <span style="background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:12px;color:var(--muted);">${p}</span>
            `).join('')}
          </div>
        </div>

        <!-- Garantie -->
        <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--muted);">
          🔒 Paiement sécurisé · Annulation à tout moment · Remboursement 7 jours
        </div>
      </div>
    `;
  }

  return {
    render,

    setCurrency(curr) {
      currency = curr;
      render();
      setTimeout(() => {
        const xofBtn = document.getElementById('btn-xof');
        const eurBtn = document.getElementById('btn-eur');
        if (xofBtn) {
          xofBtn.style.background = curr === 'xof' ? 'var(--pink)' : 'transparent';
          xofBtn.style.color = curr === 'xof' ? 'white' : 'var(--muted)';
        }
        if (eurBtn) {
          eurBtn.style.background = curr === 'eur' ? 'var(--pink)' : 'transparent';
          eurBtn.style.color = curr === 'eur' ? 'white' : 'var(--muted)';
        }
      }, 10);
    },
    selectPlan(planId) {
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) return;
      const price = plan.promo?.active ? (currency === 'xof' ? plan.promo.price_xof : plan.promo.price_eur) : (currency === 'xof' ? plan.price_xof : plan.price_eur);
      const curr  = currency === 'xof' ? 'CFA' : '€';
      Modal.show(`
        <div style="padding:8px;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">💳</div>
          <h3 style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin-bottom:6px;">${plan.name}</h3>
          <p style="font-size:22px;font-weight:700;color:var(--pink);margin-bottom:16px;">${currency === 'xof' ? price.toLocaleString('fr-FR') : price.toFixed(2)} ${curr}</p>
          <div style="margin-bottom:16px;text-align:left;">
            <label style="font-size:13px;color:var(--muted);display:block;margin-bottom:6px;">📱 Votre numéro Mobile Money</label>
            <input id="pay-phone" type="tel" placeholder="Ex: +22961234567" class="input-field" style="width:100%;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:white;font-size:14px;font-family:'Outfit',sans-serif;">
            <p style="font-size:11px;color:var(--muted);margin-top:6px;">MTN · Moov · Wave · Orange Money</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button onclick="PricingPage.payWithFedaPay('${planId}')" style="width:100%;padding:13px;border-radius:50px;background:linear-gradient(135deg,#FFD700,#FFA500);border:none;color:#1A0A14;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;font-size:14px;">
              📱 Payer avec Mobile Money
            </button>
            <button onclick="Modal.close();Toast.info('Carte bancaire — Bientôt disponible')" style="width:100%;padding:13px;border-radius:50px;background:rgba(232,49,122,0.15);border:1.5px solid rgba(232,49,122,0.4);color:var(--pink);font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;font-size:14px;">
              💳 Carte Visa/Mastercard (Bientôt)
            </button>
          </div>
          <p style="font-size:11px;color:var(--muted);margin-top:14px;">🔒 Paiement sécurisé · Annulation à tout moment</p>
        </div>
      `, '');
    },

    async payWithFedaPay(planId) {
      const phone = document.getElementById('pay-phone')?.value?.trim();
      if (!phone) { Toast.error('Entrez votre numéro de téléphone'); return; }
      Modal.close();
      Toast.info('Redirection vers le paiement...');
      try {
        const res = await API.post('/payment/create', { planId, phone });
        if (res?.data?.url) {
          window.location.href = res.data.url;
        } else {
          Toast.error('Erreur lors de la création du paiement');
        }
      } catch(err) {
        Toast.error(err.message || 'Erreur paiement');
      }
    },
  };
})();




