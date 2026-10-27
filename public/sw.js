// Service Worker for Dompetku PWA (Offline Support)
const CACHE_NAME = 'dompetku-pwa-v1'

// App Shell routes and core static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/transactions',
  '/stats',
  '/investments',
  '/accounts',
  '/more',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-icon.png',
  '/icon-light-32x32.png',
  '/icon-dark-32x32.png',
]

// 1. Install Event: Cache app shells and take control immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-caching failed (will cache dynamically):', err)
        return self.skipWaiting()
      })
  )
})

// 2. Activate Event: Clean up outdated caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// 3. Fetch Event: Intercept network requests for offline fallback
self.addEventListener('fetch', (event) => {
  const req = event.request

  // Only handle GET requests
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Bypass non-http/https or analytics/telemetry requests
  if (!url.protocol.startsWith('http')) return
  if (url.pathname.startsWith('/_vercel')) return

  // Strategy A: Navigation requests (HTML pages)
  // Try Network first. If successful, update cache.
  // If offline/network fails, return cached response (falling back to /transactions or /).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return networkRes
        })
        .catch(async () => {
          // Device is offline! Match exact request, or fall back to /transactions or /
          const cache = await caches.open(CACHE_NAME)
          const cachedPage =
            (await cache.match(req)) ||
            (await cache.match(url.pathname)) ||
            (await cache.match('/transactions')) ||
            (await cache.match('/'))
          if (cachedPage) {
            return cachedPage
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
    )
    return
  }

  // Strategy B: Static assets (_next/static, fonts, icons, images)
  // Cache First, then Network fallback
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        if (cachedRes) {
          // Fetch in background to revalidate cache if online
          fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes))
              }
            })
            .catch(() => {})
          return cachedRes
        }

        return fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const copy = networkRes.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
            }
            return networkRes
          })
          .catch(() => caches.match(req))
      })
    )
    return
  }

  // Strategy C: Other requests (Stale-While-Revalidate)
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return networkRes
        })
        .catch(() => cachedRes)

      return cachedRes || fetchPromise
    })
  )
})
