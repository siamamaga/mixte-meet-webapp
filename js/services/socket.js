// js/services/socket.js — Temps réel via polling intelligent
// (Socket.io nécessite une lib externe — on utilise du long-polling robuste)
const SocketService = (() => {
  const BACKEND = 'https://mixte-meet-backend.onrender.com/api';
  const handlers = {};
  let pollInterval    = null;
  let connected       = false;
  let lastMessageTime = null;
  let activeConvId    = null;

  // ── Enregistrement des listeners ──────────────────────────────────────────
  function on(event, callback) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(callback);
  }

  function off(event, callback) {
    if (!handlers[event]) return;
    handlers[event] = handlers[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    const cbs = handlers[event] || [];
    cbs.forEach(cb => { try { cb(data); } catch(e) { console.warn('Socket handler error:', e); } });
  }

  // ── Connexion / déconnexion ───────────────────────────────────────────────
  function connect() {
    const token = AuthService.getToken();
    if (!token || connected) return;
    connected = true;
    console.log('🔌 SocketService: connexion polling temps réel');
    startGlobalPolling();
  }

  function disconnect() {
    connected = false;
    activeConvId = null;
    stopGlobalPolling();
    stopConversationPolling();
    console.log('🔌 SocketService: déconnecté');
  }

  // ── Polling global — matchs + notifications ───────────────────────────────
  function startGlobalPolling() {
    stopGlobalPolling();
    pollInterval = setInterval(async () => {
      if (!connected || !AuthService.isLoggedIn()) return;
      try {
        const token = AuthService.getToken();
        const res = await fetch(`${BACKEND}/notifications/unread`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data?.data?.new_matches > 0) {
          emit('new_match', data.data);
          // Mettre à jour le badge matchs
          const badge = document.getElementById('badge-matches');
          if (badge) {
            badge.textContent = data.data.new_matches;
            badge.classList.remove('hidden');
          }
        }
        if (data?.data?.new_messages > 0) {
          emit('new_message_notif', data.data);
        }
      } catch {}
    }, 15000); // toutes les 15 secondes
  }

  function stopGlobalPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  // ── Polling conversation active ───────────────────────────────────────────
  let convInterval = null;

  function watchConversation(convId, onNewMessages) {
    stopConversationPolling();
    activeConvId    = convId;
    lastMessageTime = new Date().toISOString();

    convInterval = setInterval(async () => {
      if (!connected || !activeConvId) return;
      try {
        const token = AuthService.getToken();
        const res   = await fetch(
          `${BACKEND}/conversations/${activeConvId}/messages?after=${encodeURIComponent(lastMessageTime)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const msgs = data?.data || [];
        if (msgs.length > 0) {
          lastMessageTime = msgs[msgs.length - 1].created_at;
          onNewMessages(msgs);
          emit('new_messages', { convId: activeConvId, messages: msgs });
        }
      } catch {}
    }, 3000); // toutes les 3 secondes dans une conversation
  }

  function stopConversationPolling() {
    if (convInterval) { clearInterval(convInterval); convInterval = null; }
    activeConvId = null;
  }

  // ── Envoi de message avec confirmation ────────────────────────────────────
  async function sendMessage(convId, content) {
    const token = AuthService.getToken();
    try {
      const res = await fetch(`${BACKEND}/conversations/${convId}/messages`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Erreur envoi');
      return data.data;
    } catch(e) {
      throw e;
    }
  }

  // ── Indicateur "en train d'écrire" (throttled) ────────────────────────────
  let typingTimeout = null;
  function sendTyping(convId) {
    if (typingTimeout) return; // throttle 3s
    typingTimeout = setTimeout(() => { typingTimeout = null; }, 3000);
    const token = AuthService.getToken();
    fetch(`${BACKEND}/conversations/${convId}/typing`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }

  return {
    connect, disconnect, on, off, emit,
    isConnected: () => connected,
    watchConversation, stopConversationPolling,
    sendMessage, sendTyping,
  };
})();