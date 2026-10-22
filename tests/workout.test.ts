import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyDeload, deloadSets, undoDeload, deloadWeek, prefillSets, previewRoutine, routineFacts, setProgress, weekRoutine, withWarmup } from '../src/lib/workout'
import { sessionSets } from '../src/lib/stats'
import { startOfWeek } from '../src/lib/format'
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

test('semana de descarga: Inicio, Rutinas y el detalle cuentan las mismas series que el entreno', () => {
  const base = migrateData({ version: 1, sessions: [], routines: [], settings: {} })
  assert.ok(base && base !== 'newer')
  const ex = (exerciseId: string, sets: number) => ({ exerciseId, name: exerciseId, muscle: 'x', sets, repsMin: 8, repsMax: 10, rest: 90 })
  const routine = { id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [ex('Hammer_Curls', 4), ex('Barbell_Full_Squat', 3)] }
  const normal = routineFacts(base, routine)
  assert.equal(normal.sets, 7)
  assert.equal(normal.deload, false)
  const easy = { ...base, settings: { ...base.settings, easyWeek: startOfWeek(Date.now()).getTime() } }
  const facts = routineFacts(easy, routine)
  const working = previewRoutine(routine, easy).reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0)
  assert.equal(facts.deload, true)
  assert.equal(facts.sets, working)
  assert.ok(facts.minutes < normal.minutes)
})

test('descarga por lados: parejas enteras, y la 5/3/1 no se descarga ni en el entreno ni en lo que se enseña', () => {
  const sides = exercise('Dumbbell_Lunges', [1, 2, 3, 4].flatMap(() => [set(20, 10, { done: false, side: 'L' }), set(20, 10, { done: false, side: 'R' })]))
  applyDeload(sides, 'kg')
  const left = sides.sets.filter((x) => x.side === 'L').length
  assert.equal(left, sides.sets.filter((x) => x.side === 'R').length)
  assert.equal(left, 2)
  const base = migrateData({ version: 1, sessions: [], routines: [], settings: {} })
  assert.ok(base && base !== 'newer')
  const easy = { ...base, settings: { ...base.settings, easyWeek: startOfWeek(Date.now()).getTime() } }
  const wave = { exerciseId: 'Barbell_Full_Squat', name: 'S', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, rest: 180, progression: 'wave531' as const }
  const routine = { id: 'w', name: 'W', notes: '', order: 0, createdAt: 0, exercises: [wave] }
  const working = previewRoutine(routine, easy)[0].sets.filter((x) => !x.warmup).length
  assert.equal(routineFacts(easy, routine).sets, working)
})

test('descarga en una asistida: más ayuda, no menos', () => {
  const e = { ...exercise('Assisted_Pull-Up', [set(30, 8, { done: false }), set(30, 8, { done: false }), set(30, 8, { done: false })]), assisted: true }
  applyDeload(e, 'kg')
  assert.ok(e.sets.every((s) => s.weight > 30), shape(e.sets).join(' '))
})

test('calentamiento en descarga: como mucho dos series', () => {
  rememberEquipment([{ id: 'Barbell_Full_Squat', equipment: 'barbell' }])
  const base = migrateData({ version: 1, sessions: [], routines: [], settings: {} })
  assert.ok(base && base !== 'newer')
  const d = { ...base, sessions: [session(0, [exercise('Barbell_Full_Squat', [set(120, 5), set(120, 5), set(120, 5)])])] }
  const routine = { id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [{ exerciseId: 'Barbell_Full_Squat', name: 'S', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 8, rest: 180 }] }
  const normal = previewRoutine(routine, d)[0].sets.filter((s) => s.warmup).length
  const easy = { ...d, settings: { ...d.settings, easyWeek: startOfWeek(Date.now()).getTime() } }
  const deload = previewRoutine(routine, easy)[0].sets.filter((s) => s.warmup).length
  assert.ok(normal > 2, `normal ${normal}`)
  assert.equal(deload, 2)
})

