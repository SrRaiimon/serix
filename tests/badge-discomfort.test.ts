import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyAppBadge, trainingBadge } from '../src/lib/appBadge'
import { cleanDiscomfort, discomfortZone, lastDiscomfort, lightenDiscomfort, recentDiscomfort, repeatedDiscomfort, resolveDiscomfort } from '../src/lib/discomfort'
import { DATA_VERSION, defaultSettings, getData, migrateData, replaceData, update, type AppData } from '../src/lib/store'
import { finishSession, replaceSessionExercise } from '../src/lib/workout'
import { parseBackup } from '../src/lib/backup'
import { addDays, fromKg, setWeightSteps, startOfDay, toKg } from '../src/lib/format'
import { weekdayIndex } from '../src/lib/schedule'
import { exercise, fakeIndexedDB, session, set } from './helpers'

fakeIndexedDB()
const now = new Date(2026, 9, 28, 12).getTime()
const data = (): AppData => ({ version: DATA_VERSION, routines: [], sessions: [], measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [], nutrition: { entries: [], foods: [], meals: [] }, settings: { ...defaultSettings, onboarded: true, trainingDays: [weekdayIndex(now)] } })
const episode = (days: number, zone: 'shoulder' | 'knee' = 'shoulder') => {
  const at = addDays(new Date(now), -days).getTime()
  return session(0, [exercise('bench', [set(40, 8)], { discomfort: { zone, at } })], { start: at - 3600000, end: at })
}

test('icono: toca hoy, descanso, objetivo semanal, sesión en curso y entreno terminado', () => {
  const d = data()
  assert.equal(trainingBadge(d, now), 1)
  d.settings.trainingDays = [(weekdayIndex(now) + 1) % 7]
  assert.equal(trainingBadge(d, now), 0)
  d.settings.trainingDays = undefined
  d.settings.weeklyGoal = 1
  d.sessions = [episode(1)]
  assert.equal(trainingBadge(d, now), 0)
  d.sessions = [session(0, [], { start: startOfDay(now).getTime(), end: undefined })]
  assert.equal(trainingBadge(d, now), 1)
  d.sessions[0].end = now
  assert.equal(trainingBadge(d, now), 0)
  d.sessions = [] // Descartar vuelve a calcular si aún toca hoy.
  assert.equal(trainingBadge(d, now), 1)
  d.settings.appBadge = false
  assert.equal(trainingBadge(d, now), 0)
})

test('icono: entreno empezado ayer y terminado hoy, día siguiente y bienvenida', () => {
  const d = data()
  d.sessions = [session(0, [], { start: addDays(startOfDay(now), -1).getTime(), end: now })]
  assert.equal(trainingBadge(d, now), 0)
  d.settings.weeklyGoal = 7
  d.settings.trainingDays = [weekdayIndex(addDays(new Date(now), 1))]
  assert.equal(trainingBadge(d, addDays(new Date(now), 1).getTime()), 1)
  d.settings.onboarded = false
  assert.equal(trainingBadge(d, addDays(new Date(now), 1).getTime()), 0)
})

test('icono: llama a las APIs disponibles y soporta rechazo o falta de soporte sin pedir permisos', async () => {
  const calls: number[] = []
  const api = { setAppBadge: async (n: number) => { calls.push(n) }, clearAppBadge: async () => { calls.push(0) } }
  await applyAppBadge(1, api)
  await applyAppBadge(0, api)
  assert.deepEqual(calls, [1, 0])
  await applyAppBadge(1, {})
  await applyAppBadge(0, {})
  await applyAppBadge(1, { setAppBadge: async () => { throw Error('No permitido') } })
})

test('molestias: siguiente entreno, sin avisarse a sí mismo ni depender del orden del historial', () => {
  const older = episode(7), last = episode(1)
  last.exercises[0].discomfort!.zone = 'knee'
  const current = session(0, [], { end: undefined })
  assert.equal(lastDiscomfort([older, current, last], 'bench', current.id)?.discomfort.zone, 'knee')
  assert.equal(lastDiscomfort([last], 'bench', last.id), undefined)
  assert.equal(lastDiscomfort([last], 'squat', current.id), undefined)
})

test('molestias: tres registros de la misma zona en 14 días, sin contar futuros ni el día 15', () => {
  const sessions = [episode(0), episode(5), episode(13)]
  assert.equal(repeatedDiscomfort(sessions, 'shoulder', now), true)
  assert.equal(repeatedDiscomfort([episode(0), episode(5), episode(14)], 'shoulder', now), false)
  assert.equal(repeatedDiscomfort([episode(0), episode(5, 'knee'), episode(13)], 'shoulder', now), false)
  assert.equal(repeatedDiscomfort([episode(0), episode(5), episode(-1)], 'shoulder', now), false)
})

test('molestias: ya no me molesta se guarda sin borrar el registro y un episodio nuevo vuelve a avisar', () => {
  const d = data()
  d.sessions = [episode(3), episode(1)]
  replaceData(d)
  const last = lastDiscomfort(getData().sessions, 'bench', 'actual')!
  update((draft) => resolveDiscomfort(draft.sessions, last))
  assert.equal(lastDiscomfort(getData().sessions, 'bench', 'actual'), undefined)
  assert.equal(recentDiscomfort(getData().sessions, 30, now).length, 2)
  const restored = parseBackup(JSON.stringify(getData()))
  assert.equal(lastDiscomfort(restored.sessions, 'bench', 'actual'), undefined)
  restored.sessions.push(episode(0))
  assert.ok(lastDiscomfort(restored.sessions, 'bench', 'actual'))
})

