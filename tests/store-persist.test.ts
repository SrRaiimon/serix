import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DATA_VERSION, flush, forgetDB, getData, loadData, mergeData, migrateData, replaceData, storageProblem, update } from '../src/lib/store'
import { fakeIndexedDB, session } from './helpers'
import { parseBackup } from '../src/lib/backup'

// Los tests que usan el almacén de verdad (cambian el IndexedDB global) van en fila: node:test puede
// ejecutar los asíncronos a la vez y se pisarían.
let chain: Promise<unknown> = Promise.resolve()
const serial = (fn: () => Promise<void>) => () => (chain = chain.then(fn, fn))

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

test('si no se pueden leer los datos al abrir, no se escribe encima', serial(async () => {
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
    await replaceData({ ...getData(), sessions: [] })
    assert.equal(storageProblem(), undefined)
  }
}))

test('copia de una versión más nueva: se rechaza con un aviso claro', () => {
  assert.throws(() => parseBackup(JSON.stringify({ version: DATA_VERSION + 1, sessions: [], routines: [] })), /más nueva/)
})

test('varias pestañas: se juntan los cambios de las dos en vez de pisarse', () => {
  const base = migrateData({ version: 1, sessions: [session(0, []), session(1, [])], routines: [], settings: { name: 'Ana' }, nutrition: { entries: [{ id: 'vieja', grams: 100 }, { id: 'arroz', grams: 100 }] } })
  assert.ok(base && base !== 'newer')
  // La otra pestaña llega leída de IndexedDB: una copia, nunca los mismos objetos.
  const disk = (d: typeof base) => structuredClone(d)
  // Aquí: un entreno nuevo, se borra el primero y se cambian las unidades.
  const ours = { ...base, sessions: [base.sessions[1], session(2, [])], settings: { ...base.settings, unit: 'lb' as const } }
  // Allí: se borra la comida vieja, se corrigen los gramos del arroz y se cambia el nombre.
  const theirs = disk({ ...base, settings: { ...base.settings, name: 'Ana B' }, nutrition: { ...base.nutrition, entries: [{ ...base.nutrition.entries[1], grams: 150 }, { id: 'nueva' } as never] } })
  const merged = mergeData(theirs, ours, base)
  assert.deepEqual(merged.sessions.map((x) => x.id), [base.sessions[1].id, ours.sessions[1].id], 'lo borrado aquí no reaparece y lo nuevo se queda')
  assert.deepEqual(merged.nutrition.entries.map((e) => [e.id, (e as { grams?: number }).grams]), [['arroz', 150], ['nueva', undefined]], 'lo cambiado y borrado allí se respeta')
  assert.equal(merged.settings.name, 'Ana B', 'un ajuste cambiado solo allí')
  assert.equal(merged.settings.unit, 'lb', 'un ajuste cambiado solo aquí')
  // Si los dos cambian lo mismo, gana esta pestaña.
  const both = mergeData(disk({ ...base, settings: { ...base.settings, name: 'Allí' } }), { ...base, settings: { ...base.settings, name: 'Aquí' } }, base)
  assert.equal(both.settings.name, 'Aquí')
})

test('varias pestañas: al guardar, si otra pestaña escribió antes, se junta en la misma escritura', serial(async () => {
  const stored = fakeIndexedDB()
  stored.set('data', { version: 1, sessions: [], routines: [], settings: { name: 'Ana' } })
  forgetDB()
  await loadData()
  // Otra pestaña guarda un entreno (sube la revisión).
  const other = session(2, [])
  stored.set('data', { version: 1, sessions: [other], routines: [], settings: { name: 'Ana' } })
  stored.set('rev', 5)
  // Esta, sin saberlo, apunta una medida.
  update((d) => { d.measurements.push({ id: 'm1', date: 1, weight: 80 }) })
  await flush()
  const saved = stored.get('data') as { sessions: { id: string }[]; measurements: { id: string }[] }
  assert.deepEqual(saved.sessions.map((s) => s.id), [other.id], 'el entreno de la otra pestaña no se pierde')
  assert.deepEqual(saved.measurements.map((m) => m.id), ['m1'])
  assert.equal(stored.get('rev'), 6)
  assert.equal(getData().sessions.length, 1, 'y se ve en esta pestaña')
}))
