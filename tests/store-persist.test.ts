import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DATA_VERSION, forgetDB, getData, loadData, migrateData, replaceData, storageProblem, update } from '../src/lib/store'
import { fakeIndexedDB, session } from './helpers'
import { parseBackup } from '../src/lib/backup'

test('datos guardados: se repara la forma sin perder lo que hay', () => {
  const d = migrateData({ version: 1, sessions: [session(0, []), 'basura'], routines: 'no es lista', settings: { name: 'Ana' }, nutrition: { entries: [{ id: 'e' }] }, extra: 1 })
  assert.ok(d && d !== 'newer')
  assert.equal(d.sessions.length, 1)
  assert.deepEqual(d.routines, [])
  assert.equal(d.settings.name, 'Ana')
  assert.equal(d.settings.unit, 'kg', 'los ajustes que faltan toman su valor por defecto')
  assert.equal(d.nutrition.entries.length, 1)
  assert.deepEqual(d.nutrition.foods, [])
  assert.equal(d.version, DATA_VERSION)
  assert.equal(migrateData('roto'), undefined)
})

test('datos de una versión más nueva: no se tocan', () => {
  assert.equal(migrateData({ version: DATA_VERSION + 1, sessions: [] }), 'newer')
})

test('si no se pueden leer los datos al abrir, no se escribe encima', async () => {
  const stored = fakeIndexedDB()
  stored.set('data', { version: 1, sessions: [session(0, [])], routines: [], settings: { name: 'Real' } })
  const g = globalThis as unknown as { indexedDB: { open: () => unknown } }
  const real = g.indexedDB
  forgetDB()
  g.indexedDB = { open: () => { const req: { onerror?: () => void; error: Error } = { error: new Error('bloqueado') }; queueMicrotask(() => req.onerror?.()); return req } }
  try {
    await loadData()
    assert.equal(storageProblem()?.kind, 'readError')
    update((d) => { d.settings.name = 'Vacío' })
    await new Promise((r) => setTimeout(r, 400))
    assert.equal((stored.get('data') as { settings: { name: string } }).settings.name, 'Real', 'el historial de verdad sigue ahí')
  } finally {
    g.indexedDB = real
    forgetDB()
    // Restaurar una copia vuelve a permitir guardar.
    replaceData({ ...getData(), sessions: [] })
    assert.equal(storageProblem(), undefined)
  }
})

test('copia de una versión más nueva: se rechaza con un aviso claro', () => {
  assert.throws(() => parseBackup(JSON.stringify({ version: DATA_VERSION + 1, sessions: [], routines: [] })), /más nueva/)
})
