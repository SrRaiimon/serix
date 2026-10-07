import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseBackup } from '../src/lib/backup'
import { buildDishes, fitDish, makePlan, mealTargets, pickDish, rateDish, rateRemoved, usualFoods } from '../src/lib/mealPlan'
import { computeGoals, dayStatus, dayTotals, goalsForDay, MEALS, type BasicFood, type FoodEntry, type MealKey } from '../src/lib/nutrition'

const { foods } = JSON.parse(readFileSync('public/foods.json', 'utf8')) as { foods: BasicFood[] }
const goals = computeGoals({ sex: 'm', age: 30, heightCm: 178, weightKg: 80, activity: 1.55, aim: 'keep' })
const food = (id: string) => foods.find((f) => f.id === id)!
const entry = (day: string, meal: MealKey, id: string, grams: number): FoodEntry => {
  const f = food(id)
  return { id: `${day}${meal}${id}`, day, meal, name: f.es, grams, per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f }, ref: { kind: 'basic', id }, at: 0 }
}

test('compensación: se resta el exceso de ayer, como mucho un 15 %, y solo de los hidratos', () => {
  const ate = (kcal: number): FoodEntry => ({ id: 'x', day: '2026-03-01', meal: 'lunch', name: 'x', grams: 100, per100: { kcal, p: 0, c: 0, f: 0 }, at: 0 })
  const g = { ...goals, kcal: 2500, carbs: 300 }
  const small = goalsForDay(g, [ate(2700)], '2026-03-02', true)
  assert.equal(small.kcal, 2300)
  assert.equal(small.carried, 200)
  assert.equal(small.carbs, 250)
  assert.equal(small.protein, g.protein)
  // Un exceso enorme: como mucho el 15 % (375 → 380 redondeado a 10).
  assert.equal(goalsForDay(g, [ate(1000), { ...ate(999), id: 'y' }, { ...ate(999), id: 'z' }], '2026-03-02', true).carried, 380)
  // Sin pasarse, desactivado, o mirando otro día: nada.
  assert.equal(goalsForDay(g, [ate(2400)], '2026-03-02', true).carried, 0)
  assert.equal(goalsForDay(g, [ate(2700)], '2026-03-02', false).kcal, 2500)
  assert.equal(goalsForDay(g, [ate(2700)], '2026-03-03', true).kcal, 2500)
})

test('estado del día: cumplido a ±10 %, pasado o corto', () => {
  const g = { ...goals, kcal: 2000, protein: 150 }
  assert.equal(dayStatus({ kcal: 2150, p: 0, c: 0, f: 0 }, g), 'met')
  assert.equal(dayStatus({ kcal: 2250, p: 0, c: 0, f: 0 }, g), 'over')
  assert.equal(dayStatus({ kcal: 1700, p: 0, c: 0, f: 0 }, g), 'under')
  // Solo proteína: desde el 90 %.
  assert.equal(dayStatus({ kcal: 4000, p: 140, c: 0, f: 0 }, { ...g, proteinOnly: true }), 'met')
  assert.equal(dayStatus({ kcal: 0, p: 120, c: 0, f: 0 }, { ...g, proteinOnly: true }), 'under')
})

test('platos base: todos los alimentos existen y hay varios por comida', () => {
  const dishes = buildDishes(foods, [], '2026-03-10')
  for (const meal of MEALS) assert.ok(dishes.filter((d) => d.meal === meal).length >= 5, meal)
  for (const d of dishes) assert.ok(d.items.some((i) => i.role !== 'x'), d.id)
})

test('cantidades: cada plato se acerca a las calorías y la proteína de su comida', () => {
  const day = { kcal: goals.kcal, protein: goals.protein }
  const targets = mealTargets(day, [], MEALS)
  // Persona media: todos los platos cuadran a ±20 % y llegan a la proteína.
  for (const d of buildDishes(foods, [], '2026-03-10')) {
    const target = targets[d.meal]!
    const v = dayTotals(fitDish(d, target))
    assert.ok(Math.abs(v.kcal - target.kcal) <= target.kcal * 0.2, `${d.id}: ${v.kcal} kcal frente a ${Math.round(target.kcal)}`)
    assert.ok(v.p >= target.p * 0.85, `${d.id}: ${v.p} g de proteína frente a ${Math.round(target.p)}`)
  }
  // El reparto suma el día y se adapta a lo ya comido.
  const sum = MEALS.reduce((n, m) => n + targets[m]!.kcal, 0)
  assert.ok(Math.abs(sum - goals.kcal) < 1)
  const after = mealTargets(day, [entry('2026-03-10', 'breakfast', 'croissant', 120)], ['lunch', 'snack', 'dinner'])
  assert.ok(Math.abs(after.lunch!.kcal + after.snack!.kcal + after.dinner!.kcal - (goals.kcal - 504)) < 1)
})

