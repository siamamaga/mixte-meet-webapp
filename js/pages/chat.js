// js/pages/chat.js
const ChatPage = (() => {
  let currentMatch = null;
  let currentConvId = null;
  let messages = [];
  let pollingInterval = null;
  let openId = 0;
  let replyTo = null;

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
    const myOpenId = ++openId;
    stopPolling();
    currentMatch = null;
    currentConvId = null;
    messages = [];
    replyTo = null;

    const existingList = document.getElementById('messages-list');
    if (existingList) existingList.innerHTML = '';

    currentMatch = match;
    currentConvId = match.conversation_id || null;

    App.navigate('chat');
    render();
    loadMessages(myOpenId);
    ChatPage.stopIncomingCallPolling();
    ChatPage.startIncomingCallPolling();
  }

  async function loadMessages(myOpenId) {
    if (myOpenId !== openId) return;

    if (isDemo()) {
      messages = [...(DEMO_MSGS[currentMatch.conversation_id] || [])];
      if (myOpenId !== openId) return;
      renderMessages();
      return;
    }

    try {
      if (!currentConvId) {
        const conv = await API.post('/conversations/find-or-create', { user_uuid: currentMatch.uuid });
        if (myOpenId !== openId) return;
        currentConvId = conv?.data?.conversation_id;
        currentMatch.conversation_id = currentConvId;
      }

      if (!currentConvId) { renderMessages(); return; }

      const data = await API.get('/conversations/' + currentConvId + '/messages?t=' + Date.now());
      if (myOpenId !== openId) return;

      const myUuid = AuthService.getUser()?.uuid;
      messages = (data?.data || []).map(msg => ({
        id: msg.id,
        sent: msg.sender_uuid === myUuid,
        content: msg.content,
        is_read: msg.is_read,
        voice_url: msg.voice_url || null,
        duration: msg.duration || 0,
        reply_to: msg.reply_to || null,
        time: new Date(msg.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      }));

      if (currentConvId) {
        API.put('/conversations/' + currentConvId + '/read', {}).then(function() {
          messages = messages.map(function(m) {
            if (!m.sent) m.is_read = true;
            return m;
          });
          renderMessages();
        }).catch(function(){ renderMessages(); });
      } else {
        renderMessages();
      }
      startPolling(myOpenId);
    } catch(e) {
      if (myOpenId !== openId) return;
      messages = [];
      renderMessages();
    }
  }

  function startPolling(myOpenId) {
    stopPolling();
    pollingInterval = setInterval(async () => {
      if (myOpenId !== openId || !currentConvId || isDemo()) return;
      try {
        const data = await API.get('/conversations/' + currentConvId + '/messages?t=' + Date.now());
        if (myOpenId !== openId) return;
        const myUuid = AuthService.getUser()?.uuid;
        const newMsgs = (data?.data || []).map(msg => ({
          id: msg.id,
          sent: msg.sender_uuid === myUuid,
          content: msg.content,
          is_read: msg.is_read,
          voice_url: msg.voice_url || null,
          duration: msg.duration || 0,
          reply_to: msg.reply_to || null,
          time: new Date(msg.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
        }));
        const hasNewMsg = newMsgs.length > messages.length;
        const hasReadChange = newMsgs.some(function(nm, i) {
          return messages[i] && nm.is_read !== messages[i].is_read;
        });
        if (hasNewMsg || hasReadChange) {
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
          '<button class="header-btn" onclick="ChatPage.startAudioCall()" title="Appel audio">📞</button>' +
          '<button class="header-btn" onclick="ChatPage.startVideoCall()" title="Appel vidéo">📹</button>' +
          '<button class="header-btn" onclick="ChatPage.showOptions()">&#8943;</button>' +
        '</div>' +
        '<div class="chat-messages" id="chat-messages">' +
          '<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px;">Vous vous etes matches ! Dites bonjour.</div>' +
          '<div id="messages-list"></div>' +
          '<div id="typing-zone"></div>' +
        '</div>' +
        '<div id="reply-bar" style="display:none;background:var(--surface);border-top:1px solid var(--border);padding:8px 16px;align-items:center;gap:10px;">' +
          '<div style="flex:1;border-left:3px solid var(--pink);padding-left:10px;">' +
            '<div id="reply-bar-name" style="font-size:11px;color:var(--pink);font-weight:600;margin-bottom:2px;"></div>' +
            '<div id="reply-bar-text" style="font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px;"></div>' +
          '</div>' +
          '<button onclick="ChatPage.cancelReply()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:4px;">✕</button>' +
        '</div>' +
        '<div class="chat-input-bar">' +
          '<button class="header-btn" id="btn-voice-record" onclick="ChatPage.toggleVoiceRecord()" title="Message vocal">🎙️</button>' +
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
    const partnerName = currentMatch ? (currentMatch.first_name || 'Partenaire') : 'Partenaire';
    let statusIcon = '';
    if (msg.sent) {
      if (msg.is_read) {
        statusIcon = '<span style="color:#53bdeb;font-size:12px;margin-left:3px;">✓✓</span>';
      } else if (msg.id) {
        statusIcon = '<span style="color:rgba(255,255,255,0.5);font-size:12px;margin-left:3px;">✓✓</span>';
      } else {
        statusIcon = '<span style="color:rgba(255,255,255,0.5);font-size:12px;margin-left:3px;">✓</span>';
      }
    }

    // Aperçu du message cité
    var replyHtml = '';
    if (msg.reply_to) {
      var replyName = msg.reply_to.sent ? 'Vous' : partnerName;
      var replyContent = msg.reply_to.voice_url ? '🎙️ Message vocal' : (msg.reply_to.content || '');
      replyHtml = '<div style="background:rgba(255,255,255,0.1);border-left:3px solid var(--pink);border-radius:6px 6px 0 0;padding:5px 10px;font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:2px;cursor:pointer;" onclick="ChatPage.scrollToMsg(' + (msg.reply_to.id || 0) + ')">' +
        '<strong style="color:var(--pink);display:block;font-size:11px;margin-bottom:2px;">' + replyName + '</strong>' +
        replyContent +
        '</div>';
    }

    // Bouton répondre
    var replyBtn = '<button onclick="ChatPage.setReply(' + msg.id + ')" style="position:absolute;' + (msg.sent ? 'left:-36px;' : 'right:-36px;') + 'top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.6);font-size:14px;cursor:pointer;padding:4px 6px;border-radius:50%;opacity:0;transition:opacity 0.2s;" class="reply-btn">↩</button>';

    return '<div class="chat-message ' + (msg.sent ? 'sent' : 'recv') + '" id="msg-' + msg.id + '" onmouseenter="this.querySelector(\'.reply-btn\').style.opacity=\'1\'" onmouseleave="this.querySelector(\'.reply-btn\').style.opacity=\'0\'">' +
      (!msg.sent ? '<div class="msg-avatar">' + avatar + '</div>' : '') +
      '<div style="position:relative;">' +
        replyHtml +
        (msg.voice_url
        ? '<div class="msg-bubble" style="padding:8px 12px;min-width:160px;">' +
            '<audio controls style="width:100%;max-width:220px;height:36px;" src="' + msg.voice_url + '"></audio>' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:4px;">🎙️ ' + (msg.duration || 0) + 's</div>' +
          '</div>'
        : '<div class="msg-bubble">' + (msg.content || '') + '</div>') +
        '<div class="msg-time">' + msg.time + statusIcon + '</div>' +
        replyBtn +
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
      ChatPage.stopIncomingCallPolling();
      stopPolling();
      currentMatch = null;
      currentConvId = null;
      messages = [];
      replyTo = null;
      App.navigate('matches');
    },

    setReply(msgId) {
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;
      replyTo = msg;
      const bar = document.getElementById('reply-bar');
      if (bar) {
        bar.style.display = 'flex';
        const partnerName = currentMatch ? (currentMatch.first_name || 'Partenaire') : 'Partenaire';
        document.getElementById('reply-bar-name').textContent = msg.sent ? 'Vous' : partnerName;
        document.getElementById('reply-bar-text').textContent = msg.voice_url ? '🎙️ Message vocal' : (msg.content || '');
        document.getElementById('msg-input')?.focus();
      }
    },

    cancelReply() {
      replyTo = null;
      const bar = document.getElementById('reply-bar');
      if (bar) bar.style.display = 'none';
    },

    scrollToMsg(msgId) {
      const el = document.getElementById('msg-' + msgId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background 0.3s';
        el.style.background = 'rgba(232,49,122,0.2)';
        setTimeout(() => { el.style.background = ''; }, 1000);
      }
    },

    async send() {
      const input = document.getElementById('msg-input');
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();

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
      const currentReply = replyTo;
      ChatPage.cancelReply();

      const now = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
      const optimistic = { id: Date.now(), sent: true, content: text, time: now, reply_to: currentReply };
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
          const body = { content: text };
          if (currentReply) body.reply_to_id = currentReply.id;
          await API.post('/conversations/' + currentConvId + '/messages?t=' + Date.now(), body);
        } catch(e) {
          Toast.error('Erreur envoi: ' + (e.message || e.status || 'connexion'));
        }
      }
    },

    startAudioCall() {
      const user = AuthService.getUser();
      if (!user?.is_premium) { Toast.info('Appels audio — fonctionnalité Premium ⭐'); App.navigate('pricing'); return; }
      if (!currentMatch || !currentConvId) return;
      const toId = currentMatch.partner_id || currentMatch.id || currentMatch.match_id;
      if (!toId) { Toast.error('Impossible de trouver le destinataire'); return; }
      VideoCall.startAudioCall({ ...currentMatch, userId: toId }, currentConvId);
    },

    startIncomingCallPolling() {
      if (!currentConvId) return;
      ChatPage._incomingPoll = setInterval(async function() {
        if (!currentConvId) return;
        try {
          const res = await API.get('/call/' + currentConvId + '/signal');
          const sigs = res && res.data ? res.data : [];
          for (let i = 0; i < sigs.length; i++) {
            if (sigs[i].type === 'offer') {
              VideoCall._handleIncoming(sigs[i], { conversation_id: currentConvId, ...currentMatch });
            }
          }
        } catch(e) {}
      }, 3000);
    },

    stopIncomingCallPolling() {
      if (ChatPage._incomingPoll) { clearInterval(ChatPage._incomingPoll); ChatPage._incomingPoll = null; }
    },

    toggleVoiceRecord() {
      const user = AuthService.getUser();
      if (!user?.is_premium) { Toast.info('Messages vocaux — fonctionnalité Premium ⭐'); App.navigate('pricing'); return; }
      VoiceMessage.toggle(currentConvId, currentMatch);
    },

    startVideoCall() {
      const user = AuthService.getUser();
      if (!user?.is_premium) { Toast.info('Appels vidéo HD — fonctionnalité Premium ⭐'); App.navigate('pricing'); return; }
      if (!currentMatch || !currentConvId) return;
      const toId2 = currentMatch.partner_id || currentMatch.id || currentMatch.match_id;
      VideoCall.startCall({ ...currentMatch, userId: toId2 }, currentConvId);
    },

    showOptions() {
      if (!currentMatch) return;
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
            [{l:'Faux profil',v:'fake_profile'},{l:'Photos inappropriées',v:'inappropriate_content'},{l:'Harcèlement',v:'harassment'},{l:'Spam / Arnaque',v:'scam'},{l:'Contenu haineux',v:'hate_speech'},{l:'Autre',v:'other'}].map(function(r) {
              return '<div class="settings-row" onclick="ChatPage._selectReason(this,\'' + r.v + '\')" style="cursor:pointer;">' +
                '<div class="settings-text"><span style="font-size:14px;">' + r.l + '</span></div>' +
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
      el.querySelectorAll('.check-reason').forEach(c => c.style.opacity = '1');
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