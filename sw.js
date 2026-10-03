// Service Worker — 清除所有旧缓存，强制重新加载
const V = 'v99';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // 删除所有旧缓存
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// 不缓存任何内容，全部走网络
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
