/**
 * sw.js — Service Worker
 * 提供离线缓存支持，让 PWA 可在无网络时运行
 */
const CACHE_NAME = 'merry-scratch-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './renderer/storage.js',
  './renderer/tree-drawer.js',
  './renderer/sound-manager.js',
  './renderer/particle-system.js',
  './renderer/scratch-layer.js',
  './renderer/app.js',
];

// 安装：预缓存所有资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：缓存优先
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
