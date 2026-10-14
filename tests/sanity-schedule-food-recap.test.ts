import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { foodAchievements } from '../src/lib/achievements'
import { navyBodyFat } from '../src/lib/bodyfat'
import { dayKey, shiftDay, type FoodEntry } from '../src/lib/nutrition'
import { weekRecap } from '../src/lib/recap'
import { dayPlan, weekdayIndex } from '../src/lib/schedule'
import { defaultSettings, type AppData } from '../src/lib/store'
import { suspicious } from '../src/lib/tracking'
import { exercise, session, set } from './helpers'

test('peso imposible: un cero de más, mucho peso sin historial o repeticiones disparatadas', () => {
  assert.match(suspicious(set(800, 8), 80, 'kg')!, /800/)
  assert.equal(suspicious(set(90, 8), 80, 'kg'), undefined)
  // Pesos pequeños: el doble no basta si son menos de 20 kg de diferencia (de 8 a 18 kg en curl, por ejemplo).
  assert.equal(suspicious(set(18, 8), 8, 'kg'), undefined)
  assert.ok(suspicious(set(350, 5), 0, 'kg'))
  assert.equal(suspicious(set(200, 5), 0, 'kg'), undefined)
  assert.ok(suspicious(set(20, 120), 20, 'kg'))
})

test('días fijos: hoy toca o descansas, y cuál es el próximo', () => {
  const wed = new Date(2026, 9, 7, 10).getTime() // miércoles
  assert.equal(weekdayIndex(wed), 2)
  assert.equal(dayPlan({}, wed), undefined)
  const plan = dayPlan({ trainingDays: [0, 2, 4] }, wed)!
  assert.equal(plan.today, true)
  assert.equal(weekdayIndex(plan.next), 4)
  const thu = dayPlan({ trainingDays: [0, 2, 4] }, wed + 86400000)!
  assert.equal(thu.today, false)
  // Del viernes se pasa al lunes siguiente.
  assert.equal(weekdayIndex(dayPlan({ trainingDays: [0, 2, 4] }, wed + 2 * 86400000)!.next), 0)
})

const entry = (day: string, kcal: number, p: number): FoodEntry => ({ id: `${day}-${kcal}`, day, meal: 'lunch', name: 'Comida', grams: 100, per100: { kcal, p, c: 0, f: 0 }, at: 0 })

test('logros de comida: días seguidos, proteína y calorías en el objetivo', () => {
  const start = '2026-09-01'
  const entries = Array.from({ length: 12 }, (_, i) => entry(shiftDay(start, i), 2500, i < 10 ? 150 : 50))
  const list = foodAchievements(entries, () => ({ kcal: 2500, protein: 150, carbs: 300, fat: 70 }))
  const got = (id: string) => list.find((a) => a.id === id)!
  assert.ok(got('food-first').unlockedAt)
  assert.ok(got('food-streak-7').unlockedAt)
  assert.equal(got('food-streak-30').unlockedAt, undefined)
  assert.ok(got('food-protein-10').unlockedAt)
  assert.deepEqual(got('food-target-20').progress, [12, 20])
  // Un hueco corta la racha.
  const gap = foodAchievements([...entries.slice(0, 3), ...entries.slice(4, 8)], () => undefined)
  assert.equal(gap.find((a) => a.id === 'food-streak-7')!.unlockedAt, undefined)
})

test('grasa corporal con la fórmula de la Marina (cm)', () => {
  const man = navyBodyFat({ sex: 'm', heightCm: 178, waist: 85, neck: 38 })!
  assert.ok(man > 15 && man < 20, String(man))
  const woman = navyBodyFat({ sex: 'f', heightCm: 165, waist: 72, neck: 32, hip: 98 })!
  assert.ok(woman > 22 && woman < 30, String(woman))
  assert.equal(navyBodyFat({ sex: 'f', heightCm: 165, waist: 72, neck: 32 }), undefined)
  assert.equal(navyBodyFat({ sex: 'm', heightCm: 178, waist: 30, neck: 38 }), undefined)
})

test('resumen de la semana: entrenos, marcas, comida y peso', () => {
  const monday = new Date(2026, 0, 5).getTime() // helpers: T0 es el lunes 5 de enero
  const before = session(-7, [exercise('Bench', [set(60, 8)])])
  const week = [session(0, [exercise('Bench', [set(65, 8)])]), session(2, [exercise('Bench', [set(60, 8)])])]
  const d = {
    version: 1, sessions: [before, ...week], routines: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [],
    measurements: [{ id: 'a', date: monday - 3 * 86400000, weight: 80 }, { id: 'b', date: monday + 4 * 86400000, weight: 79.5 }],
    nutrition: { entries: [entry(dayKey(monday), 2500, 150), entry(dayKey(monday + 86400000), 3200, 150)], foods: [], meals: [] },
    settings: { ...defaultSettings, weeklyGoal: 2, nutrition: { kcal: 2500, protein: 150, carbs: 300, fat: 70 } },
  } as unknown as AppData
  const r = weekRecap(d, monday)!
  assert.equal(r.workouts, 2)
  assert.equal(r.records, 1)
  assert.equal(r.food?.logged, 2)
  assert.equal(r.weight?.kg, 79.5)
  assert.equal(r.weight?.change, -0.5)
  assert.equal(weekRecap({ ...d, sessions: [], measurements: [], nutrition: { entries: [], foods: [], meals: [] } } as unknown as AppData, monday), undefined)
})

test('el índice ligero de ejercicios es el catálogo sin instrucciones', () => {
  const full = JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: Record<string, unknown>[] }
  const index = JSON.parse(readFileSync('public/exercises_index.json', 'utf8')) as { exercises: Record<string, unknown>[] }
  assert.deepEqual(index.exercises, full.exercises.map(({ instructions: _i, instructionsEn: _e, ...rest }) => rest))
})
