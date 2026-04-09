// js/pages/chat.js
const ChatPage = (() => {
  let currentMatch = null;
  let messages = [];
  let pollingInterval = null;

  // Messages démo de secours (si profil démo ou API indisponible)
  const DEMO_MSGS = {
    1: [
      { id:1, sent:false, content:'Bonjour ! Je suis ravie de notre match 😊', time:'10:00' },
      { id:2, sent:true,  content:"Bonjour ! Moi aussi, tu habites à Abidjan ?", time:'10:01' },
      { id:3, sent:false, content:"Oui ! Et toi tu viens d'où ?", time:'10:02' },
      { id:4, sent:true,  content:"Je suis à Paris. J'ai toujours rêvé de visiter la Côte d'Ivoire 🇨🇮", time:'10:03' },
      { id:5, sent:false, content:'Il faut venir ! Je pourrais te faire visiter 😄🌴', time:'10:05' },
    ],
  };

  const DEMO_REPLIES = ["😊 C'est super !", 'Vraiment ?', "J'adore ça !", 'Raconte-moi plus 🌍', 'Haha oui !', '🦋'];

  function isDemo() {
    return !currentMatch || !currentMatch.uuid || currentMatch.uuid.startsWith('m') && currentMatch.uuid.length <= 3;
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
      // Profil démo → messages fictifs
      const demoMsgs = DEMO_MSGS[currentMatch.conversation_id] || [];
      messages = demoMsgs;
      renderMessages();
      return;
    }

    try {
      const convId = currentMatch.conversation_id || currentMatch.id;
      const data = await API.get(`/conversations/${convId}/messages`);
      const myUuid = AuthService.getUser()?.uuid;
      messages = (data?.data || []).map(msg => ({
        id: msg.id,
        sent: msg.sender_uuid === myUuid,
        content: msg.content,
        time: new Date(msg.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      }));
      renderMessages();
      // Polling toutes les 5 secondes pour nouveaux messages
      startPolling();
    } catch(e) {
      console.log('Messages API error:', e);
      // Fallback démo si erreur
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
        const data = await API.get(`/conversations/${convId}/messages`);
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
      } catch(e) { /* silencieux */ }
    }, 5000);
  }

  function stopPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
  }

  function render() {
    if (!currentMatch) return;
    document.getElementById('page-chat').innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;">
        <div class="page-header">
          <button class="header-btn" onclick="ChatPage.close()">←</button>
          <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:22px;margin-right:4px;overflow:hidden;">
            ${currentMatch.main_photo
              ? `<img src="${currentMatch.main_photo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='${currentMatch.emoji || '👤'}'">` 
              : (currentMatch.emoji || '👤')}
          </div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:600;">${currentMatch.first_name}</div>
            <div style="font-size:11px;color:${currentMatch.online ? 'var(--green)' : 'var(--muted)'};">${currentMatch.online ? '● En ligne' : 'Hors ligne'}</div>
          </div>
          <button class="header-btn" onclick="Toast.info('Appel vidéo — Premium 🔒')">📹</button>
          <button class="header-btn" onclick="ChatPage.showOptions()">⋯</button>
        </div>

        <div class="chat-messages" id="chat-messages">
          <div style="text-align:center;padding:16px;color:var(--muted);font-size:12px;">🦋 Vous vous êtes matchés ! Dites bonjour.</div>
          <div id="messages-list"></div>
          <div id="typing-zone"></div>
        </div>

        <div class="chat-input-bar">
          <button class="header-btn" onclick="Toast.info('Cadeaux — Premium 🔒')">🎁</button>
          <textarea class="chat-input-field" id="msg-input" placeholder="Votre message..." rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ChatPage.send();}"></textarea>
          <button class="chat-send-btn" onclick="ChatPage.send()">➤</button>
        </div>
      </div>
    `;
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
    return `<div class="chat-message ${msg.sent ? 'sent' : 'recv'}">
      ${!msg.sent ? `<div class="msg-avatar">${avatar}</div>` : ''}
      <div>
        <div class="msg-bubble">${Utils.escapeHtml(msg.content)}</div>
        <div class="msg-time">${msg.time}</div>
      </div>
    </div>`;
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

    close() {
      stopPolling();
      App.navigate('matches');
    },

    render,

    async send() {
      const input = document.getElementById('msg-input');
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();
      input.value = '';

      // Afficher immédiatement côté envoyeur
      const now = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
      const optimistic = { id: Date.now(), sent: true, content: text, time: now };
      appendMsg(optimistic);

      if (isDemo()) {
        // Mode démo → réponse auto simulée
        const tz = document.getElementById('typing-zone');
        if (tz) tz.innerHTML = `<div style="padding:8px 16px;color:var(--muted);font-size:12px;">● ${currentMatch.first_name} écrit...</div>`;
        setTimeout(() => {
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
        // Mode réel → envoyer via API
        try {
          const convId = currentMatch.conversation_id || currentMatch.id;
          await API.post(`/conversations/${convId}/messages`, { content: text });
          // Le polling récupérera la confirmation et les réponses
        } catch(e) {
          console.log('Send error:', e);
          Toast.error('Erreur envoi — vérifiez votre connexion');
        }
      }
    },

    showOptions() {
      Modal.show(`
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div class="settings-row" onclick="Modal.close();Toast.info('Profil ouvert')">
            <span class="settings-icon">👤</span><div class="settings-text"><span>Voir le profil</span></div>
          </div>
          <div class="settings-row" onclick="Modal.close();Toast.info('Utilisateur bloqué')">
            <span class="settings-icon">🚫</span><div class="settings-text"><span>Bloquer</span></div>
          </div>
          <div class="settings-row" onclick="Modal.close();Toast.info('Utilisateur signalé')">
            <span class="settings-icon">⚠️</span><div class="settings-text"><span>Signaler</span></div>
          </div>
        </div>`, 'Options');
    },
  };
})();
