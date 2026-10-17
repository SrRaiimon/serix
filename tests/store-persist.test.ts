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

test('varias pestañas: rutinas y notas también a tres bandas', () => {
  const r = (id: string, name: string) => ({ id, name, notes: '', order: 0, createdAt: 0, exercises: [] })
  const base = migrateData({ version: 1, sessions: [], routines: [r('a', 'Torso'), r('b', 'Pierna')], exerciseNotes: { bench: 'agarre medio' }, settings: {} })
  assert.ok(base && base !== 'newer')
  const theirs = structuredClone({ ...base, routines: [r('a', 'Torso A'), base.routines[1]], exerciseNotes: { bench: 'agarre medio', squat: 'barra baja' } })
  const ours = { ...base, routines: [base.routines[0]] } // aquí se borra «Pierna»
  const merged = mergeData(theirs, ours, base)
  assert.deepEqual(merged.routines.map((x) => x.name), ['Torso A'], 'el cambio de nombre de allí y el borrado de aquí')
  assert.deepEqual(merged.exerciseNotes, { bench: 'agarre medio', squat: 'barra baja' })
})

test('varias pestañas: si otra pestaña guardó con una versión más nueva, no se escribe encima', serial(async () => {
  const stored = fakeIndexedDB()
  stored.set('data', { version: 1, sessions: [], routines: [], settings: {} })
  forgetDB()
  await loadData()
  stored.set('data', { version: DATA_VERSION + 1, sessions: [], routines: [], settings: {}, futuro: true })
  stored.set('rev', 9)
  update((d) => { d.settings.name = 'Vieja' })
  await flush()
  assert.equal((stored.get('data') as { futuro?: boolean }).futuro, true, 'lo de la versión nueva sigue intacto')
  assert.equal(storageProblem()?.kind, 'newer')
  // Restaurar una copia vuelve a permitir guardar (y deja el estado limpio para los demás tests).
  stored.delete('data'); stored.delete('rev')
  forgetDB()
  await loadData()
  await replaceData({ ...getData(), sessions: [] })
}))

test('varias pestañas: los amigos se juntan con la misma regla que la interfaz (sin tildes)', () => {
  const base = migrateData({ version: 1, sessions: [], routines: [], friends: [], settings: {} })
  assert.ok(base && base !== 'newer')
  const merged = mergeData({ ...base, friends: [{ name: 'José' } as never] }, { ...base, friends: [{ name: 'jose ' } as never] }, base)
  assert.equal(merged.friends.length, 1)
})

test('varias pestañas: un duplicado que ya traía una lista no se arrastra al juntar', () => {
  const base = migrateData({ version: 1, sessions: [], routines: [], friends: [], settings: {} })
  assert.ok(base && base !== 'newer')
  const ours = { ...base, friends: [{ name: 'José' }, { name: 'jose' }, { name: 'Ana' }] as never[] }
  const theirs = { ...base, friends: [{ name: 'ANA' }, { name: 'Ana ' }, { name: 'Luis' }] as never[] }
  const names = mergeData(theirs, ours, base).friends.map((f) => (f as { name: string }).name)
  assert.deepEqual(names, ['José', 'Ana', 'Luis'])
})
