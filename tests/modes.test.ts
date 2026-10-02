import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { repRecordBeaten, repRecords, sessionSets, sessionVolume, setCount, workingSets } from '../src/lib/stats'
import { sessionsToCsv } from '../src/lib/exportCsv'
import { activeSession, defaultSettings, getData, replaceData, type AppData } from '../src/lib/store'
import { fromSides, startRoutine, toSides } from '../src/lib/workout'
import { DAY, exercise, fakeIndexedDB, session, set } from './helpers'

fakeIndexedDB()

test('récords por repeticiones: el mayor peso movido al menos N veces', () => {
  const sessions = [
    session(0, [exercise('bench', [set(100, 1), set(90, 3), set(80, 6)])]),
    session(7, [exercise('bench', [set(85, 5), set(70, 12), set(200, 0)])]),
  ]
  const [r1, r3, r5, r10] = repRecords('bench', sessions)
  assert.deepEqual([r1?.weight, r3?.weight, r5?.weight, r10?.weight], [100, 90, 85, 70])
  assert.equal(r5?.reps, 5)
  assert.equal(r10?.reps, 12) // 12 repeticiones cuentan para el récord de 10
  assert.equal(repRecordBeaten(87.5, 5, [r1, r3, r5, r10]), 5)
  assert.equal(repRecordBeaten(92.5, 3, [r1, r3, r5, r10]), 3)
  assert.equal(repRecordBeaten(75, 10, [r1, r3, r5, r10]), 10)
  assert.equal(repRecordBeaten(80, 5, [r1, r3, r5, r10]), undefined)
  // Sin récord previo de esas repeticiones no cuenta (la primera vez no es un récord).
  assert.equal(repRecordBeaten(50, 15, [r1, r3, r5, undefined]), undefined)
})

test('máquina asistida: la ayuda no cuenta como peso levantado', () => {
  const e = exercise('pullup', [set(20, 8), set(20, 6)], { assisted: true })
  assert.deepEqual(workingSets(e).map((s) => s.weight), [0, 0])
  assert.equal(e.sets[0].weight, 20) // el dato guardado no cambia
  assert.equal(sessionVolume(session(0, [e])), 0)
  assert.deepEqual(repRecords('pullup', [session(0, [e])]), [undefined, undefined, undefined, undefined])
})

test('por lados: cada serie se convierte en izquierda y derecha, y se puede deshacer', () => {
  const sets = [set(10, 12, { done: false, warmup: true }), set(20, 10, { done: false }), set(20, 10, { done: false })]
  const sided = toSides(sets)
  assert.deepEqual(sided.map((s) => s.side ?? 'C'), ['C', 'L', 'R', 'L', 'R'])
  assert.equal(new Set(sided.map((s) => s.id)).size, 5)
  assert.equal(toSides(sided), sided) // ya tiene lados: no se duplica otra vez
  const back = fromSides(sided)
  assert.deepEqual(back.map((s) => s.side), [undefined, undefined, undefined])
  // Las ya hechas se conservan con su lado.
  const partly = [{ ...sided[1], done: true }, { ...sided[2], done: true }, sided[3], sided[4]]
  assert.deepEqual(fromSides(partly).map((s) => [s.done, s.side]), [[true, 'L'], [true, 'R'], [false, undefined]])
})

test('el modo de cada ejercicio se recuerda al empezar la rutina', () => {
  const now = Date.now()
  const data: AppData = {
    version: 1, measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [],
    settings: { ...defaultSettings, exerciseModes: { Pullups: { assisted: true }, Dumbbell_Lunges: { unilateral: true } } },
    routines: [{ id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [
      { exerciseId: 'Pullups', name: 'Dominadas', muscle: 'lats', sets: 3, repsMin: 6, repsMax: 10, rest: 90, progression: 'double' },
      { exerciseId: 'Dumbbell_Lunges', name: 'Zancadas', muscle: 'quads', sets: 2, repsMin: 8, repsMax: 12, rest: 90 },
    ] }],
    sessions: [{ id: 'old', name: 'R', start: now - 3 * DAY, end: now - 3 * DAY + 3600000, notes: '', exercises: [
      exercise('Pullups', [set(25, 10), set(25, 10), set(25, 10)], { assisted: true }),
      exercise('Dumbbell_Lunges', [set(12, 10, { side: 'L' }), set(14, 10, { side: 'R' }), set(12, 9, { side: 'L' }), set(14, 9, { side: 'R' })], { unilateral: true }),
    ] }],
  }
  replaceData(data)
  startRoutine(getData().routines[0])
  const [pull, lunge] = activeSession(getData())!.exercises
  // Asistida: sin progresión automática (subir sería dar más ayuda); copia la ayuda de la última vez.
  assert.equal(pull.assisted, true)
  assert.equal(pull.auto, undefined)
  assert.deepEqual(pull.sets.map((s) => s.weight), [25, 25, 25])
  // Por lados: 2 series × 2 lados, y cada lado copia lo que hizo la última vez.
  assert.equal(lunge.unilateral, true)
  assert.deepEqual(lunge.sets.map((s) => [s.side, s.weight, s.reps]), [['L', 12, 10], ['R', 14, 10], ['L', 12, 9], ['R', 14, 9]])
  assert.equal(new Set(lunge.sets.map((s) => s.id)).size, 4)
})

test('por lados: cada pareja izquierda-derecha cuenta como una serie para el volumen', () => {
  const e = exercise('lunge', [set(12, 10, { side: 'L' }), set(12, 10, { side: 'R' }), set(12, 9, { side: 'L' }), set(12, 9, { side: 'R' })], { unilateral: true, muscle: 'quads' })
  assert.equal(setCount(e), 2)
  assert.equal(sessionSets(session(0, [e])), 2)
  assert.equal(sessionVolume(session(0, [e])), 12 * 38) // el peso sí cuenta en los dos lados
})

test('por lados al activarlo a mitad: las hechas se quedan y el orden se respeta', () => {
  const sets = [set(20, 5, { done: false, warmup: true }), set(40, 8), set(40, 8, { done: false })]
  const sided = toSides(sets)
  assert.deepEqual(sided.map((s) => [s.warmup, s.done, s.side ?? '-']), [[true, false, '-'], [false, true, '-'], [false, false, 'L'], [false, false, 'R']])
  // Otra vez, tras quitarlo con parejas ya hechas: las pendientes vuelven a emparejarse.
  const off = fromSides([{ ...sided[2], done: true }, { ...sided[3], done: true }, set(40, 8, { done: false })])
  assert.deepEqual(toSides(off).map((s) => [s.done, s.side ?? '-']), [[true, 'L'], [true, 'R'], [false, 'L'], [false, 'R']])
})

test('CSV: la ayuda de las máquinas asistidas va en negativo y el lado en el tipo', () => {
  const csv = sessionsToCsv([session(0, [
    exercise('Pullups', [set(20, 8)], { name: 'Dominadas', assisted: true }),
    exercise('lunge', [set(12, 10, { side: 'L' }), set(12, 10, { side: 'R' })], { name: 'Zancadas', unilateral: true }),
  ])], 'kg')
  assert.match(csv, /Dominadas;1;Normal;-20;8/)
  assert.match(csv, /Zancadas;1;Normal · Izquierda;12;10/)
  assert.match(csv, /Zancadas;1;Normal · Derecha;12;10/)
})
