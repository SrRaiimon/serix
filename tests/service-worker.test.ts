import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

// El service worker se ejecuta de verdad (src/sw-template.js con lo que le pone el build), con una CacheStorage,
// una red y unos eventos de mentira. Lo importante: con dos cachés de versión (la actual y la anterior, que se
// conserva), lo que se sirve sale primero de la actual. Antes de la 0.0.77 salía de la anterior y la app abría
// siempre una versión atrás.

const SCOPE = 'https://srraiimon.github.io/serix/'
const source = readFileSync('src/sw-template.js', 'utf8')

type Listener = (event: Record<string, unknown>) => void

/** Una caché: peticiones por URL sin la consulta (como ignoreSearch). */
class FakeCache {
  entries = new Map<string, string>()
  key(r: Request | string) { const u = new URL(typeof r === 'string' ? r : r.url, SCOPE); return u.origin + u.pathname }
  async match(r: Request | string) { const body = this.entries.get(this.key(r)); return body === undefined ? undefined : new Response(body) }
  async put(r: Request | string, res: Response) { this.entries.set(this.key(r), await res.text()) }
  async addAll(list: string[]) { for (const f of list) this.entries.set(this.key(f), `red:${f}`) }
}

/** Las cachés en orden de creación: caches.match() busca en todas empezando por la más antigua, como el navegador. */
class FakeCacheStorage {
  map = new Map<string, FakeCache>()
  async open(name: string) { if (!this.map.has(name)) this.map.set(name, new FakeCache()); return this.map.get(name)! }
  async keys() { return [...this.map.keys()] }
  async delete(name: string) { return this.map.delete(name) }
  async match(r: Request | string) {
    for (const c of this.map.values()) { const hit = await c.match(r); if (hit) return hit }
    return undefined
  }
}

function load(version: string, { online = true, precache = ['./', 'index.html', 'assets/index-abc.js', 'icons/serix-192.png'] } = {}) {
  const listeners = new Map<string, Listener>()
  const caches = new FakeCacheStorage()
  const fetched: string[] = []
  let hang = false
  const network = async (r: Request | string) => {
    const url = typeof r === 'string' ? r : r.url
    fetched.push(url)
    // Cobertura mala: la red ni contesta ni falla.
    if (hang) await new Promise(() => undefined)
    if (!online) throw new TypeError('sin conexión')
    return new Response(`red:${new URL(url).pathname}`)
  }
  const self = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    registration: { scope: SCOPE },
    location: { origin: new URL(SCOPE).origin },
    skipWaiting: () => undefined,
    clients: { claim: async () => undefined },
  }
  const code = source.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)).replace('__OPTIONAL__', '[]')
  // Los temporizadores, cien veces más rápidos: el tiempo límite de los iconos (3 s) en 30 ms.
  runInNewContext(code, { self, caches, fetch: network, Request, Response, URL, console, setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms / 100), clearTimeout })
  /** Lanza un evento y espera lo que el service worker deje pendiente (waitUntil o respondWith). */
  const fire = async (type: string, extra: Record<string, unknown> = {}) => {
    let pending: Promise<unknown> | undefined
    let responded = false
    const event = { ...extra, waitUntil: (p: Promise<unknown>) => { pending = p }, respondWith: (p: Promise<Response>) => { responded = true; pending = p } }
    listeners.get(type)!(event)
    const value = await pending
    return { responded, value }
  }
  const get = async (path: string, mode = 'no-cors') => {
    const request = Object.assign(new Request(new URL(path, SCOPE)), {})
    Object.defineProperty(request, 'mode', { value: mode })
    const { responded, value } = await fire('fetch', { request })
    return responded ? await (value as Response).text() : undefined
  }
  return { caches, fire, get, fetched, setOnline: (v: boolean) => { online = v }, setHang: (v: boolean) => { hang = v } }
}

test('service worker: la página y los archivos salen de la caché de esta versión, no de la anterior', async () => {
  const sw = load('b')
  // La versión anterior ya estaba (creada antes: caches.match la encontraría primero).
  const old = await sw.caches.open('serix-a')
  await old.put(`${SCOPE}index.html`, new Response('index viejo'))
  await old.put(`${SCOPE}exercises_index.json`, new Response('ejercicios viejos'))
  await old.put(`${SCOPE}assets/Pantalla-vieja.js`, new Response('pantalla de una pestaña vieja'))
  await sw.fire('install')
  const now = await sw.caches.open('serix-b')
  await now.put(`${SCOPE}index.html`, new Response('index nuevo'))
  await now.put(`${SCOPE}exercises_index.json`, new Response('ejercicios nuevos'))

  assert.equal(await sw.get('./', 'navigate'), 'index nuevo')
  assert.equal(await sw.get('index.html', 'navigate'), 'index nuevo')
  assert.equal(await sw.get('exercises_index.json?v=2'), 'ejercicios nuevos')
  // Lo que solo tiene la anterior (una pestaña abierta con ella), de la anterior; lo que no hay, de la red.
  assert.equal(await sw.get('assets/Pantalla-vieja.js'), 'pantalla de una pestaña vieja')
  assert.equal(await sw.get('assets/nueva.js'), 'red:/serix/assets/nueva.js')
})

test('service worker: otras páginas del sitio y otros dominios no los toca', async () => {
  const sw = load('b')
  await sw.fire('install')
  assert.equal(await sw.get('/prueba-icono/', 'navigate'), undefined)
  assert.equal(await sw.get('https://world.openfoodfacts.org/api/x'), undefined)
})

test('service worker: los iconos, de la red y sin conexión de lo guardado (el logo no se rompe)', async () => {
  const sw = load('b')
  await sw.fire('install')
  assert.equal(await sw.get('icons/serix-192.png'), 'red:/serix/icons/serix-192.png')
  assert.ok(sw.fetched.some((u) => u.endsWith('/icons/serix-192.png')), 'pedido a la red')
  sw.setOnline(false)
  assert.equal(await sw.get('icons/serix-192.png'), 'red:icons/serix-192.png', 'el guardado al instalar')
  // Con la red colgada no se espera para siempre: pasado el tiempo límite, el guardado.
  sw.setHang(true)
  assert.equal(await sw.get('icons/serix-192.png'), 'red:icons/serix-192.png', 'red colgada')
})

test('service worker: al activarse conserva la versión anterior y borra las más viejas, nunca lo ajeno', async () => {
  const sw = load('c')
  for (const name of ['serix-a', 'serix-b', 'gym-app-v9', 'gym-img-v1', 'serix-ocr-v1', 'serix-aesan-v3', 'otra-app']) await sw.caches.open(name)
  await sw.fire('install')
  await sw.fire('activate')
  assert.deepEqual((await sw.caches.keys()).sort(), ['otra-app', 'serix-aesan-v3', 'serix-b', 'serix-c', 'serix-ocr-v1'])
})
