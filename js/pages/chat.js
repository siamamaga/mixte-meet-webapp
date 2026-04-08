// js/pages/chat.js
const ChatPage = (() => {
  let currentMatch = null;
  const DEMO_MSGS = {
    1: [
      { id:1, sent:false, content:'Bonjour ! Je suis ravie de notre match 😊', time:'10:00' },
      { id:2, sent:true,  content:'Bonjour ! Moi aussi, tu habites à Abidjan ?', time:'10:01' },
      { id:3, sent:false, content:'Oui ! Et toi tu viens d\'où ?', time:'10:02' },
      { id:4, sent:true,  content:'Je suis à Paris. J\'ai toujours rêvé de visiter la Côte d\'Ivoire 🇨🇮', time:'10:03' },
      { id:5, sent:false, content:'Il faut venir ! Je pourrais te faire visiter 😄🌴', time:'10:05' },
    ],
  };

  function open(match) {
    currentMatch = match;
    App.navigate('chat');
    render();
  }

  function render() {
    if (!currentMatch) return;
    const msgs = DEMO_MSGS[currentMatch.conversation_id] || [];
    const REPLIES = ['😊 C\'est super !','Vraiment ?','J\'adore ça !','Raconte-moi plus 🌍','Haha oui !','🦋'];

    document.getElementById('page-chat').innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;">
        <div class="page-header">
          <button class="header-btn" onclick="App.navigate('matches')">←</button>
          <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#2D1F38,var(--pink));display:flex;align-items:center;justify-content:center;font-size:22px;margin-right:4px;">${currentMatch.emoji}</div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:600;">${currentMatch.first_name}</div>
            <div style="font-size:11px;color:${currentMatch.online?'var(--green)':'var(--muted)'};">${currentMatch.online?'● En ligne':'Hors ligne'}</div>
          </div>
          <button class="header-btn" onclick="Toast.info('Appel vidéo — Premium')">📹</button>
        </div>

        <div class="chat-messages" id="chat-messages">
          <div style="text-align:center;padding:16px;color:var(--muted);font-size:12px;">🦋 Vous vous êtes matchés ! Dites bonjour.</div>
          ${msgs.map(m => renderMsg(m)).join('')}
          <div id="typing-zone"></div>
        </div>

        <div class="chat-input-bar">
          <button class="header-btn" onclick="Toast.info('Cadeaux — Premium')">🎁</button>
          <textarea class="chat-input-field" id="msg-input" placeholder="Votre message..." rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ChatPage.send();}"></textarea>
          <button class="chat-send-btn" onclick="ChatPage.send()">➤</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      const c = document.getElementById('chat-messages');
      if (c) c.scrollTop = c.scrollHeight;
    }, 50);
  }

  function renderMsg(msg) {
    return `<div class="chat-message ${msg.sent?'sent':'recv'}">
      ${!msg.sent?`<div class="msg-avatar">${currentMatch.emoji}</div>`:''}
      <div>
        <div class="msg-bubble">${Utils.escapeHtml(msg.content)}</div>
        <div class="msg-time">${msg.time}</div>
      </div>
    </div>`;
  }

  return {
    open,
    render,
    send() {
      const input = document.getElementById('msg-input');
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();
      const msgs = DEMO_MSGS[currentMatch.conversation_id] = DEMO_MSGS[currentMatch.conversation_id] || [];
      const newMsg = { id: Date.now(), sent: true, content: text, time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) };
      msgs.push(newMsg);
      const container = document.getElementById('chat-messages');
      if (container) {
        const el = document.createElement('div');
        el.innerHTML = renderMsg(newMsg);
        container.insertBefore(el.firstChild, document.getElementById('typing-zone'));
        container.scrollTop = container.scrollHeight;
      }
      input.value = '';
      const REPLIES = ['😊 C\'est super !','Vraiment ?','J\'adore ça !','Raconte-moi plus 🌍','🦋','Haha oui !'];
      setTimeout(() => {
        const reply = { id: Date.now()+1, sent: false, content: REPLIES[Math.floor(Math.random()*REPLIES.length)], time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) };
        msgs.push(reply);
        const c = document.getElementById('chat-messages');
        if (c) {
          const el2 = document.createElement('div');
          el2.innerHTML = renderMsg(reply);
          const tz = document.getElementById('typing-zone');
          c.insertBefore(el2.firstChild, tz);
          c.scrollTop = c.scrollHeight;
        }
      }, 1200);
    },
    showOptions() {
      Modal.show(`<div style="display:flex;flex-direction:column;gap:4px;">
        <div class="settings-row" onclick="Modal.close();Toast.info('Profil ouvert')"><span class="settings-icon">👤</span><div class="settings-text"><span>Voir le profil</span></div></div>
        <div class="settings-row" onclick="Modal.close();Toast.info('Bloqué')"><span class="settings-icon">🚫</span><div class="settings-text"><span>Bloquer</span></div></div>
        <div class="settings-row" onclick="Modal.close();Toast.info('Signalé')"><span class="settings-icon">⚠️</span><div class="settings-text"><span>Signaler</span></div></div>
      </div>`, 'Options');
    },
  };
})();
