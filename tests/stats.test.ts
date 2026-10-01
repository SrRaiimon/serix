import assert from 'node:assert/strict'
import { test } from 'node:test'
import { e1rm, lastSets, monthToDate, muscleRecovery, newRecords, progressionHint, recoveryHours, records, sessionSets, sessionVolume, stall, stalls } from '../src/lib/stats'
import { DAY, T0, exercise, session, set } from './helpers'

test('1RM estimado (Epley)', () => {
  assert.equal(e1rm(100, 1), 100)
  assert.ok(Math.abs(e1rm(100, 10) - 133.333) < 0.001)
  assert.equal(e1rm(0, 5), 0)
  assert.equal(e1rm(100, 0), 0)
})

test('volumen y series: sin calentamiento ni series sin marcar', () => {
  const s = session(0, [exercise('bench', [set(40, 10, { warmup: true }), set(80, 8), set(80, 8), set(80, 8, { done: false })])])
  assert.equal(sessionSets(s), 2)
  assert.equal(sessionVolume(s), 1280)
})

test('récords: la mejor serie por 1RM estimado', () => {
  const list = records([
    session(0, [exercise('bench', [set(80, 8), set(100, 1, { warmup: true })])]),
    session(7, [exercise('bench', [set(85, 6)])]),
  ])
  assert.equal(list.length, 1)
  assert.equal(list[0].weight, 85)
  assert.equal(list[0].reps, 6)
})

test('récords nuevos solo frente a sesiones anteriores', () => {
  const first = session(0, [exercise('bench', [set(80, 8)])])
  const second = session(7, [exercise('bench', [set(82.5, 8)]), exercise('squat', [set(100, 5)])])
  const all = [second, first]
  // squat es su primera vez: no es «récord batido».
  assert.deepEqual(newRecords(second, all).map((r) => r.exerciseId), ['bench'])
  assert.deepEqual(newRecords(first, all), [])
})

test('última vez: la más reciente y saltando descargas', () => {
  const normal = session(0, [exercise('bench', [set(80, 8)])])
  const deload = session(7, [exercise('bench', [set(72.5, 8)], { deload: true })])
  const newestFirst = [deload, normal]
  assert.equal(lastSets('bench', newestFirst)[0].weight, 80)
  assert.deepEqual(lastSets('squat', newestFirst), [])
})

test('sugerencia de subir peso', () => {
  assert.equal(progressionHint([set(80, 12), set(80, 12)], 12), 'reps')
  assert.equal(progressionHint([set(80, 12), set(80, 10)], 12), null)
  assert.equal(progressionHint([set(80, 12, { rpe: 10 }), set(80, 12)], 12), null)
  assert.equal(progressionHint([set(80, 9, { rpe: 7 }), set(80, 9, { rpe: 6 })], 12), 'easy')
  assert.equal(progressionHint([set(80, 9, { rpe: 7 }), set(80, 9)], 12), null)
  assert.equal(progressionHint([], 12), null)
  assert.equal(progressionHint([set(0, 12)], 12), null)
})

test('sugerencia: los drop sets no cuentan y al fallo es RPE 10', () => {
  assert.equal(progressionHint([set(80, 12), set(80, 12), set(60, 6, { kind: 'drop' })], 12), 'reps')
  assert.equal(progressionHint([set(80, 12), set(80, 12, { kind: 'failure' })], 12), null)
  assert.equal(progressionHint([set(80, 12), set(80, 14, { kind: 'amrap' })], 12), 'reps')
})

const bench = (day: number, weight: number, reps: number, extra = {}) => session(day, [exercise('bench', [set(weight, reps)], extra)])

test('estancamiento: tres sesiones sin superar la mejor marca', () => {
  const history = [bench(0, 100, 5), bench(7, 100, 5), bench(14, 97.5, 5), bench(21, 100, 4)]
  const s = stall('bench', history)
  assert.ok(s)
  assert.ok(Math.abs(s.best - e1rm(100, 5)) < 1e-9)
  assert.equal(s.last, T0 + 21 * DAY)
})

