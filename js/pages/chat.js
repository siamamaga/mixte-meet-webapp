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
    if (!currentMatch || !currentMatch.uuid) return true;
    const uid = String(currentMatch.uuid);
    return uid === 'm1' || uid === 'm2' || uid === 'm3' || uid === 'm4';
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
          const convId = currentMatch.conversation_id || currentMatch.id;
          await API.post('/conversations/' + convId + '/messages', { content: text });
        } catch(e) {
          console.log('Send error:', e);
          Toast.error('Erreur envoi - verifiez votre connexion');
        }
      }
    },

    showOptions() {
      Modal.show(
        '<div style="display:flex;flex-direction:column;gap:4px;">' +
          '<div class="settings-row" onclick="Modal.close();Toast.info(\'Profil ouvert\')"><span class="settings-icon">&#128100;</span><div class="settings-text"><span>Voir le profil</span></div></div>' +
          '<div class="settings-row" onclick="Modal.close();Toast.info(\'Utilisateur bloque\')"><span class="settings-icon">&#128683;</span><div class="settings-text"><span>Bloquer</span></div></div>' +
          '<div class="settings-row" onclick="Modal.close();Toast.info(\'Utilisateur signale\')"><span class="settings-icon">&#9888;</span><div class="settings-text"><span>Signaler</span></div></div>' +
        '</div>', 'Options');
    },
  };
})();