import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bodyweightAt, BODYWEIGHT_LIFTS } from '../src/lib/bodyweight'
import { e1rm, exerciseHistory, loadSets, records, sessionVolume, workingSets } from '../src/lib/stats'
import { defaultSettings } from '../src/lib/store'
import { DAY, exercise, session, set, T0 } from './helpers'

test('dominadas: marcas y peso movido con el peso corporal; lo apuntado no cambia', () => {
  const e = exercise('Pullups', [set(10, 8), set(0, 10)], { bodyweight: 80 })
  assert.deepEqual(workingSets(e).map((x) => x.weight), [10, 0])
  assert.deepEqual(loadSets(e).map((x) => x.weight), [90, 80])
  const s = session(0, [e])
  assert.equal(sessionVolume(s), 90 * 8 + 80 * 10)
  assert.equal(records([s])[0].weight, 90)
  assert.equal(records([s])[0].added, 10)
  assert.equal(records([session(0, [exercise('Pullups', [set(25, 8)], { bodyweight: 80, assisted: true })])])[0].added, -25)
  assert.equal(records([session(0, [exercise('Bench', [set(60, 8)])])])[0].added, undefined)
  assert.equal(Math.round(records([s])[0].e1rm), Math.round(e1rm(90, 8)))
})

test('dominadas asistidas: la ayuda se resta del peso corporal', () => {
  const e = exercise('Pullups', [set(25, 8)], { bodyweight: 80, assisted: true })
  assert.deepEqual(loadSets(e).map((x) => x.weight), [55])
  // Sin peso corporal conocido, como antes: la ayuda no cuenta como carga.
  assert.deepEqual(loadSets(exercise('Pullups', [set(25, 8)], { assisted: true })).map((x) => x.weight), [0])
})

test('dominadas sin lastre: ahora tienen 1RM y evolución (antes, con 0 kg, no contaban)', () => {
  const sessions = [6, 8, 10].map((reps, i) => session(i * 3, [exercise('Pullups', [set(0, reps)], { bodyweight: 80 })]))
  const points = exerciseHistory('Pullups', sessions)
  assert.equal(points.length, 3)
  assert.ok(points[0].e1rm > 0 && points[2].e1rm > points[0].e1rm)
  assert.equal(exerciseHistory('Pullups', [session(0, [exercise('Pullups', [set(0, 8)])])])[0].e1rm, 0)
})

test('peso corporal de una fecha: medida de antes, si no la de después, si no el del objetivo', () => {
  const d = {
    measurements: [{ id: 'a', date: T0 + 10 * DAY, weight: 81 }, { id: 'b', date: T0 + 20 * DAY, weight: 79 }],
    settings: { ...defaultSettings, nutrition: { kcal: 2500, protein: 150, carbs: 300, fat: 70, weightKg: 85 } },
  }
  assert.equal(bodyweightAt(d, T0 + 15 * DAY), 81)
  assert.equal(bodyweightAt(d, T0 + 25 * DAY), 79)
  assert.equal(bodyweightAt(d, T0), 81)
  assert.equal(bodyweightAt({ ...d, measurements: [] }, T0), 85)
  assert.equal(bodyweightAt({ measurements: [], settings: defaultSettings }, T0), undefined)
})

test('solo cuentan ejercicios de todo el cuerpo (no fondos en banco ni dominadas escapulares)', () => {
  assert.ok(BODYWEIGHT_LIFTS.has('Pullups') && BODYWEIGHT_LIFTS.has('Parallel_Bar_Dip'))
  assert.ok(!BODYWEIGHT_LIFTS.has('Bench_Dips') && !BODYWEIGHT_LIFTS.has('Scapular_Pull-Up'))
})
