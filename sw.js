/* Service Worker：離線優先（cache-first）。
   目標＝裝到手機後就完全不需要網路，開了就能用。
   改版時靠 CACHE 版本號淘汰舊快取，並在背景偷偷更新（stale-while-revalidate）。 */
const CACHE = 'nanyi8-english-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 只接管自己網域；YouTube／Drive 那些外部連結不攔（它們本來就需要網路）
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(hit => {
      // 有快取就先給，離線也能用；同時在背景更新，下次開就是新版
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});
