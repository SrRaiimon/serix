import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultSettings, getData, replaceData, type Session } from '../src/lib/store'
import { addExercises, replaceSessionExercise, saveAsRoutine, startEmpty, startRoutine } from '../src/lib/workout'
import { setUnits } from '../src/lib/stats'
import { shareCardSVG } from '../src/lib/shareCard'
import type { Exercise } from '../src/lib/catalog'
import { exercise, fakeIndexedDB, session, set } from './helpers'

// Contar series, no filas: por lados la pareja izquierda-derecha es una serie, y el calentamiento y los drop sets no
// suman. Antes, al añadir, cambiar o guardar como rutina, salían el doble de series.

fakeIndexedDB()

const reset = (sessions: Session[]) => replaceData({
  version: 1, routines: [], measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [],
  nutrition: { entries: [], foods: [], meals: [] }, sessions,
  settings: { ...defaultSettings, onboarded: true, exerciseModes: { Dumbbell_Lunges: { unilateral: true } } },
})
const sides = (n: number) => Array.from({ length: n }, () => [set(20, 10, { side: 'L' }), set(20, 10, { side: 'R' })]).flat()
const lunges = { id: 'Dumbbell_Lunges', name: 'Zancadas', muscle: 'quads', equipment: 'dumbbell' } as Exercise
const active = () => getData().sessions.find((s) => s.end === undefined)!

test('añadir a mano un ejercicio por lados: tantas series como la última vez', () => {
  reset([session(-2, [exercise('Dumbbell_Lunges', sides(3))])])
  startEmpty()
  addExercises(active().id, [lunges])
  const e = active().exercises[0]
  assert.equal(setUnits(e.sets).length, 3)
  assert.equal(e.sets.length, 6)
})

test('cambiar el primer ejercicio (con calentamiento) por otro: las mismas series de trabajo', () => {
  reset([session(-2, [exercise('Barbell_Squat', [set(100, 5), set(100, 5), set(100, 5)])])])
  startRoutine({ id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [{ exerciseId: 'Barbell_Squat', name: 'Sentadilla', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, rest: 120 }] })
  assert.ok(active().exercises[0].sets.some((s) => s.warmup))
  replaceSessionExercise(active().id, active().exercises[0].id, { id: 'Leg_Press', name: 'Prensa', muscle: 'quads', equipment: 'machine' } as Exercise)
  assert.equal(active().exercises[0].sets.length, 3)
})

test('guardar como rutina un entreno por lados o con drop sets: las series que se hicieron', () => {
  const done = session(-1, [exercise('Dumbbell_Lunges', sides(3)), exercise('bench', [set(80, 8), set(80, 8), set(60, 8, { kind: 'drop' })])], { id: 'sx' })
  reset([done])
  saveAsRoutine(done)
  assert.deepEqual(getData().routines[0].exercises.map((e) => e.sets), [3, 2])
})

test('imagen para compartir: «3 series» en un ejercicio por lados', () => {
  const svg = shareCardSVG({ session: session(0, [exercise('Dumbbell_Lunges', sides(3), { name: 'Zancadas', unilateral: true })]), unit: 'kg', records: [], story: false, secondaryOf: () => [] })
  assert.match(svg, /3 series/)
  assert.doesNotMatch(svg, /6 series/)
})
