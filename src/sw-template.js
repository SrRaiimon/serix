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

// Al tocar el aviso del descanso se vuelve a la app (o se abre si estaba cerrada).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c)
      return client ? client.focus() : self.clients.openWindow('./')
    }),
  )
})

// Aviso del descanso con el móvil bloqueado (ver src/lib/lockScreen.ts). La página le avisa al empezar
// cada descanso; él espera hasta el final dentro del evento (Chrome lo deja vivir hasta 5 minutos) y
// notifica aunque la página se haya congelado. Si la app está a la vista no hace falta.
let restEnd = 0
let restShown = 0

self.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg || typeof msg !== 'object') return
  if (msg.type === 'rest-cancel') restEnd = 0
  if (msg.type !== 'rest' || typeof msg.endAt !== 'number') return
  restEnd = msg.endAt
  const wait = msg.endAt - Date.now()
  if (wait > 290000) return // más de 5 minutos: lo avisa la página al terminar
  event.waitUntil(new Promise((resolve) => setTimeout(resolve, Math.max(0, wait))).then(() => notifyRest(msg)))
})

async function notifyRest(msg) {
  if (restEnd !== msg.endAt || restShown === msg.endAt) return
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (list.some((c) => c.visibilityState === 'visible')) return
  restShown = msg.endAt
  await self.registration.showNotification(msg.title, msg.options)
  for (const c of list) c.postMessage({ type: 'rest-notified', endAt: msg.endAt, at: Date.now() })
}
