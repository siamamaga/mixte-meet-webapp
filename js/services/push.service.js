// js/services/push.service.js
const PushService = (() => {
  const VAPID_KEY = 'BG3oQzqXK9-d9UTtK5kWfgx8cSU_jDnKYU9D56yLPzDfPSSqt_tJqo_btpH9KWhTWDXr_gBrgE2S8i-14O5GQ40';
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDFsYsWBwKq1d0kNdJYJlX0ewGugUfyZmk",
    authDomain: "mixte-meet.firebaseapp.com",
    projectId: "mixte-meet",
    storageBucket: "mixte-meet.firebasestorage.app",
    messagingSenderId: "1035382105933",
    appId: "1:1035382105933:web:9ec53944535d1eb12db904"
  };

  async function init() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
      const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');
      const app = initializeApp(FIREBASE_CONFIG);
      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
      if (token) {
        await API.post('/push/register', { token, platform: 'web' });
        console.log('Push token enregistre');
      }
      onMessage(messaging, (payload) => {
        Toast.info(payload.notification.title + ' — ' + payload.notification.body);
      });
    } catch(e) {
      console.warn('Push init error:', e.message);
    }
  }

  return { init };
})();



