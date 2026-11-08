// FlaFan — permite abrir o app mesmo sem internet (mostra a última lista baixada).
const VERSAO = 'flafan-v9';
const ARQUIVOS = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-600-normal.woff2', 'fonts/barlow-latin-700-normal.woff2',
  'fonts/barlow-condensed-latin-700-normal.woff2', 'fonts/barlow-condensed-latin-800-normal.woff2', 'fonts/barlow-condensed-latin-800-italic.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const navegacao = e.request.mode === 'navigate';
  // Sempre tenta a versão mais nova pela internet; se estiver sem sinal, usa a guardada.
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok && r.status === 200) {
        const copia = r.clone();
        e.waitUntil(caches.open(VERSAO).then((c) => c.put(e.request, copia)).catch(() => {}));
      }
      return r;
    }).catch(async () => (await caches.match(e.request, { ignoreSearch: navegacao })) ||
      (navegacao ? caches.match('index.html') : Response.error()))
  );
});
