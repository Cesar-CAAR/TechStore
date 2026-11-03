const CACHE_NAME = 'techstore-v1';
const ARCHIVOS_ESTATICOS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ARCHIVOS_ESTATICOS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('onrender.com')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request)
        .then(respuestaCache => respuestaCache || fetch(event.request))
    );
});