test('estancamiento: hacen falta datos de antes y no hay si se mejora', () => {
  assert.equal(stall('bench', [bench(0, 100, 5), bench(7, 100, 5), bench(14, 100, 5)]), undefined)
  assert.equal(stall('bench', [bench(0, 100, 5), bench(7, 100, 5), bench(14, 100, 5), bench(21, 100, 6)]), undefined)
  assert.equal(stall('squat', [bench(0, 100, 5)]), undefined)
})

test('estancamiento: los drop sets no cuentan como mejora', () => {
  const history = [bench(0, 100, 5), bench(7, 100, 5), bench(14, 100, 5),
    session(21, [exercise('bench', [set(100, 5), set(90, 9, { kind: 'drop' })])])]
  assert.ok(stall('bench', history))
})

test('estancamiento: tras una descarga la cuenta vuelve a empezar', () => {
  const base = [bench(0, 100, 5), bench(7, 100, 5), bench(14, 100, 5), bench(21, 100, 5)]
  const deload = bench(28, 90, 5, { deload: true })
  assert.ok(stall('bench', base))
  assert.equal(stall('bench', [...base, deload]), undefined)
  assert.equal(stall('bench', [...base, deload, bench(35, 100, 5), bench(42, 100, 5)]), undefined)
  assert.ok(stall('bench', [...base, deload, bench(35, 100, 5), bench(42, 100, 5), bench(49, 100, 5)]))
  // El orden de entrada da igual.
  assert.ok(stall('bench', [bench(49, 100, 5), deload, ...base, bench(35, 100, 5), bench(42, 100, 5)]))
})

test('estancados: solo los hechos desde la fecha indicada', () => {
  const history = [bench(0, 100, 5), bench(7, 100, 5), bench(14, 100, 5), bench(21, 100, 5)]
  assert.equal(stalls(history, T0 + 20 * DAY).length, 1)
  assert.equal(stalls(history, T0 + 22 * DAY).length, 0)
})

test('mes en curso frente al mismo tramo del anterior', () => {
  const at = (m: number, d: number) => {
    const start = new Date(2026, m, d, 12).getTime()
    return session(0, [exercise('bench', [set(100, 5)])], { start, end: start + 3600000 })
  }
  const list = [at(0, 3), at(0, 20), at(1, 2), at(1, 9)]
  const { current, previous } = monthToDate(list, new Date(2026, 1, 10, 9))
  assert.equal(current.sessions, 2)
  // Del mes anterior solo cuenta hasta el día 10 (el 20 de enero queda fuera).
  assert.equal(previous.sessions, 1)
  assert.equal(current.volume, 1000)
})

test('recuperación: más volumen, más horas; el último entrenamiento manda', () => {
  assert.equal(recoveryHours(2), 48)
  assert.equal(recoveryHours(8), 68)
  assert.equal(recoveryHours(30), 96)
  const now = T0 + 10 * DAY
  const secondary = (id: string) => (id === 'bench' ? ['triceps'] : [])
  const at = (daysAgo: number, ex: ReturnType<typeof exercise>[]) => {
    const start = now - daysAgo * DAY
    return session(0, ex, { start, end: start })
  }
  const list = muscleRecovery([
    at(1, [exercise('bench', [set(80, 8), set(80, 8), set(80, 8), set(80, 8)], { muscle: 'pectorals' })]),
    at(5, [exercise('bench', [set(80, 8)], { muscle: 'pectorals' }), exercise('squat', [set(100, 5), set(100, 5)], { muscle: 'quads' })]),
  ], secondary, now)
  const by = Object.fromEntries(list.map((r) => [r.muscle, r]))
  // Pecho: el de ayer (4 series → 52 h); lleva 24 h → 46 %.
  assert.equal(by.pectorals.sets, 4)
  assert.ok(Math.abs(by.pectorals.ready - 24 / 52) < 1e-9)
  // Tríceps como secundario: 4 × 0,5 = 2 series.
  assert.equal(by.triceps.sets, 2)
  // Piernas hace 5 días: recuperadas.
  assert.equal(by.quads.ready, 1)
})
