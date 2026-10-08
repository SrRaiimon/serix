import assert from 'node:assert/strict'
import { test } from 'node:test'
import './browser-stubs'
import { decodeFood, encodeFood } from '../src/lib/foodShare'
import { e1rmSlope, goalStatus, type LiftGoal } from '../src/lib/goals'
import { ALL_MEALS, mealLabel, setMealSettings, activeMeals } from '../src/lib/nutrition'
import { plan } from '../src/lib/progression'
import { rollingAverage, streakAtRisk, weeklyTrend } from '../src/lib/reminders'
import { nextRoutine } from '../src/lib/workout'
import { defaultSettings, type AppData, type Routine } from '../src/lib/store'
import { DAY, exercise, session, set, T0 } from './helpers'

test('tendencia del peso: media de 7 días y cambio por semana', () => {
  const pts = Array.from({ length: 29 }, (_, i) => ({ x: T0 + i * DAY, y: 80 - i * 0.05 + (i % 2 ? 0.6 : -0.6) }))
  const trend = rollingAverage(pts)
  assert.equal(trend.length, pts.length)
  // La media quita el vaivén de ±0,6 kg.
  assert.ok(Math.abs(trend[20].y - trend[19].y) < 0.3 && Math.abs(pts[20].y - pts[19].y) > 1)
  // Bajando 0,05 kg al día son −0,35 kg por semana, con el vaivén diario incluido.
  const week = weeklyTrend(pts)!
  assert.ok(week < -0.3 && week > -0.4, String(week))
  assert.equal(weeklyTrend(pts.slice(0, 10)), undefined)
})

test('racha en peligro: solo el fin de semana, sin entrenar esa semana y con racha', () => {
  const sat = new Date(2026, 9, 10, 10).getTime() // sábado
  assert.deepEqual(streakAtRisk([sat - 6 * DAY], 5, sat), { streak: 5, daysLeft: 2 })
  assert.equal(streakAtRisk([sat - 6 * DAY], 5, sat - 2 * DAY), undefined) // jueves
  assert.equal(streakAtRisk([sat - DAY], 5, sat), undefined) // ya entrenó el viernes
  assert.equal(streakAtRisk([], 1, sat), undefined)
})

test('metas de fuerza: progreso, previsión y conseguida', () => {
  const sessions = [0, 7, 14, 21, 28].map((d, i) => session(d, [exercise('Bench', [set(80 + i * 2.5, 5)])]))
  const now = sessions[4].start + DAY
  const goal: LiftGoal = { id: 'g', exerciseId: 'Bench', name: 'Banca', kg: 110, from: 93, createdAt: sessions[0].start - DAY }
  const st = goalStatus(goal, sessions, now)
  assert.ok(st.progress > 0 && st.progress < 1)
  assert.ok(st.eta && st.eta > now)
  assert.ok(e1rmSlope([], now) === undefined)
  assert.ok(goalStatus({ ...goal, kg: 95 }, sessions, now).doneAt)
  assert.equal(goalStatus({ ...goal, by: now + 7 * DAY }, sessions, now).onTrack, false)
})

test('por porcentaje del máximo: el peso sale del mejor 1RM estimado', () => {
  const history = [session(0, [exercise('Squat', [set(100, 5)])])]
  const p = plan({ exerciseId: 'Squat', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, progression: 'percent', percent: 0.8 }, [], history, 'kg')!
  assert.equal(p.sets.length, 3)
  assert.equal(p.sets[0].weight, 92.5) // 80 % de ~116,7 → 92,5 con discos de 2,5
  assert.equal(p.sets[0].reps, 5)
  assert.deepEqual(p.auto && p.auto.kind, 'percent')
  assert.equal(plan({ exerciseId: 'Nuevo', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, progression: 'percent', percent: 0.8 }, [], history, 'kg'), undefined)
})

test('rutina por día: el lunes toca la del lunes aunque la rotación diga otra', () => {
  const routine = (id: string, order: number): Routine => ({ id, name: id, notes: '', order, createdAt: 0, exercises: [{ exerciseId: 'Squat', name: 'Sentadilla', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, rest: 120 }] })
  const monday = new Date(2026, 9, 12, 9).getTime()
  const d = {
    version: 1, routines: [routine('A', 0), routine('B', 1), routine('C', 2)], sessions: [{ ...session(0, []), routineId: 'A', start: monday - 3 * DAY, end: monday - 3 * DAY + 3600000 }],
    measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [], nutrition: { entries: [], foods: [], meals: [] },
    settings: { ...defaultSettings, trainingDays: [0, 2, 4], dayRoutines: { 0: 'C', 2: 'A', 4: 'B' } },
  } as unknown as AppData
  assert.equal(nextRoutine(d, monday)?.id, 'C')
  assert.equal(nextRoutine(d, monday + DAY)?.id, 'A') // martes: el próximo día es el miércoles
  assert.equal(nextRoutine({ ...d, settings: { ...d.settings, dayRoutines: undefined } }, monday)?.id, 'B') // rotación
})

test('comidas a tu manera: almuerzo y recena, con nombre propio', () => {
  setMealSettings({ brunch: 'Almuerzo del curro' }, ['breakfast', 'brunch', 'lunch', 'dinner'])
  assert.deepEqual(activeMeals(), ['breakfast', 'brunch', 'lunch', 'dinner'])
  assert.equal(mealLabel('brunch'), 'Almuerzo del curro')
  assert.equal(mealLabel('supper'), 'Recena')
  setMealSettings(undefined, undefined)
  assert.deepEqual(activeMeals(), ['breakfast', 'lunch', 'snack', 'dinner'])
  assert.equal(ALL_MEALS.length, 6)
})

test('compartir un alimento o una receta por enlace: ida y vuelta', async () => {
  const food = { id: 'a', name: 'Lentejas de mi madre', source: 'mine' as const, per100: { kcal: 120, p: 8, c: 15, f: 3 },
    recipe: { servings: 4, items: [{ name: 'Lentejas', grams: 300, per100: { kcal: 330, p: 24, c: 50, f: 1 } }] } }
  const code = await encodeFood(food)
  assert.match(code, /^f[A-Za-z0-9_-]+$/)
  const back = await decodeFood(code)
  assert.equal(back.name, food.name)
  assert.deepEqual(back.per100, food.per100)
  assert.equal(back.recipe?.items[0].grams, 300)
  await assert.rejects(decodeFood('fxxxx'))
})
