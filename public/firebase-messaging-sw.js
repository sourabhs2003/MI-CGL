importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCZMfIl46ea7C_1U_8XEmjpeImg4-so9tk',
  authDomain: 'sourabhzssc.firebaseapp.com',
  projectId: 'sourabhzssc',
  storageBucket: 'sourabhzssc.firebasestorage.app',
  messagingSenderId: '31742915782',
  appId: '1:31742915782:web:29fa2b94b6d146aea6d3c7',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'MI CGL'
  const options = {
    body: payload.notification?.body || '',
    data: payload.data || {},
    icon: '/icon.png',
    badge: '/icon.png',
  }

  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.actionUrl || '/'
  event.waitUntil(clients.openWindow(targetUrl))
})