test('molestias: bajar un 10 % solo toca series pendientes; en asistidas aumenta la ayuda', () => {
  const e = exercise('bench', [set(40, 8), set(40, 8, { done: false }), set(0, 8, { done: false })])
  lightenDiscomfort(e, 'kg')
  assert.deepEqual(e.sets.map((s) => s.weight), [40, 35, 0])
  e.assisted = true
  lightenDiscomfort(e, 'kg')
  assert.deepEqual(e.sets.map((s) => s.weight), [40, 40, 0])
})

test('molestias: redondea a pesos montables en kg y lb y respeta el escalón configurado', () => {
  try {
    setWeightSteps({})
    const e = exercise('bench', [set(60, 8, { done: false }), set(2.5, 8, { done: false })])
    lightenDiscomfort(e, 'kg')
    assert.deepEqual(e.sets.map((s) => s.weight), [52.5, 0])
    e.sets = [set(toKg(60, 'lb'), 8, { done: false })]
    lightenDiscomfort(e, 'lb')
    assert.ok(Math.abs(fromKg(e.sets[0].weight, 'lb') - 50) < 1e-8)
    setWeightSteps({ kg: 5 })
    e.sets = [set(60, 8, { done: false })]
    lightenDiscomfort(e, 'kg')
    assert.equal(e.sets[0].weight, 50)
    e.assisted = true
    e.sets = [set(2.5, 8, { done: false }), set(60, 8, { done: false })]
    lightenDiscomfort(e, 'kg')
    assert.deepEqual(e.sets.map((s) => s.weight), [5, 70])
  } finally {
    setWeightSteps({})
  }
})

test('molestias: las etiquetas van sin artículo y el aviso conserva la frase natural', () => {
  assert.equal(discomfortZone('shoulder'), 'Hombro')
  assert.equal(discomfortZone('lowerBack'), 'Zona lumbar')
  assert.equal(discomfortZone('other'), 'Otra zona')
  assert.equal(discomfortZone('shoulder', true), 'el hombro')
})

test('molestias recientes: últimos 30 días, incluidos resueltos y con fechas locales', () => {
  assert.equal(recentDiscomfort([episode(0), episode(29), episode(30), episode(-1)], 30, now).length, 2)
})

test('compatibilidad: mantiene la versión 1, activa el icono por defecto y conserva las molestias antiguas', () => {
  const old = { version: 1, routines: [], settings: { name: 'Ana' }, sessions: [session(0, [exercise('bench', [set(40, 8)], { pain: 5, painNote: 'hombro' })])] }
  const d = migrateData(old)
  assert.ok(d && d !== 'newer')
  assert.equal(DATA_VERSION, 1)
  assert.equal(d.version, 1)
  assert.equal(d.settings.appBadge, true)
  assert.equal(d.sessions[0].exercises[0].pain, 5)
  assert.equal(d.sessions[0].exercises[0].discomfort, undefined)
  assert.deepEqual(old.settings, { name: 'Ana' })
  assert.equal(parseBackup(JSON.stringify({ ...old, settings: { appBadge: false } })).settings.appBadge, false)
})

test('copia y carga: conserva zona, lado y resolución; descarta zonas o fechas inválidas', () => {
  const d = data()
  d.settings.appBadge = false
  d.sessions = [episode(1)]
  d.sessions[0].exercises[0].discomfort = { zone: 'shoulder', side: 'left', at: now, resolved: true }
  const restored = parseBackup(JSON.stringify(d))
  assert.equal(restored.version, 1)
  assert.deepEqual(restored.sessions[0].exercises[0].discomfort, d.sessions[0].exercises[0].discomfort)
  assert.equal(restored.settings.appBadge, false)
  for (const bad of [{ zone: 'inventada', at: now }, { zone: 'shoulder', at: null }, { zone: 'shoulder', at: NaN }]) {
    assert.equal(cleanDiscomfort(bad), undefined)
    const raw = { ...d, sessions: [{ ...d.sessions[0], exercises: [{ ...d.sessions[0].exercises[0], discomfort: bad }] }] }
    assert.equal(parseBackup(JSON.stringify(raw)).sessions[0].exercises[0].discomfort, undefined)
    const loaded = migrateData(raw)
    assert.ok(loaded && loaded !== 'newer')
    assert.equal(loaded.sessions[0].exercises[0].discomfort, undefined)
  }
  assert.deepEqual(cleanDiscomfort({ zone: 'knee', side: 'inventado', at: now, resolved: 'sí' }), { zone: 'knee', at: now })
})

test('molestias: cambiar el ejercicio conserva la zona original aunque no se marcara ninguna serie', () => {
  const d = data()
  const e = exercise('bench', [set(40, 8, { done: false })], { discomfort: { zone: 'shoulder', at: now } })
  d.sessions = [session(0, [e, exercise('row', [set(40, 8)])], { end: undefined })]
  replaceData(d)
  replaceSessionExercise(d.sessions[0].id, e.id, {
    id: 'pushup', name: 'Flexiones', nameEs: 'Flexiones', nameEn: 'Push-ups', muscle: 'chest',
    bodyPart: 'upper arms', equipment: 'bodyweight', category: 'strength', level: 'beginner', secondaryMuscles: [], instructions: [],
  })
  const swapped = getData().sessions[0].exercises
  assert.equal(swapped[0].discomfort?.zone, 'shoulder')
  assert.equal(swapped[0].sets.length, 0)
  assert.equal(swapped[1].exerciseId, 'pushup')
  assert.equal(swapped[1].discomfort, undefined)
  finishSession(d.sessions[0].id)
  assert.equal(getData().sessions[0].exercises[0].discomfort?.zone, 'shoulder')
  assert.equal(getData().sessions[0].exercises[0].sets.length, 0)
})
