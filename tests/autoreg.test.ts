import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lastPain, loadSuggestion, targetRpe, weeklyGroupSets, weeklyRange } from '../src/lib/autoreg'
import { DAY, exercise, session, set, T0 } from './helpers'

const kg = 'kg' as const

test('RPE previsto: 8 sin bloque, 10 − RIR con bloque', () => {
  assert.equal(targetRpe(undefined), 8)
  const monday = new Date(2026, 0, 5, 10).getTime()
  assert.equal(targetRpe({ start: monday, weeks: 5 }, monday), 7) // semana 1: RIR 3
  assert.equal(targetRpe({ start: monday, weeks: 5 }, monday + 3 * 7 * DAY), 9) // semana 4: RIR 1
  assert.equal(targetRpe({ start: monday, weeks: 5 }, monday + 4 * 7 * DAY), 8) // descarga: sin RIR
})

test('autorregulación: costó de más → bajar las que quedan con ese peso', () => {
  const e = exercise('bench', [set(100, 5, { rpe: 10 }), set(100, 5, { done: false }), set(100, 5, { done: false }), set(80, 8, { done: false, kind: 'drop' })])
  const s = loadSuggestion(e, 8, kg)!
  assert.equal(s.to, 92.5) // −8 % → 92 → redondeado a 92,5
  assert.equal(s.apply.length, 2) // el drop set no
  assert.equal(loadSuggestion(e, 9, kg)?.to, 95) // un punto: −4 %
})

test('autorregulación: sobró fuerza → subir con prudencia (máx. +5 %)', () => {
  const e = exercise('bench', [set(100, 5, { rpe: 6 }), set(100, 5, { done: false })])
  assert.equal(loadSuggestion(e, 8, kg)?.to, 105)
})

test('autorregulación: sin propuesta si va según lo previsto o no aplica', () => {
  assert.equal(loadSuggestion(exercise('b', [set(100, 5, { rpe: 8.5 }), set(100, 5, { done: false })]), 8, kg), undefined)
  assert.equal(loadSuggestion(exercise('b', [set(100, 5), set(100, 5, { done: false })]), 8, kg), undefined) // sin RPE
  assert.equal(loadSuggestion(exercise('b', [set(100, 5, { rpe: 10 })]), 8, kg), undefined) // no quedan series
  assert.equal(loadSuggestion(exercise('b', [set(100, 5, { rpe: 10 }), set(100, 5, { done: false })], { deload: true }), 8, kg), undefined)
  assert.equal(loadSuggestion(exercise('b', [set(100, 5, { rpe: 10 }), set(90, 5, { done: false })]), 8, kg), undefined) // ya cambió el peso
})

test('series semanales por grupo: secundarios a media serie y solo 7 días', () => {
  const now = T0 + 10 * DAY
  const sessions = [
    session(9, [exercise('bench', [set(80, 8), set(80, 8), set(80, 8)], { muscle: 'pectorals' })]),
    session(1, [exercise('bench', [set(80, 8)], { muscle: 'pectorals' })]), // hace 9 días
  ]
  const groups = weeklyGroupSets(sessions, (id) => (id === 'bench' ? ['triceps', 'delts'] : []), now)
  const get = (es: string) => groups.find((g) => g.name[0] === es)!.sets
  assert.equal(get('Pecho'), 3)
  assert.equal(get('Tríceps'), 1.5)
  assert.equal(get('Hombros'), 1.5)
  assert.deepEqual(weeklyRange('hypertrophy'), [10, 20])
})

test('molestias: se recuerda la de la última vez que se hizo el ejercicio', () => {
  const history = [ // de más reciente a más antigua
    session(5, [exercise('row', [set(60, 10)])]),
    session(3, [exercise('bench', [set(80, 8)], { pain: 6, painNote: 'hombro' })]),
    session(1, [exercise('bench', [set(80, 8)], { pain: 2 })]),
  ]
  assert.deepEqual(lastPain('bench', history), { pain: 6, date: history[1].start, note: 'hombro' })
  // Si la última vez fue bien, ya no se avisa.
  const better = [session(6, [exercise('bench', [set(80, 8)])]), ...history]
  assert.equal(lastPain('bench', better), undefined)
  assert.equal(lastPain('squat', history), undefined)
})
