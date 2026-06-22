const CACHE_VERSION = 'oqt-static-v2'
const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]
const API_PREFIXES = [
  '/api',
  '/storage',
  '/analytics',
  '/collector',
  '/health',
  '/data-quality',
]

const isApiRequest = (url) =>
  API_PREFIXES.some((prefix) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  )

const isExternalMapRequest = (url) =>
  url.hostname.endsWith('tile.openstreetmap.org')
  || url.hostname.includes('openstreetmap.org')
  || url.hostname.includes('project-osrm.org')
  || url.hostname.includes('routing.openstreetmap.de')
  || /\/(?:tiles?|route)\//i.test(url.pathname)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('oqt-static-') && key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== 'GET'
    || isExternalMapRequest(url)
    || url.origin !== self.location.origin
    || isApiRequest(url)
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION)
          return (await cache.match(request))
            || (await cache.match('/'))
            || (await cache.match('/offline.html'))
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
