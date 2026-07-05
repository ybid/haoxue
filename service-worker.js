// Service Worker - 口算小达人
// 自动更新: 通过 <APP_VERSION> 占位符在 index.html boot 时动态注入
// 或直接修改此处版本号后发布

const CACHE_VERSION = 'hx-v1.1.0';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/apple-touch-icon.svg'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        // 逐个添加，避免单个失败导致整个安装失败
        return Promise.allSettled(
          CORE_ASSETS.map(url =>
            cache.add(url).catch(() => console.warn('[SW] 缓存失败:', url))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求处理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // HTML 导航请求: network-first
  if (request.mode === 'navigate' ||
      request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源: cache-first, network-update
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // 后台更新缓存 (stale-while-revalidate 策略)
        fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(c => c.put(request, clone));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
        return response;
      });
    })
  );
});

// 消息处理：跳过等待 + 清理缓存
self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data) return;

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      caches.keys().then(keys => {
        keys.forEach(k => caches.delete(k));
      });
      break;
  }
});
