import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sessionKcal } from '../src/lib/burn'
import { buildSegments } from '../src/lib/intervals'
import { dayGoalOptions, dayKey, goalsForDay } from '../src/lib/nutrition'
import { lighten, readinessLevel } from '../src/lib/readiness'
import { photoDue, weighDue } from '../src/lib/reminders'
import { trainingCalendar } from '../src/lib/schedule'
import { compareWithLast } from '../src/lib/stats'
import { defaultSettings } from '../src/lib/store'
import { DAY, exercise, session, set, T0 } from './helpers'

test('frente a la última vez: misma rutina, mejor serie de cada ejercicio, duración y peso movido', () => {
  const before = session(0, [exercise('Squat', [set(100, 5)]), exercise('Bench', [set(80, 8)]), exercise('Plank', [set(0, 0, { duration: 45 })])], { routineId: 'r1', end: T0 + 70 * 60000 })
  const now = session(3, [exercise('Squat', [set(105, 5)]), exercise('Bench', [set(80, 10)]), exercise('Plank', [set(0, 0, { duration: 60 })]), exercise('Curl', [set(15, 10)])], { routineId: 'r1' })
  const other = session(2, [exercise('Squat', [set(200, 5)])], { routineId: 'r2' })
  const c = compareWithLast(now, [before, other, now])!
  assert.equal(c.previous.id, before.id)
  assert.deepEqual(c.exercises.map((x) => [x.exerciseId, x.kind, x.delta]), [['Squat', 'weight', 5], ['Bench', 'reps', 2], ['Plank', 'time', 15]])
  assert.equal(Math.round(c.duration / 60000), -10)
  assert.equal(compareWithLast(before, [before, now]), undefined)
})

test('calorías del entreno: MET × peso × horas, más con cardio', () => {
  const weights = { start: 0, end: 3600000, exercises: [{}, {}] }
  assert.equal(sessionKcal(weights, 80), 400)
  assert.equal(sessionKcal({ ...weights, exercises: [{ tracking: 'distance_time' as const }] }, 80), 560)
  assert.equal(sessionKcal(weights, undefined), 0)
})

test('objetivo según lo que gastas: los días de entreno suman sus calorías; los de descanso, nada', () => {
  const goals = { kcal: 2500, protein: 150, carbs: 300, fat: 70 }
  const s = session(0, [exercise('Squat', [set(100, 5)])])
  const opts = dayGoalOptions({ sessions: [s], nutrition: {}, measurements: [{ date: T0 - DAY, weight: 80 }], settings: { ...defaultSettings, nutritionBurned: true } })
  assert.equal(goalsForDay(goals, [], dayKey(s.start), opts).kcal, 2500 + 400)
  assert.equal(goalsForDay(goals, [], dayKey(s.start + DAY), opts).kcal, 2500)
})

test('calendario: evento semanal en los días elegidos, con aviso', () => {
  const ics = trainingCalendar([0, 2, 4], '18:30', 'Entrenar', 'Hoy toca', new Date(2026, 9, 8, 12))
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\r\n/)
  assert.match(ics, /DTSTART:20261009T183000\r\n/) // jueves 8 → el viernes 9
  assert.match(ics, /TRIGGER:-PT15M/)
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.trimEnd().endsWith('END:VCALENDAR'))
})

test('recordatorios: pesarse cada semana y fotos cada 4 semanas', () => {
  const now = T0
  const settings = { ...defaultSettings }
  assert.equal(weighDue({ measurements: [], settings }, now), false)
  assert.equal(weighDue({ measurements: [], settings: { ...settings, nutrition: { kcal: 2500, protein: 150, carbs: 300, fat: 70 } } }, now), true)
  assert.equal(weighDue({ measurements: [{ id: 'a', date: now - 3 * DAY, weight: 80 }], settings }, now), false)
  assert.equal(weighDue({ measurements: [{ id: 'a', date: now - 8 * DAY, weight: 80 }], settings }, now), true)
  assert.equal(weighDue({ measurements: [{ id: 'a', date: now - 8 * DAY, weight: 80 }], settings: { ...settings, weighSnooze: now + DAY } }, now), false)
  assert.equal(photoDue({ settings }, now), false)
  assert.equal(photoDue({ settings: { ...settings, lastPhotoAt: now - 20 * DAY } }, now), false)
  assert.equal(photoDue({ settings: { ...settings, lastPhotoAt: now - 30 * DAY } }, now), true)
})

test('cómo estás hoy: nota y aligerar un 10 % lo pendiente', () => {
  assert.equal(readinessLevel({ sleep: 1, energy: 2, soreness: 5 }), 'low')
  assert.equal(readinessLevel({ sleep: 5, energy: 5, soreness: 1 }), 'high')
  assert.equal(readinessLevel({ sleep: 3, energy: 3, soreness: 3 }), 'ok')
  const s = session(0, [exercise('Squat', [set(100, 5), set(100, 5, { done: false }), set(0, 10, { done: false })])])
  lighten(s, 'kg')
  assert.deepEqual(s.exercises[0].sets.map((x) => x.weight), [100, 90, 0])
})

test('vuelta a la calma: estiramientos guiados con su indicación', () => {
  const segs = buildSegments({ mode: 'cooldown', work: 40, rest: 5, rounds: 6, prep: 5, focus: 'legs' })
  const work = segs.filter((x) => x.kind === 'work')
  assert.equal(work.length, 6)
  assert.ok(work.every((x) => x.label && x.cue && x.seconds === 40))
})
