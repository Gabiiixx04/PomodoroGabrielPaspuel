const CACHE = 'pomodoro-time-v3';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './features.js', './features.css', './manifest.webmanifest',
  './assets/audio/lofi.mp3', './assets/audio/white.mp3', './assets/audio/rain.mp3', './assets/audio/breeze.mp3',
  './assets/icon.svg', './assets/lake.jpg', './assets/forest.jpg', './assets/coast.jpg',
  './assets/sans.css', './assets/serif.css',
  './assets/sans-0.ttf', './assets/sans-1.ttf', './assets/sans-2.ttf', './assets/sans-3.ttf',
  './assets/serif-0.ttf', './assets/serif-1.ttf', './assets/serif-2.ttf'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (new URL(event.request.url).pathname.endsWith('.zip')) return;
  // Prefer current files online; serve the cached app without a connection.
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request)));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    return existing ? existing.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
