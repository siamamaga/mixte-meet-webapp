// js/pages/chat.js
const ChatPage = (() => {
  let currentMatch = null;
  let currentConvId = null;
  let messages = [];
  let pollingInterval = null;
  let openId = 0; // identifiant unique par ouverture pour eviter les race conditions

  const DEMO_MSGS = {
    1: [
      { id:1, sent:false, content:'Bonjour ! Je suis ravie de notre match !', time:'10:00' },
      { id:2, sent:true,  content:'Bonjour ! Moi aussi !', time:'10:01' },
      { id:3, sent:false, content:"Oui ! Et toi tu viens d'ou ?", time:'10:02' },
    ],
  };

  const DEMO_REPLIES = ["Super !", 'Vraiment ?', "J'adore ca !", 'Raconte-moi plus', 'Haha oui !'];

  function isDemo() {
    if (!currentMatch || !currentMatch.uuid) return true;
    const uid = String(currentMatch.uuid);
    return uid === 'm1' || uid === 'm2' || uid === 'm3' || uid === 'm4' || uid.startsWith('demo-');
  }

  function open(match) {
    // Generer un ID unique pour cette ouverture
    const myOpenId = ++openId;

    // Reset TOTAL et immediat
    stopPolling();
    currentMatch = null;
    currentConvId = null;
    messages = [];

    // Vider l'affichage immediatement
    const existingList = document.getElementById('messages-list');
    if (existingList) existingList.innerHTML = '';

    // Assigner le nouveau match
    currentMatch = match;
    currentConvId = match.conversation_id || null;

    App.navigate('chat');
    render();

    // Charger les messages avec le bon openId
    loadMessages(myOpenId);
  }

  async function loadMessages(myOpenId) {
    // Si un autre open() a ete appele entretemps, abandonner
    if (myOpenId !== openId) return;

    if (isDemo()) {
      messages = [...(DEMO_MSGS[currentMatch.conversation_id] || [])];
      if (myOpenId !== openId) return;
      renderMessages();
      return;
    }

    try {
      // Creer conversation si necessaire
      if (!currentConvId) {
        const conv = await API.post('/conversations/find-or-create', { user_uuid: currentMatch.uuid });
        if (myOpenId !== openId) return; // abandonner si autre match ouvert
        currentConvId = conv?.data?.conversation_id;
        currentMatch.conversation_id = currentConvId;
      }

      if (!currentConvId) { renderMessages(); return; }

      const data = await API.get('/conversations/' + currentConvId + '/messages');
      if (myOpenId !== openId) return; // abandonner si autre match ouvert

      const myUuid = AuthService.getUser()?.uuid;
      messages = (data?.data || []).map(msg => ({
        id: msg.id,
        sent: msg.sender_uuid === myUuid || msg.sender_id === AuthService.getUser()?.id,
        content: msg.content,
        time: new Date(msg.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      }));
      renderMessages();
      if (currentConvId) API.put('/conversations/' + currentConvId + '/read', {}).catch(function(){});
      startPolling(myOpenId);
    } catch(e) {
      if (myOpenId !== openId) return;
      console.log('Messages error:', e);
      messages = [];
      renderMessages();
    }
  }

  function startPolling(myOpenId) {
    stopPolling();
    pollingInterval = setInterval(async () => {
      if (myOpenId !== openId || !currentConvId || isDemo()) return;
      try {
        const data = await API.get('/conversations/' + currentConvId + '/messages');
        if (myOpenId !== openId) return;
        const myUuid = AuthService.getUser()?.uuid;
        const newMsgs = (data?.data || []).map(msg => ({
          id: msg.id,
          sent: msg.sender_uuid === myUuid || msg.sender_id === AuthService.getUser()?.id,
          content: msg.content,
          time: new Date(msg.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
        }));
        if (newMsgs.length > messages.length) {
          messages = newMsgs;
          renderMessages();
        }
      } catch(e) {}
    }, 5000);
  }

  function stopPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
  }

  function render() {
    if (!currentMatch) return;
    const avatar = currentMatch.emoji || '👤';
    const name = currentMatch.first_name || '';
    const online = currentMatch.online || false;

    document.getElementById('page-chat').innerHTML =
      '<div style="height:100%;display:flex;flex-direction:column;">' +
        '<div class="page-header">' +
          '<button class="header-btn" onclick="ChatPage.close()">&#8592;</button>' +
          '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:22px;margin-right:4px;overflow:hidden;">' +
            (currentMatch.main_photo
              ? '<img src="' + currentMatch.main_photo + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">'
              : avatar) +
          '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:15px;font-weight:600;">' + name + '</div>' +
            '<div style="font-size:11px;color:' + (online ? 'var(--green)' : 'var(--muted)') + ';">' + (online ? '&#9679; En ligne' : 'Hors ligne') + '</div>' +
          '</div>' +
          '<button class="header-btn" onclick="ChatPage.showOptions()">&#8943;</button>' +
        '</div>' +
        '<div class="chat-messages" id="chat-messages">' +
          '<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px;">Vous vous etes matches ! Dites bonjour.</div>' +
          '<div id="messages-list"></div>' +
          '<div id="typing-zone"></div>' +
        '</div>' +
        '<div class="chat-input-bar">' +
          '<button class="header-btn" onclick="Toast.info(\'Cadeaux - Premium\')">&#127873;</button>' +
          '<textarea class="chat-input-field" id="msg-input" placeholder="Votre message..." rows="1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();ChatPage.send();}"></textarea>' +
          '<button class="chat-send-btn" onclick="ChatPage.send()">&#10148;</button>' +
        '</div>' +
      '</div>';
  }

  function renderMessages() {
    const list = document.getElementById('messages-list');
    if (!list) return;
    list.innerHTML = messages.map(m => renderMsg(m)).join('');
    const c = document.getElementById('chat-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  function renderMsg(msg) {
    const avatar = currentMatch ? (currentMatch.emoji || '👤') : '👤';
    // Indicateur de statut message style WhatsApp
    let statusIcon = '';
    if (msg.sent) {
      if (msg.is_read) {
        statusIcon = '<span style="color:#53bdeb;font-size:12px;margin-left:3px;">✓✓</span>';
      } else if (msg.delivered || !isDemo()) {
        statusIcon = '<span style="color:rgba(255,255,255,0.5);font-size:12px;margin-left:3px;">✓✓</span>';
      } else {
        statusIcon = '<span style="color:rgba(255,255,255,0.5);font-size:12px;margin-left:3px;">✓</span>';
      }
    }
    return '<div class="chat-message ' + (msg.sent ? 'sent' : 'recv') + '">' +
      (!msg.sent ? '<div class="msg-avatar">' + avatar + '</div>' : '') +
      '<div>' +
        '<div class="msg-bubble">' + (msg.content || '') + '</div>' +
        '<div class="msg-time">' + msg.time + statusIcon + '</div>' +
      '</div>' +
    '</div>';
  }

  function appendMsg(msg) {
    messages.push(msg);
    const list = document.getElementById('messages-list');
    if (list) {
      const el = document.createElement('div');
      el.innerHTML = renderMsg(msg);
      list.appendChild(el.firstChild);
    }
    const c = document.getElementById('chat-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  return {
    open,
    render,

    close() {
      stopPolling();
      currentMatch = null;
      currentConvId = null;
      messages = [];
      App.navigate('matches');
    },

    async send() {
      const input = document.getElementById('msg-input');
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();

      // Limite 3 messages pour non-premium
      const sentCount = messages.filter(function(m) { return m.sent; }).length;
      const isPremium = AuthService.getUser()?.is_premium || false;
      if (!isPremium && sentCount >= 3) {
        Modal.show(
          '<div style="text-align:center;padding:16px;">' +
            '<div style="font-size:48px;margin-bottom:12px;">&#128274;</div>' +
            '<h2 style="font-size:20px;margin-bottom:8px;">Limite atteinte</h2>' +
            '<p style="color:var(--muted);font-size:14px;margin-bottom:20px;">Passez en <strong style="color:var(--gold);">Premium</strong> pour des messages illimites.</p>' +
            '<button onclick="Modal.close();App.navigate(\'pricing\')" style="background:linear-gradient(135deg,var(--gold),#A07830);border:none;color:white;padding:12px 28px;border-radius:50px;font-weight:700;cursor:pointer;width:100%;margin-bottom:8px;">&#11088; Passer Premium</button>' +
            '<button onclick="Modal.close()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:white;padding:10px 24px;border-radius:50px;cursor:pointer;width:100%;">Plus tard</button>' +
          '</div>', '');
        return;
      }

      input.value = '';
      const now = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
      const optimistic = { id: Date.now(), sent: true, content: text, time: now };
      appendMsg(optimistic);

      if (isDemo()) {
        const tz = document.getElementById('typing-zone');
        if (tz) tz.innerHTML = '<div style="padding:8px 16px;color:var(--muted);font-size:12px;">&#9679; ' + (currentMatch?.first_name || '') + ' ecrit...</div>';
        setTimeout(function() {
          if (tz) tz.innerHTML = '';
          appendMsg({
            id: Date.now()+1,
            sent: false,
            content: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)],
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
          });
        }, 1200 + Math.random() * 800);
      } else {
        try {
          if (!currentConvId) {
            const conv = await API.post('/conversations/find-or-create', { user_uuid: currentMatch.uuid });
            currentConvId = conv?.data?.conversation_id;
            currentMatch.conversation_id = currentConvId;
          }
          if (!currentConvId) throw new Error('Conversation introuvable');
          await API.post('/conversations/' + currentConvId + '/messages', { content: text });
        } catch(e) {
          console.log('Send error:', e);
          Toast.error('Erreur envoi: ' + (e.message || e.status || 'connexion'));
        }
      }
    },

    showOptions() {
      if (!currentMatch) return;
      const name = currentMatch.first_name || 'cet utilisateur';
      Modal.show(
        '<div style="display:flex;flex-direction:column;gap:4px;">' +
          '<div class="settings-row" onclick="Modal.close();ChatPage.viewProfile()">' +
            '<span class="settings-icon">&#128100;</span>' +
            '<div class="settings-text"><span>Voir le profil</span><small>Photos, bio, infos</small></div>' +
            '<span class="settings-arrow">&#8250;</span>' +
          '</div>' +
          '<div class="settings-row" onclick="Modal.close();ChatPage.blockUser()">' +
            '<span class="settings-icon">&#128683;</span>' +
            '<div class="settings-text"><span style="color:var(--gold);">Bloquer</span></div>' +
            '<span class="settings-arrow">&#8250;</span>' +
          '</div>' +
          '<div class="settings-row" onclick="Modal.close();ChatPage.reportUser()">' +
            '<span class="settings-icon">&#9888;&#65039;</span>' +
            '<div class="settings-text"><span style="color:var(--red);">Signaler</span></div>' +
            '<span class="settings-arrow">&#8250;</span>' +
          '</div>' +
        '</div>', 'Options');
    },

    viewProfile() {
      if (!currentMatch) return;
      const flag = Utils.countryFlag(currentMatch.country_code);
      Modal.show(
        '<div style="text-align:center;padding:8px;">' +
          '<div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:48px;margin:0 auto 16px;overflow:hidden;">' +
            (currentMatch.main_photo ? '<img src="' + currentMatch.main_photo + '" style="width:100%;height:100%;object-fit:cover;">' : (currentMatch.emoji || '&#128100;')) +
          '</div>' +
          '<h2 style="font-family:Playfair Display,serif;font-size:22px;font-weight:700;margin-bottom:4px;">' + (currentMatch.first_name || '') + ', ' + (currentMatch.age || '?') + '</h2>' +
          '<p style="font-size:14px;color:var(--muted);margin-bottom:8px;">' + flag + ' ' + (currentMatch.city || currentMatch.country_name || '') + (currentMatch.profession ? ' · ' + currentMatch.profession : '') + '</p>' +
          (currentMatch.bio ? '<p style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;margin-bottom:16px;">' + currentMatch.bio + '</p>' : '') +
          '<button onclick="Modal.close()" style="background:var(--pink);border:none;color:white;padding:12px 32px;border-radius:50px;font-weight:700;cursor:pointer;">Fermer</button>' +
        '</div>', currentMatch.first_name || 'Profil');
    },

    blockUser() {
      if (!currentMatch) return;
      const name = currentMatch.first_name || 'cet utilisateur';
      Modal.show(
        '<div style="text-align:center;padding:8px;">' +
          '<div style="font-size:48px;margin-bottom:12px;">&#128683;</div>' +
          '<h3 style="font-size:18px;font-weight:700;margin-bottom:8px;">Bloquer ' + name + ' ?</h3>' +
          '<p style="color:var(--muted);font-size:13px;margin-bottom:20px;">Vous ne verrez plus ce profil.</p>' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;">Annuler</button>' +
            '<button onclick="ChatPage._doBlock()" style="flex:1;background:var(--gold);border:none;color:black;padding:12px;border-radius:50px;cursor:pointer;font-weight:700;">Bloquer</button>' +
          '</div>' +
        '</div>', '');
    },

    async _doBlock() {
      Modal.close();
      if (!currentMatch?.uuid || isDemo()) { Toast.info('Action non disponible en mode demo'); return; }
      try {
        await API.post('/block', { blocked_uuid: currentMatch.uuid });
        Toast.success(currentMatch.first_name + ' a ete bloque');
        setTimeout(() => ChatPage.close(), 1500);
      } catch(e) { Toast.error(e.message || 'Erreur'); }
    },

    reportUser() {
      if (!currentMatch) return;
      const name = currentMatch.first_name || 'cet utilisateur';
      Modal.show(
        '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<p style="font-size:14px;color:var(--muted);">Pourquoi signalez-vous ' + name + ' ?</p>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
            ['Faux profil','Photos inappropriees','Harcelement','Spam / Arnaque','Contenu haineux','Autre'].map(function(r) {
              return '<div class="settings-row" onclick="ChatPage._selectReason(this,\'' + r + '\')" style="cursor:pointer;">' +
                '<div class="settings-text"><span style="font-size:14px;">' + r + '</span></div>' +
                '<span class="check-reason" style="color:var(--pink);font-size:18px;opacity:0;">&#10003;</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<textarea id="report-desc" class="input-field" placeholder="Details supplementaires..." rows="3" style="resize:none;"></textarea>' +
          '<button onclick="ChatPage._doReport()" style="background:var(--red);border:none;color:white;padding:14px;border-radius:50px;font-weight:700;cursor:pointer;">Envoyer le signalement</button>' +
        '</div>', '&#9888;&#65039; Signaler');
    },

    _selectedReason: null,
    _selectReason(el, reason) {
      ChatPage._selectedReason = reason;
      document.querySelectorAll('.check-reason').forEach(s => s.style.opacity = '0');
      const checks = el.querySelectorAll('.check-reason');
      checks.forEach(c => c.style.opacity = '1');
    },

    async _doReport() {
      if (!ChatPage._selectedReason) { Toast.error('Selectionnez une raison'); return; }
      if (!currentMatch?.uuid || isDemo()) { Toast.info('Action non disponible en mode demo'); return; }
      const description = document.getElementById('report-desc')?.value.trim();
      try {
        await API.post('/report', { reported_uuid: currentMatch.uuid, reason: ChatPage._selectedReason, description });
        ChatPage._selectedReason = null;
        Modal.close();
        Toast.success('Signalement envoye. Merci !');
      } catch(e) { Toast.error(e.message || 'Erreur'); }
    },
  };
})();


