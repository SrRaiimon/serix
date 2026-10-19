import assert from 'node:assert/strict'
import { test } from 'node:test'
import { release, silence, type InertTarget } from '../src/lib/inertStack'

/** Un elemento de mentira: solo sus atributos. */
function el(name: string, inert = false): InertTarget & { name: string; inert: () => boolean } {
  const attrs = new Set(inert ? ['inert'] : [])
  return { name, inert: () => attrs.has('inert'), hasAttribute: (n) => attrs.has(n), setAttribute: (n) => { attrs.add(n) }, removeAttribute: (n) => { attrs.delete(n) } }
}

test('hojas apiladas: cerrar la de debajo antes no reactiva la app mientras la de arriba siga abierta', () => {
  const app = el('app'), a = el('hoja A'), b = el('hoja B')
  const underA = silence([app, a], (x) => x === a)
  assert.ok(app.inert() && !a.inert())
  const underB = silence([app, a, b], (x) => x === b)
  assert.ok(app.inert() && a.inert() && !b.inert())
  // Fuera de orden: se cierra A (la de debajo) con B aún abierta.
  release(underA)
  assert.ok(app.inert(), 'la app sigue inerte con B abierta')
  release(underB)
  assert.ok(!app.inert() && !a.inert(), 'con todo cerrado, nada inerte')
})

test('hojas apiladas: lo que ya era inerte por otra cosa no se toca', () => {
  const app = el('app'), ajeno = el('ajeno', true), hoja = el('hoja')
  const silenced = silence([app, ajeno, hoja], (x) => x === hoja)
  assert.deepEqual(silenced.map((x) => (x as { name: string }).name), ['app'])
  release(silenced)
  assert.ok(ajeno.inert(), 'sigue inerte: no lo puso ninguna hoja')
})
