const CACHE = 'rtc-nomade-v10';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './DROMALOGOTRANS.png', 
    './RTCLOGOTRANS.png', 
    './LEVILOGOTRANS.png',
    './1VERIFTRANS.png', 
    './QRCODETRANS.png', 
    './CONFIRMGRENTRANS.png',
    './EXPIRELOGO.png',
    './manifest.json'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => { if (key !== CACHE) return caches.delete(key); })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    if (url.hostname.includes('script.google.com')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});