test('recuento de series: sin calentamiento ni drops, por lados una por pareja (hecha con cualquiera de los dos lados)', () => {
  // Pareja 1 con los dos lados, pareja 2 solo con la derecha, 3 y 4 sin hacer.
  const sides = [1, 2, 3, 4].flatMap((i) => [set(20, 10, { done: i === 1, side: 'L' }), set(20, 10, { done: i === 1 || i === 2, side: 'R' })])
  assert.deepEqual(setProgress(sides), { done: 2, total: 4 })
  const drops = [set(40, 10, { warmup: true }), set(80, 8), set(80, 8, { done: false }), set(60, 8, { kind: 'drop', done: false })]
  assert.deepEqual(setProgress(drops), { done: 1, total: 2 })
})

test('descarga: nunca deja un ejercicio en una sola serie si tenía dos o más', () => {
  const e = exercise('Lying_Triceps_Press', [set(30, 12, { done: false }), set(30, 12, { done: false })])
  applyDeload(e, 'kg')
  assert.equal(e.sets.length, 2)
  assert.deepEqual([1, 2, 3, 4, 5].map(deloadSets), [1, 2, 2, 2, 3])
})

test('recuento: el entreno y el resumen cuentan lo mismo (lados, drops y calentamiento)', () => {
  // Zancada de 3 por lados con la última derecha sin marcar, press con un drop y calentamiento, una serie sin hacer.
  const lunge = exercise('Dumbbell_Lunges', [1, 2, 3].flatMap((i) => [set(20, 10, { side: 'L' }), set(20, 10, { side: 'R', done: i < 3 })]))
  const bench = exercise('Barbell_Bench_Press_-_Medium_Grip', [set(40, 10, { warmup: true }), set(80, 8), set(80, 8), set(60, 8, { kind: 'drop' }), set(80, 8, { done: false })])
  const done = [lunge, bench].reduce((n, e) => n + setProgress(e.sets).done, 0)
  assert.equal(done, sessionSets(session(0, [lunge, bench])))
  assert.equal(done, 5)
})

test('semana de descarga: la del bloque cuenta igual que la del entrenador, y los drops no suman series', () => {
  const base = migrateData({ version: 1, sessions: [], routines: [], settings: {} })
  assert.ok(base && base !== 'newer')
  const now = Date.now()
  // Bloque de 4 semanas que empezó hace 3: esta es la 4.ª, la de descarga.
  const block = { ...base, settings: { ...base.settings, block: { start: now - 21 * 86400000, weeks: 4 } } } as typeof base
  assert.equal(deloadWeek(block, now), true)
  assert.equal(deloadWeek(base, now), false)
  const routine = { id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [{ exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', name: 'B', muscle: 'pectorals', sets: 5, repsMin: 6, repsMax: 10, rest: 120 }] }
  assert.equal(weekRoutine(block, routine).exercises[0].sets, 3)
  assert.equal(weekRoutine(base, routine), routine)
})

test('recuento por lados: con solo la derecha marcada también cuenta en el resumen', () => {
  const right = exercise('Dumbbell_Lunges', [set(20, 10, { side: 'L', done: false }), set(20, 10, { side: 'R' })])
  assert.equal(sessionSets(session(0, [right])), 1)
  assert.equal(setProgress(right.sets).done, 1)
})

test('quitar la descarga: vuelven las series y los pesos de antes, y lo hecho se queda', () => {
  const e = exercise('bench', [set(40, 10, { warmup: true, done: false }), set(100, 5), ...[1, 2, 3, 4].map(() => set(100, 5, { done: false })), set(80, 8, { done: false, kind: 'drop' })])
  applyDeload(e, 'kg')
  assert.deepEqual(shape(e.sets), ['40x10', '100x5✓', '90x5', '90x5'])
  e.sets[2].done = true // una serie de descarga ya hecha
  undoDeload(e)
  assert.equal(e.deload, undefined)
  assert.deepEqual(shape(e.sets), ['40x10', '100x5✓', '90x5✓', '100x5', '100x5', '100x5', '80x8:drop'])
})
