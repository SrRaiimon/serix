// Service worker generado en el build (ver vite.config.ts).
const VERSION = '__VERSION__'
// Prefijo propio: la primera versión (srraiimon.github.io/gymapp/) comparte dominio y usaba «gym-app-».
const APP_CACHE = `serix-${VERSION}`
const OWN_OR_LEGACY = (key) => key.startsWith('serix-') || key.startsWith('gym-app-') || key === 'gym-img-v1'
const PRECACHE = __PRECACHE__
// ignoreVary: algunos servidores responden con "Vary: Origin" y los <script type="module"> se piden
// con cabecera Origin, así que sin esto no coinciden con lo precargado y fallan sin conexión.
const MATCH = { ignoreSearch: true, ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Borra solo sus versiones anteriores y las de la primera versión (fotos incluidas); nunca
    // cachés ajenas del mismo dominio.
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP_CACHE && OWN_OR_LEGACY(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  // Navegación: la copia guardada al instante (en el gimnasio la cobertura suele ser mala). Las
  // versiones nuevas llegan con un sw.js nuevo, que vuelve a precargar index.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html', MATCH).then((hit) => hit || fetch(request)),
    )
    return
  }

  event.respondWith(
    caches.match(request, MATCH).then((hit) => hit || fetch(request)),
  )
})
