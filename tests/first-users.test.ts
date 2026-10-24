import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultSettings, getData, migrateData, replaceData, resetData, update, type Session } from '../src/lib/store'
import { saveProgram } from '../src/lib/programs'
import type { GeneratedProgram } from '../src/lib/generator'
import { parseDecimal, startOfDay } from '../src/lib/format'
import { suspicious, suspiciousTimed } from '../src/lib/tracking'
import { dueToday, weekdayIndex } from '../src/lib/schedule'
import { fakeIndexedDB, session, set } from './helpers'

fakeIndexedDB()

const reset = (sessions: Session[]) => replaceData({
  version: 1, routines: [], measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [],
  nutrition: { entries: [], foods: [], meals: [] }, sessions,
  settings: { ...defaultSettings, onboarded: true },
})

const program: GeneratedProgram = {
  name: 'Primer programa',
  summary: 'Dos días de entrenamiento',
  days: ['Día A', 'Día B'].map((name) => ({
    name,
    exercises: [{
      exercise: {
        id: 'Barbell_Squat', name: 'Sentadilla', nameEs: 'Sentadilla', nameEn: 'Barbell Squat',
        muscle: 'quads', bodyPart: 'upper legs', equipment: 'barbell', category: 'strength',
        level: 'beginner', secondaryMuscles: [], instructions: [],
      },
      sets: 3, repsMin: 8, repsMax: 12, rest: 90,
    }],
  })),
}

test('borrar los datos conserva las preferencias del dispositivo y elimina el perfil y los entrenos', async () => {
  const now = Date.now()
  await reset([session(0, [], { start: startOfDay(now).getTime(), end: now })])
  saveProgram(program)
  update((d) => {
    Object.assign(d.settings, {
      name: 'Persona de prueba', nutrition: { kcal: 2200, protein: 130, carbs: 250, fat: 70 },
      weightGoal: { kg: 75, from: 82, createdAt: now }, trainingDays: [0, 2, 4],
      language: 'en', theme: 'dark', textScale: 1.12, unit: 'lb', onboarded: false,
    })
    d.measurements.push({ id: 'medida', date: now, weight: 82 })
  })
  await resetData()
  const d = getData()
  assert.equal(d.settings.language, 'en')
  assert.equal(d.settings.theme, 'dark')
  assert.equal(d.settings.textScale, 1.12)
  assert.equal(d.settings.unit, 'lb')
  assert.equal(d.settings.onboarded, true)
  assert.equal(d.settings.name, '')
  assert.equal(d.settings.nutrition, undefined)
  assert.equal(d.settings.weightGoal, undefined)
  assert.equal(d.settings.trainingDays, undefined)
  assert.deepEqual(d.sessions, [])
  assert.deepEqual(d.routines, [])
  assert.deepEqual(d.measurements, [])
})

test('guardar dos programas con el mismo nombre separa el segundo y conserva los días del primero', async () => {
  await reset([])
  saveProgram(program)
  const first = structuredClone(getData().routines)
  assert.equal(first.length, 2)
  assert.ok(first.every((r) => r.programName === program.name))
  saveProgram(program)
  const d = getData()
  assert.equal(d.routines.length, 4)
  assert.deepEqual(d.routines.filter((r) => r.programName === program.name), first)
  const second = d.routines.filter((r) => r.programName === `${program.name} (2)`)
  assert.equal(second.length, 2)
  assert.deepEqual(second.map((r) => r.name), program.days.map((day) => day.name))
  assert.deepEqual(second.map((r) => r.exercises), first.map((r) => r.exercises))
  assert.equal(new Set(d.routines.map((r) => r.id)).size, 4)
  assert.equal(d.settings.activeProgram, `${program.name} (2)`)
})

test('los decimales admiten coma, punto, signo negativo y espacios', () => {
  for (const [text, expected] of [['82,5', 82.5], ['82.5', 82.5], ['-3', -3], ['.5', 0.5], [' 12 ', 12]] as const) {
    assert.equal(parseDecimal(text), expected, text)
  }
})

test('los decimales rechazan exponentes, hexadecimal, valores no finitos y texto inválido', () => {
  for (const text of ['1e9', '0x10', 'Infinity', 'NaN', 'abc', '', '12,5,3']) {
    assert.equal(parseDecimal(text), null, text)
  }
})

test('una serie con peso y repeticiones sospechosos muestra las dos dudas juntas', async () => {
  await reset([])
  update((d) => { d.settings.language = 'es' })
  const message = suspicious(set(500, 200), 0, 'kg')
  assert.ok(message)
  assert.match(message, /500 kg/)
  assert.match(message, /200 repeticiones/)
})

test('las series por tiempo avisan de 150 km y de 5 horas, también cuando coinciden', async () => {
  await reset([])
  update((d) => { d.settings.language = 'es' })
  assert.match(suspiciousTimed(set(0, 0, { distance: 150, duration: 3000 })) ?? '', /150 km/)
  assert.match(suspiciousTimed(set(0, 0, { distance: 10, duration: 5 * 3600 })) ?? '', /5 horas/)
  const both = suspiciousTimed(set(0, 0, { distance: 150, duration: 5 * 3600 }))
  assert.ok(both)
  assert.match(both, /150 km/)
  assert.match(both, /5 horas/)
  assert.equal(suspiciousTimed(set(0, 0, { distance: 10, duration: 50 * 60 })), undefined)
})

test('hoy no toca entrenar si ya hay una sesión terminada hoy aunque sea día de entreno', () => {
  const now = Date.now()
  assert.equal(dueToday({
    sessions: [{ start: startOfDay(now).getTime(), end: now }],
    settings: { weeklyGoal: 3, trainingDays: [weekdayIndex(now)] },
  }, now), false)
})

test('hoy no toca entrenar si queda fuera de los días elegidos aunque falten entrenos semanales', () => {
  const now = Date.now()
  assert.equal(dueToday({
    sessions: [], settings: { weeklyGoal: 3, trainingDays: [(weekdayIndex(now) + 1) % 7] },
  }, now), false)
})

test('hoy toca entrenar si es un día elegido, no has terminado un entreno y la semana está pendiente', () => {
  const now = Date.now()
  const settings = { weeklyGoal: 3, trainingDays: [weekdayIndex(now)] }
  assert.equal(dueToday({ sessions: [], settings }, now), true)
  assert.equal(dueToday({ sessions: [{ start: startOfDay(now).getTime() }], settings }, now), true)
})

for (const date of [null, NaN]) {
  test(`migrar descarta una medida con fecha ${String(date)} y conserva la válida`, () => {
    const valid = { id: 'válida', date: Date.now(), weight: 82.5 }
    const migrated = migrateData({
      version: 1, measurements: [{ id: 'inválida', date, weight: 90 }, valid],
    })
    assert.ok(migrated && migrated !== 'newer')
    assert.deepEqual(migrated.measurements, [valid])
  })
}
