import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// El service worker no se puede ejecutar en Node; se comprueba su código. Lo importante: con dos cachés
// de versión (la actual y la anterior, que se conserva), lo que se sirve sale primero de la actual.
const sw = readFileSync('src/sw-template.js', 'utf8')

test('service worker: la página y los archivos salen de la caché de esta versión, no de la anterior', () => {
  const fetchHandler = sw.slice(sw.indexOf("addEventListener('fetch'"), sw.indexOf('function cacheFor'))
  assert.ok(/caches\.open\(APP_CACHE\)[\s\S]*?match\('index\.html'/.test(fetchHandler), 'index.html, de APP_CACHE')
  assert.ok(!/caches\.match\('index\.html'/.test(fetchHandler), 'nunca caches.match(index.html), que busca en todas empezando por la más vieja')
  const last = fetchHandler.slice(fetchHandler.lastIndexOf('event.respondWith'))
  assert.ok(last.indexOf('caches.open(APP_CACHE)') < last.indexOf('caches.match(request'), 'el resto, primero en APP_CACHE')
})

test('service worker: los iconos, de la red y sin conexión de lo guardado (el logo no se rompe)', () => {
  const icons = sw.slice(sw.indexOf("'/icons/'"), sw.indexOf("'/icons/'") + 300)
  assert.ok(/fetch\(request\)\.catch\(\(\) => caches\.match\(request/.test(icons), icons)
})
