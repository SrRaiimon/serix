import './browser-stubs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { defaultSettings, getData, replaceData, type Session } from '../src/lib/store'
import { plannedSets, saveAsRoutine } from '../src/lib/workout'
import { compareWithLast } from '../src/lib/stats'
import { buildDishes, fitDish } from '../src/lib/mealPlan'
import { parseNutritionLabel, type BasicFood, type FoodEntry } from '../src/lib/nutrition'
import { exercise, fakeIndexedDB, session, set } from './helpers'

fakeIndexedDB()

const reset = (sessions: Session[]) => replaceData({
  version: 1, routines: [], measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [],
  nutrition: { entries: [], foods: [], meals: [] }, sessions,
  settings: { ...defaultSettings, onboarded: true },
})

test('guardar como rutina: con el nombre elegido, y los entrenos anteriores con el mismo nombre pasan a ella', () => {
  const old = session(-7, [exercise('Barbell_Squat', [set(100, 5), set(100, 5)])], { name: 'Libre' })
  const other = session(-5, [exercise('Barbell_Squat', [set(90, 5)])], { name: 'Otro' })
  const now = session(0, [exercise('Barbell_Squat', [set(105, 5), set(105, 5)])], { name: 'Libre' })
  reset([old, other, now])
  saveAsRoutine(now, '  Pierna fuerte  ')
  const d = getData()
  assert.equal(d.routines.length, 1)
  assert.equal(d.routines[0].name, 'Pierna fuerte')
  const id = d.routines[0].id
  assert.deepEqual(d.sessions.map((s) => s.routineId), [id, undefined, id])
  // «Frente a la última vez» sigue comparando con el entreno de antes.
  const saved = d.sessions.find((s) => s.id === now.id)!
  assert.equal(compareWithLast(saved, d.sessions)?.previous.id, old.id)
})

test('repetir o guardar un entreno de descarga: las series de antes de recortar, no las de la descarga', () => {
  const deload = { ...exercise('Barbell_Squat', [set(90, 5), set(90, 5), set(90, 5)]), deload: true }
  // Sin rutina: la cuenta de deloadSets al revés (3 → 5).
  assert.equal(plannedSets(deload), 5)
  // Con la rutina, sus series.
  assert.equal(plannedSets(deload, { id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [{ exerciseId: 'Barbell_Squat', name: 'S', muscle: 'quads', sets: 4, repsMin: 5, repsMax: 5, rest: 120 }] }), 4)
  // Sin descarga, las hechas (sin calentamiento ni drop sets).
  assert.equal(plannedSets(exercise('Barbell_Squat', [set(40, 5, { warmup: true }), set(90, 5), set(70, 5, { kind: 'drop' })])), 1)
  reset([])
  saveAsRoutine(session(0, [deload], { name: 'Descarga' }))
  assert.equal(getData().routines[0].exercises[0].sets, 5)
})

test('etiqueta: «Grasas 12 g de las cuales saturadas 3 g» en una línea no pierde la grasa', () => {
  const v = parseNutritionLabel('Valor energético 450 kcal\nGrasas 12 g de las cuales saturadas 3 g\nHidratos de carbono 70 g de los cuales azúcares 20 g\nProteínas 10 g')
  assert.deepEqual([v.f, v.c, v.p], [12, 70, 10])
})

test('platos tuyos: el mismo alimento dos veces va en una fila con la suma, y lo fijo no se redondea', () => {
  const { foods } = JSON.parse(readFileSync('public/foods.json', 'utf8')) as { foods: BasicFood[] }
  const bread = foods.find((f) => f.id === 'bread')!
  const entry = (day: string, n: number, grams: number): FoodEntry => ({ id: `${day}${n}`, day, meal: 'breakfast', name: bread.es, grams, per100: { kcal: bread.kcal, p: bread.p, c: bread.c, f: bread.f }, ref: { kind: 'basic', id: 'bread' }, at: n })
  const entries = ['2026-03-08', '2026-03-09'].flatMap((day) => [entry(day, 1, 40), entry(day, 2, 35)])
  const mine = buildDishes(foods, entries, '2026-03-10').find((d) => d.mine)!
  assert.equal(mine.items.length, 1)
  assert.equal(mine.items[0].g, 75)
  const fixed = { ...mine, items: [{ ...mine.items[0], role: 'x' as const, min: 125, max: 125, g: 125, step: 10 }] }
  assert.equal(fitDish(fixed, { kcal: 500, p: 30 })[0].grams, 125)
})
