import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { restEndAt, syncRestFromStorage } from '../src/lib/timer'

// El descanso va igual en dos pestañas: lo que una escribe en localStorage lo adopta la otra por el evento «storage».
const doc = (globalThis as unknown as { document: { visibilityState: string } }).document
const fire = (newValue: string | null, key = 'serix-rest') => syncRestFromStorage({ key, newValue })

test('descanso entre pestañas: otra pestaña lo empieza, lo cambia y lo para', () => {
  const before = doc.visibilityState
  doc.visibilityState = 'hidden' // la pestaña oculta no programa el pitido (en Node no hay audio)
  try {
    fire(null)
    assert.equal(restEndAt(), undefined)
    const endAt = Date.now() + 90000
    fire(JSON.stringify({ endAt, total: 90000, next: 'Sentadilla', setId: 'x', eff: 0 }))
    assert.equal(restEndAt(), endAt)
    // Otra clave, un valor roto o uno ya terminado: nada cambia.
    fire(JSON.stringify({ endAt: Date.now() + 5000, total: 5000 }), 'otra-clave')
    fire('{roto')
    fire(JSON.stringify({ endAt: Date.now() - 1000, total: 1000 }))
    assert.equal(restEndAt(), endAt)
    // Se amplía en la otra pestaña.
    const later = endAt + 15000
    fire(JSON.stringify({ endAt: later, total: 105000, next: 'Sentadilla', setId: 'x', eff: 15 }))
    assert.equal(restEndAt(), later)
    // Se para en la otra pestaña (la clave desaparece).
    fire(null)
    assert.equal(restEndAt(), undefined)
  } finally {
    doc.visibilityState = before
  }
})
