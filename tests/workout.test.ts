import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyDeload, prefillSets, previewRoutine, withWarmup } from '../src/lib/workout'
import { migrateData, type SetEntry } from '../src/lib/store'
import { rememberEquipment } from '../src/lib/progression'
import { exercise, session, set } from './helpers'

const shape = (sets: SetEntry[]) => sets.map((s) => `${s.weight}x${s.reps}${s.kind ? ':' + s.kind : ''}${s.done ? '✓' : ''}`)

test('rellenar series con lo de la última vez', () => {
  assert.deepEqual(shape(prefillSets(3, [set(80, 10), set(80, 9), set(80, 8)])), ['80x10', '80x9', '80x8'])
  // Más series que la última vez: se repite la última.
  assert.deepEqual(shape(prefillSets(4, [set(80, 10), set(80, 9)])), ['80x10', '80x9', '80x9', '80x9'])
  assert.deepEqual(shape(prefillSets(2, [])), ['0x0', '0x0'])
  assert.ok(prefillSets(2, [set(80, 10)]).every((s) => !s.done && !s.warmup && !s.doneAt))
})

test('rellenar: los drop sets siguen a su serie y no cuentan como series', () => {
  const last = [set(80, 10), set(80, 9), set(60, 8, { kind: 'drop' }), set(45, 8, { kind: 'drop' })]
  assert.deepEqual(shape(prefillSets(2, last)), ['80x10', '80x9', '60x8:drop', '45x8:drop'])
  // La serie extra no repite los drop sets.
  assert.deepEqual(shape(prefillSets(3, last)), ['80x10', '80x9', '60x8:drop', '45x8:drop', '80x9'])
  assert.deepEqual(shape(prefillSets(2, [set(80, 10, { kind: 'amrap' }), set(80, 8, { kind: 'failure' })])), ['80x10:amrap', '80x8:failure'])
})

test('rellenar: un drop set sin serie delante se copia como normal', () => {
  assert.deepEqual(shape(prefillSets(1, [set(60, 8, { kind: 'drop' })])), ['60x8'])
})

test('descarga: ~60 % de las series pendientes y −10 % de peso', () => {
  const e = exercise('bench', [
    set(40, 10, { warmup: true, done: false }),
    set(100, 5), // ya hecha: no se toca
    set(100, 5, { done: false }), set(100, 5, { done: false }), set(100, 5, { done: false, kind: 'failure' }),
    set(100, 5, { done: false }), set(80, 8, { done: false, kind: 'drop' }),
  ])
  applyDeload(e, 'kg')
  assert.equal(e.deload, true)
  // 4 pendientes → quedan 2; el calentamiento y la hecha se conservan; fuera el drop set.
  assert.deepEqual(shape(e.sets), ['40x10', '100x5✓', '90x5', '90x5'])
})

test('descarga: redondea al incremento y deja al menos una serie', () => {
  const e = exercise('bench', [set(62.5, 8, { done: false })])
  applyDeload(e, 'kg')
  assert.deepEqual(shape(e.sets), ['57.5x8']) // 56,25 → 57,5
})

test('calentamiento automático: solo en el primer ejercicio pesado, igual en el detalle y al empezar', () => {
  rememberEquipment([{ id: 'Barbell_Bench_Press_-_Medium_Grip', equipment: 'barbell' }, { id: 'Barbell_Full_Squat', equipment: 'barbell' }, { id: 'Hammer_Curls', equipment: 'dumbbell' }])
  const base = migrateData({ version: 1, sessions: [], routines: [], settings: {} })
  assert.ok(base && base !== 'newer')
  const history = [
    session(0, [exercise('Hammer_Curls', [set(12, 10)]), exercise('Barbell_Bench_Press_-_Medium_Grip', [set(80, 8), set(80, 8)]), exercise('Barbell_Full_Squat', [set(100, 5)])]),
  ]
  const d = { ...base, sessions: history }
  const ex = (exerciseId: string) => ({ exerciseId, name: exerciseId, muscle: 'x', sets: 2, repsMin: 8, repsMax: 10, rest: 120 })
  const routine = { id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [ex('Hammer_Curls'), ex('Barbell_Bench_Press_-_Medium_Grip'), ex('Barbell_Full_Squat')] }
  const planned = previewRoutine(routine, d)
  // El curl (12 kg) no es pesado: la rampa va en el press de banca (80 kg con barra) y no en la sentadilla.
  assert.equal(planned[0].sets.filter((s) => s.warmup).length, 0)
  assert.ok(planned[1].sets.filter((s) => s.warmup).length >= 2, shape(planned[1].sets).join(' '))
  assert.equal(planned[2].sets.filter((s) => s.warmup).length, 0)
  // La rampa empieza con la barra sola y no llega al peso de trabajo.
  const ramp = planned[1].sets.filter((s) => s.warmup).map((s) => s.weight)
  assert.equal(ramp[0], 20)
  assert.ok(ramp.every((w) => w < 80))
  // Las asistidas no llevan calentamiento (el peso es ayuda).
  const assisted = withWarmup([{ ...planned[1], sets: planned[1].sets.filter((s) => !s.warmup), assisted: true }], d)
  assert.equal(assisted[0].sets.filter((s) => s.warmup).length, 0)
})