test('cantidades en los extremos: el menú elige los platos que cuadran', () => {
  const dishes = buildDishes(foods, [], '2026-03-10')
  for (const g of [computeGoals({ sex: 'f', age: 35, heightCm: 162, weightKg: 58, activity: 1.375, aim: 'lose' }), computeGoals({ sex: 'm', age: 22, heightCm: 185, weightKg: 90, activity: 1.725, aim: 'gain' })]) {
    const targets = mealTargets({ kcal: g.kcal, protein: g.protein }, [], MEALS)
    let total = 0
    for (let seed = 0; seed < 20; seed++) {
      const plan = makePlan(dishes, { entries: [] }, '2026-03-10', seed, targets)
      total += MEALS.reduce((n, m) => n + dayTotals(fitDish(dishes.find((d) => d.id === plan.meals[m]!.dish)!, targets[m]!)).kcal, 0)
    }
    assert.ok(Math.abs(total / 20 - g.kcal) <= g.kcal * 0.1, `${g.kcal} kcal: de media ${Math.round(total / 20)}`)
  }
})

test('cantidades reales: huevos y lonchas por unidades, y lo quitado no sale', () => {
  const omelette = buildDishes(foods, [], '2026-03-10').find((d) => d.id === 'd-omelette')!
  const items = fitDish(omelette, { kcal: 700, p: 45 }, ['bread'])
  assert.equal(items.find((i) => i.key === 'egg')!.grams % 60, 0)
  assert.ok(!items.some((i) => i.key === 'bread'))
})

test('aprende: lo que repites se vuelve un plato tuyo y sale más', () => {
  const days = ['2026-03-01', '2026-03-03', '2026-03-05']
  const entries = days.flatMap((d) => [entry(d, 'breakfast', 'bread-whole', 80), entry(d, 'breakfast', 'olive-oil', 10), entry(d, 'breakfast', 'egg-fried', 110)])
  const dishes = buildDishes(foods, entries, '2026-03-10')
  const mine = dishes.find((d) => d.mine && d.meal === 'breakfast')!
  assert.equal(mine.times, 3)
  // De 40 menús distintos, el plato tuyo sale en la mayoría.
  const hits = Array.from({ length: 40 }, (_, seed) => makePlan(dishes, { entries }, '2026-03-10', seed).meals.breakfast!.dish).filter((id) => id === mine.id).length
  assert.ok(hits > 20, `${hits}/40`)
  // También con las cifras de un día de verdad (aunque no cuadre al gramo con su proteína).
  const targets = mealTargets({ kcal: goals.kcal, protein: goals.protein }, [], MEALS)
  const real = Array.from({ length: 40 }, (_, seed) => makePlan(dishes, { entries }, '2026-03-10', seed, targets).meals.breakfast!.dish).filter((id) => id === mine.id).length
  assert.ok(real > 20, `${real}/40 con objetivo`)
  // El huevo cuenta como proteína: se ajusta su cantidad.
  assert.equal(mine.items.find((i) => i.key === 'egg-fried')!.role, 'p')
  // Un plato que cambias una y otra vez deja de salir tanto.
  let prefs = rateDish(undefined, mine.id, false)
  for (let i = 0; i < 4; i++) prefs = rateDish(prefs, mine.id, false)
  const after = Array.from({ length: 40 }, (_, seed) => makePlan(dishes, { entries, prefs }, '2026-03-10', seed).meals.breakfast!.dish).filter((id) => id === mine.id).length
  assert.ok(after < hits / 2, `${after} frente a ${hits}`)
})

test('menú: el mismo día y semilla da lo mismo, sin repetir proteína principal y con «Otra opción» distinta', () => {
  const dishes = buildDishes(foods, [], '2026-03-10')
  const a = makePlan(dishes, { entries: [] }, '2026-03-10', 7)
  assert.deepEqual(a, makePlan(dishes, { entries: [] }, '2026-03-10', 7))
  for (let seed = 0; seed < 30; seed++) {
    const plan = makePlan(dishes, { entries: [] }, '2026-03-10', seed)
    const mains = MEALS.map((m) => dishes.find((d) => d.id === plan.meals[m]!.dish)!.items.find((i) => i.role === 'p')?.key)
    assert.ok(mains.every((x) => x), `semilla ${seed}`)
  }
  const usual = usualFoods([], '2026-03-10')
  const next = pickDish(dishes, 'lunch', { seed: 7, day: '2026-03-10', prefs: rateDish(undefined, a.meals.lunch!.dish, false), usual: usual.lunch, skip: [a.meals.lunch!.dish] })!
  assert.notEqual(next.id, a.meals.lunch!.dish)
})

test('copias: lo aprendido y la compensación desactivada se conservan', () => {
  const prefs = rateRemoved(rateDish(undefined, 'l-pasta-tuna', true), 'tuna-canned')
  const backup = { sessions: [], routines: [], nutrition: { entries: [], foods: [], meals: [], prefs, plan: { day: '2026-03-10', seed: 1, meals: {} } }, settings: { nutritionCarryOver: false } }
  const parsed = parseBackup(JSON.stringify(backup))
  assert.deepEqual(parsed.nutrition.prefs, prefs)
  assert.equal(parsed.nutrition.plan, undefined)
  assert.equal(parsed.settings.nutritionCarryOver, false)
})
