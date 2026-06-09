// Service worker — faz o site funcionar offline.
// Mude o número da versão sempre que atualizar os arquivos (força a renovação do cache).
const CACHE = 'cartinhas-v2';

// Arquivos do próprio site, guardados já na instalação.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Não interceptar as chamadas de dados do Firebase/Google:
  // o próprio Firestore cuida do cache offline dos dados.
  if (/firestore|firebaseio|googleapis|google-analytics|gstatic\.com\/firebasejs/.test(url.href)) {
    return;
  }

  // Para a página em si: tenta rede, cai para o cache se estiver offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais recursos (fontes, scripts, ícone): cache primeiro, depois rede.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
