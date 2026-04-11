// js/pages/chat.js
const ChatPage = (() => {
  let currentMatch = null;
  let messages = [];
  let pollingInterval = null;

  const DEMO_MSGS = {
    1: [
      { id:1, sent:false, content:'Bonjour ! Je suis ravie de notre match !', time:'10:00' },
      { id:2, sent:true,  content:'Bonjour ! Moi aussi, tu habites a Abidjan ?', time:'10:01' },
      { id:3, sent:false, content:"Oui ! Et toi tu viens d'ou ?", time:'10:02' },
      { id:4, sent:true,  content:"Je suis a Paris. J'ai toujours reve de visiter la Cote d'Ivoire", time:'10:03' },
      { id:5, sent:false, content:'Il faut venir ! Je pourrais te faire visiter !', time:'10:05' },
    ],
  };

  const DEMO_REPLIES = ["Super !", 'Vraiment ?', "J'adore ca !", 'Raconte-moi plus', 'Haha oui !', 'C est cool !'];

  function isDemo() {
    if (!currentMatch) return true;
    if (!currentMatch.uuid) return true;
    const uid = String(currentMatch.uuid);
    // Profil demo = uuid court comme m1/m2 OU type demo OU pas de vrai UUID
    if (uid === 'm1' || uid === 'm2' || uid === 'm3' || uid === 'm4') return true;
    if (currentMatch.profile_type === 'demo') return true;
    if (uid.length < 10) return true; // UUID réel = long (ex: abc123-def456...)
    return false;
  }

  function open(match) {
    currentMatch = match;
    messages = [];
    stopPolling();
    App.navigate('chat');
    render();
    loadMessages();
  }

  async function loadMessages() {
    if (isDemo()) {
      messages = DEMO_MSGS[currentMatch.conversation_id] || [];
      renderMessages();
      return;
    }
    try {
      const convId = currentMatch.conversation_id || currentMatch.id;
      const data = await API.get('/conversations/' + convId + '/messages');
      const myUuid = AuthService.getUser()?.uuid;
      messages = (data?.data || []).map(msg => ({
        id: msg.id,
        sent: msg.sender_uuid === myUuid,
        content: msg.content,
        time: new Date(msg.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      }));
      renderMessages();
      startPolling();
    } catch(e) {
      console.log('Messages API error:', e);
      messages = DEMO_MSGS[currentMatch.conversation_id] || [];
      renderMessages();
    }
  }

  function startPolling() {
    stopPolling();
    pollingInterval = setInterval(async () => {
      if (!currentMatch || isDemo()) return;
      try {
        const convId = currentMatch.conversation_id || currentMatch.id;
        const data = await API.get('/conversations/' + convId + '/messages');
        const myUuid = AuthService.getUser()?.uuid;
        const newMsgs = (data?.data || []).map(msg => ({
          id: msg.id,
          sent: msg.sender_uuid === myUuid,
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
    document.getElementById('page-chat').innerHTML =
      '<div style="height:100%;display:flex;flex-direction:column;">' +
        '<div class="page-header">' +
          '<button class="header-btn" onclick="ChatPage.close()">&#8592;</button>' +
          '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:22px;margin-right:4px;">' + avatar + '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:15px;font-weight:600;">' + currentMatch.first_name + '</div>' +
            '<div style="font-size:11px;color:' + (currentMatch.online ? 'var(--green)' : 'var(--muted)') + ';">' + (currentMatch.online ? '&#9679; En ligne' : 'Hors ligne') + '</div>' +
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
    return '<div class="chat-message ' + (msg.sent ? 'sent' : 'recv') + '">' +
      (!msg.sent ? '<div class="msg-avatar">' + avatar + '</div>' : '') +
      '<div>' +
        '<div class="msg-bubble">' + (msg.content || '') + '</div>' +
        '<div class="msg-time">' + msg.time + '</div>' +
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
            '<p style="color:var(--muted);font-size:14px;margin-bottom:20px;">Passez en <strong style="color:var(--gold);">Premium</strong> pour envoyer des messages illimites.</p>' +
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
        if (tz) tz.innerHTML = '<div style="padding:8px 16px;color:var(--muted);font-size:12px;">&#9679; ' + currentMatch.first_name + ' ecrit...</div>';
        setTimeout(function() {
          if (tz) tz.innerHTML = '';
          const reply = {
            id: Date.now()+1,
            sent: false,
            content: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)],
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
          };
          appendMsg(reply);
        }, 1200 + Math.random() * 800);
      } else {
        try {
          // Creer conversation si inexistante
          if (!currentMatch.conversation_id) {
            const conv = await API.post('/conversations/find-or-create', { user_uuid: currentMatch.uuid });
            currentMatch.conversation_id = conv?.data?.conversation_id;
          }
          if (!currentMatch.conversation_id) throw new Error('Conversation introuvable');
          await API.post('/conversations/' + currentMatch.conversation_id + '/messages', { content: text });
        } catch(e) {
          console.log('Send error complet:', JSON.stringify(e));
          Toast.error('Erreur: ' + (e.message || e.status || JSON.stringify(e)));
        }
      }
    },

    showOptions() {
      const uuid = currentMatch?.uuid || '';
      const name = currentMatch?.first_name || 'cet utilisateur';
      const isBlocked = currentMatch?.is_blocked || false;
      Modal.show(
        '<div style="display:flex;flex-direction:column;gap:4px;">' +
          '<div class="settings-row" onclick="Modal.close();ChatPage.viewProfile()">' +
            '<span class="settings-icon">&#128100;</span>' +
            '<div class="settings-text"><span>Voir le profil</span><small>Photos, bio, infos</small></div>' +
            '<span class="settings-arrow">&#8250;</span>' +
          '</div>' +
          '<div class="settings-row" onclick="Modal.close();ChatPage.blockUser()">' +
            '<span class="settings-icon">&#128683;</span>' +
            '<div class="settings-text"><span style="color:var(--gold);">Bloquer</span><small>Plus de contact avec cet utilisateur</small></div>' +
            '<span class="settings-arrow">&#8250;</span>' +
          '</div>' +
          '<div class="settings-row" onclick="Modal.close();ChatPage.reportUser()">' +
            '<span class="settings-icon">&#9888;&#65039;</span>' +
            '<div class="settings-text"><span style="color:var(--red);">Signaler</span><small>Comportement inapproprié</small></div>' +
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
            (currentMatch.main_photo
              ? '<img src="' + currentMatch.main_photo + '" style="width:100%;height:100%;object-fit:cover;">'
              : (currentMatch.emoji || '&#128100;')) +
          '</div>' +
          '<h2 style="font-family:Playfair Display,serif;font-size:22px;font-weight:700;margin-bottom:4px;">' + (currentMatch.first_name || '') + ', ' + (currentMatch.age || '?') + '</h2>' +
          '<p style="font-size:14px;color:var(--muted);margin-bottom:8px;">' + flag + ' ' + (currentMatch.city || currentMatch.country_name || '') + (currentMatch.profession ? ' · ' + currentMatch.profession : '') + '</p>' +
          (currentMatch.bio ? '<p style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;margin-bottom:16px;padding:0 8px;">' + currentMatch.bio + '</p>' : '') +
          '<button onclick="Modal.close()" style="background:var(--pink);border:none;color:white;padding:12px 32px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">Fermer</button>' +
        '</div>', currentMatch.first_name || 'Profil');
    },

    blockUser() {
      if (!currentMatch) return;
      const name = currentMatch.first_name || 'cet utilisateur';
      Modal.show(
        '<div style="text-align:center;padding:8px;">' +
          '<div style="font-size:48px;margin-bottom:12px;">&#128683;</div>' +
          '<h3 style="font-size:18px;font-weight:700;margin-bottom:8px;">Bloquer ' + name + ' ?</h3>' +
          '<p style="color:var(--muted);font-size:13px;margin-bottom:20px;">Vous ne verrez plus ce profil et il ne pourra plus vous contacter.</p>' +
          '<div style="display:flex;gap:10px;">' +
            '<button onclick="Modal.close()" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:white;padding:12px;border-radius:50px;cursor:pointer;font-family:Outfit,sans-serif;">Annuler</button>' +
            '<button onclick="ChatPage._doBlock()" style="flex:1;background:var(--gold);border:none;color:black;padding:12px;border-radius:50px;cursor:pointer;font-weight:700;font-family:Outfit,sans-serif;">Bloquer</button>' +
          '</div>' +
        '</div>', '');
    },

    async _doBlock() {
      Modal.close();
      if (!currentMatch?.uuid || isDemo()) { Toast.info('Action non disponible en mode démo'); return; }
      try {
        await API.post('/block', { blocked_uuid: currentMatch.uuid });
        currentMatch.is_blocked = true;
        Toast.success(currentMatch.first_name + ' a été bloqué ✅');
        setTimeout(() => ChatPage.close(), 1500);
      } catch(e) {
        Toast.error(e.message || 'Erreur lors du blocage');
      }
    },

    reportUser() {
      if (!currentMatch) return;
      const name = currentMatch.first_name || 'cet utilisateur';
      Modal.show(
        '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<p style="font-size:14px;color:var(--muted);">Pourquoi signalez-vous ' + name + ' ?</p>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
            ['Faux profil / Usurpation','Photos inappropriées','Harcèlement','Spam / Arnaque','Contenu haineux','Autre raison'].map(function(r) {
              return '<div class="settings-row" onclick="ChatPage._selectReason(this,\'' + r + '\')" style="cursor:pointer;">' +
                '<div class="settings-text"><span style="font-size:14px;">' + r + '</span></div>' +
                '<span id="check-' + r.replace(/ /g,'') + '" style="color:var(--pink);font-size:18px;opacity:0;">&#10003;</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<textarea id="report-desc" class="input-field" placeholder="Détails supplémentaires (optionnel)..." rows="3" style="resize:none;"></textarea>' +
          '<button onclick="ChatPage._doReport()" style="background:var(--red);border:none;color:white;padding:14px;border-radius:50px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">Envoyer le signalement</button>' +
        '</div>', '&#9888;&#65039; Signaler');
    },

    _selectedReason: null,
    _selectReason(el, reason) {
      ChatPage._selectedReason = reason;
      document.querySelectorAll('.settings-row span[id^="check-"]').forEach(s => s.style.opacity = '0');
      const checkId = 'check-' + reason.replace(/ /g,'');
      const check = document.getElementById(checkId);
      if (check) check.style.opacity = '1';
    },

    async _doReport() {
      if (!ChatPage._selectedReason) { Toast.error('Sélectionnez une raison'); return; }
      if (!currentMatch?.uuid || isDemo()) { Toast.info('Action non disponible en mode démo'); return; }
      const description = document.getElementById('report-desc')?.value.trim();
      try {
        await API.post('/report', {
          reported_uuid: currentMatch.uuid,
          reason: ChatPage._selectedReason,
          description,
        });
        ChatPage._selectedReason = null;
        Modal.close();
        Toast.success('Signalement envoyé. Merci de nous aider à garder la communauté sûre ✅');
      } catch(e) {
        Toast.error(e.message || 'Erreur lors du signalement');
      }
    },
  };
})();





