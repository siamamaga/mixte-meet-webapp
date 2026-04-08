// js/services/socket.js
const SocketService = (() => {
  let socket = null;
  const handlers = {};

  return {
    connect() {
      const token = AuthService.getToken();
      if (!token) return;
      console.log('🔌 Socket: prêt pour connexion temps réel');
    },
    disconnect() { socket = null; },
    on(event, callback) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(callback);
    },
    emit(event, data) {
      if (socket) socket.emit(event, data);
    },
    isConnected: () => false,
  };
})();
