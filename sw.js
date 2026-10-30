/**
 * Service Worker — 缓存优先 + 离线回退
 *
 * 预缓存所有核心资源，确保首次安装后即可离线使用。
 * 缓存策略：cache-first，后台静默更新。
 */
'use strict';

const CACHE_NAME = 'yishan-closet-v4';

const BASE = self.registration.scope;

const PRECACHE_URLS = [
  BASE,
  BASE + 'index.html',
  BASE + 'offline.html',
  BASE + 'css/style.css',
  BASE + 'js/storage.js',
  BASE + 'js/router.js',
  BASE + 'js/app.js',
  BASE + 'js/tools/registry.js',
  BASE + 'js/tools/outfits.js',
  BASE + 'js/tools/profile.js',
  BASE + 'js/tools/notes.js',
  BASE + 'js/diamond-chart.js',
  BASE + 'manifest.json',
  BASE + 'icons/icon-192x192.png',
  BASE + 'icons/icon-512x512.png'
];

/* ===================================================================
 * Install — 预缓存所有核心资源
 * =================================================================== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] 预缓存失败:', url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ===================================================================
 * Activate — 清理旧缓存
 * =================================================================== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* ===================================================================
 * Fetch — 缓存优先，后台更新
 * =================================================================== */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        fetchAndUpdateCache(event.request);
        return cached;
      }
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(BASE + 'offline.html');
        }
        return new Response('', { status: 408 });
      });
    })
  );
});

function fetchAndUpdateCache(request) {
  fetch(request).then(response => {
    if (response && response.status === 200 && response.type === 'basic') {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response));
    }
  }).catch(() => {});
}

/* ===================================================================
 * Message — 接收 skipWaiting 指令
 * =================================================================== */
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
