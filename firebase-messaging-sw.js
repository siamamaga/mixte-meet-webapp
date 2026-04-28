// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDFsYsWBwKq1d0kNdJYJlX0ewGugUfyZmk",
  authDomain: "mixte-meet.firebaseapp.com",
  projectId: "mixte-meet",
  storageBucket: "mixte-meet.firebasestorage.app",
  messagingSenderId: "1035382105933",
  appId: "1:1035382105933:web:9ec53944535d1eb12db904"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    vibrate: [200, 100, 200],
    data: payload.data
  });
});
