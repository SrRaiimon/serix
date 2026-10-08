import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseBackup } from '../src/lib/backup'
import { dueMeals } from '../src/lib/foodReminders'
import { buildDishes, fitDish, makePlan, mealTargets, pickDish, rateDish, rateRemoved, usualFoods } from '../src/lib/mealPlan'
import { adjustGoals, computeGoals, dayFiber, recipeValues, waterGoal, dayGoalOptions, dayKey, dayStatus, dayTotals, dayText, goalsForDay, lastWeek, MEALS, trainingShift, weekdayOf, weeklyIntake, weekTemplate, weightAdvice, type BasicFood, type FoodEntry, type MealKey } from '../src/lib/nutrition'

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
  const small = goalsForDay(g, [ate(2700)], '2026-03-02', { carryOver: true })
  assert.equal(small.kcal, 2300)
  assert.equal(small.carried, 200)
  assert.equal(small.carbs, 250)
  assert.equal(small.protein, g.protein)
  // Un exceso enorme: como mucho el 15 % (375 → 380 redondeado a 10).
  assert.equal(goalsForDay(g, [ate(1000), { ...ate(999), id: 'y' }, { ...ate(999), id: 'z' }], '2026-03-02', { carryOver: true }).carried, 380)
  // Sin pasarse, desactivado, o mirando otro día: nada.
  assert.equal(goalsForDay(g, [ate(2400)], '2026-03-02', { carryOver: true }).carried, 0)
  assert.equal(goalsForDay(g, [ate(2700)], '2026-03-02', { carryOver: false }).kcal, 2500)
  assert.equal(goalsForDay(g, [ate(2700)], '2026-03-03', { carryOver: true }).kcal, 2500)
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
  const backup = { sessions: [], routines: [], nutrition: { entries: [], foods: [], meals: [], prefs, plans: [{ day: '2026-03-10', seed: 1, meals: {} }], trainingDays: ['2026-03-09', 'mal'] }, settings: { nutritionCarryOver: false } }
  const parsed = parseBackup(JSON.stringify(backup))
  assert.deepEqual(parsed.nutrition.prefs, prefs)
  assert.equal(parsed.nutrition.plans, undefined)
  assert.deepEqual(parsed.nutrition.trainingDays, ['2026-03-09'])
  assert.equal(parsed.settings.nutritionCarryOver, false)
})

test('días de entreno: +10 % al entrenar y lo justo menos al descansar para que la semana sume igual', () => {
  assert.deepEqual(trainingShift(2500, 4), { up: 250, down: 330 })
  assert.deepEqual(trainingShift(2500, 3), { up: 250, down: 190 })
  // Entrenando casi a diario se suma menos para que el descanso no baje más de un 15 %.
  const six = trainingShift(2500, 6)
  assert.ok(six.down <= 2500 * 0.15 + 10 && six.up < 250, JSON.stringify(six))
  const g = { ...goals, kcal: 2500, carbs: 300 }
  const opts = { carryOver: true, training: { days: new Set(['2026-03-02']), perWeek: 4 } }
  const trained = goalsForDay(g, [], '2026-03-02', opts)
  assert.equal(trained.kcal, 2750)
  assert.equal(trained.training, true)
  assert.equal(trained.carbs, 363)
  assert.equal(trained.protein, g.protein)
  assert.equal(goalsForDay(g, [], '2026-03-03', opts).kcal, 2170)
  // Comer 2750 el día de entreno no es pasarse: no se resta nada al día siguiente.
  const ate = (kcal: number): FoodEntry => ({ id: 'x', day: '2026-03-02', meal: 'lunch', name: 'x', grams: 100, per100: { kcal, p: 0, c: 0, f: 0 }, at: 0 })
  assert.equal(goalsForDay(g, [ate(1000), { ...ate(1000), id: 'y' }, { ...ate(750), id: 'z' }], '2026-03-03', opts).carried, 0)
  // Los días con entrenamiento cuentan solos; los marcados a mano también. Desactivado: nada.
  const data = { sessions: [{ start: new Date(2026, 2, 5, 18).getTime() }], nutrition: { trainingDays: ['2026-03-06'] }, settings: { weeklyGoal: 4 } }
  assert.deepEqual([...dayGoalOptions(data).training!.days].sort(), ['2026-03-05', '2026-03-06'])
  assert.equal(dayGoalOptions({ ...data, settings: { weeklyGoal: 4, nutritionTrainingSplit: false } }).training, undefined)
})

test('ajuste según el peso: propone ±150 kcal si la tendencia de 3 semanas no va al ritmo del objetivo', () => {
  const now = new Date(2026, 2, 22, 9).getTime()
  const day = 86400000
  const series = (start: number, perWeek: number) => [0, 4, 8, 12, 16, 20].map((d) => ({ date: now - (20 - d) * day, weight: start + (perWeek / 7) * d }))
  const lose = { ...goals, kcal: 2200, aim: 'lose' as const }
  // Perder grasa sin bajar: −150.
  assert.equal(weightAdvice(series(80, 0), lose, [], now)!.change, -150)
  // Bajando 0,5 kg/sem (0,6 %): bien, nada.
  assert.equal(weightAdvice(series(80, -0.5), lose, [], now), undefined)
  // Bajando 1,2 kg/sem: demasiado rápido, +150.
  assert.equal(weightAdvice(series(80, -1.2), lose, [], now)!.change, 150)
  // Ganar músculo sin subir: +150; la tendencia sale bien medida.
  const gain = weightAdvice(series(70, 0), { ...goals, aim: 'gain' }, [], now)!
  assert.equal(gain.change, 150)
  assert.ok(Math.abs(gain.rate) < 0.01)
  // Pocos datos (3 pesajes, o todos en una semana): nada.
  assert.equal(weightAdvice(series(80, 0).slice(0, 3), lose, [], now), undefined)
  assert.equal(weightAdvice(series(80, 0).slice(3), lose, [], now), undefined)
  // Si lo apuntado está lejos del objetivo, primero comer lo que marca: nada.
  const ate = (i: number, kcal: number): FoodEntry => ({ id: `e${i}`, day: dayKey(now - (i + 1) * day), meal: 'lunch', name: 'x', grams: 100, per100: { kcal, p: 0, c: 0, f: 0 }, at: 0 })
  assert.equal(weightAdvice(series(80, 0), lose, Array.from({ length: 10 }, (_, i) => ate(i, 900)), now), undefined)
  assert.equal(weightAdvice(series(80, 0), lose, Array.from({ length: 10 }, (_, i) => ate(i, 2200)), now)!.eaten, 2200)
})

test('ajuste según el peso: se suma en hidratos y se acumula; a cero desaparece', () => {
  const g = { ...goals, kcal: 2200, carbs: 250 }
  const once = adjustGoals(g, -150)
  assert.deepEqual([once.kcal, once.carbs, once.adjust], [2050, 213, -150])
  const back = adjustGoals(once, 150)
  assert.deepEqual([back.kcal, back.adjust], [2200, undefined])
})

test('semanas: calorías medias de los días apuntados y peso medio', () => {
  const now = new Date(2026, 2, 18, 12).getTime() // miércoles
  const e = (day: string, kcal: number): FoodEntry => ({ id: day + kcal, day, meal: 'lunch', name: 'x', grams: 100, per100: { kcal, p: 0, c: 0, f: 0 }, at: 0 })
  const weeks = weeklyIntake([e('2026-03-16', 2000), e('2026-03-17', 2400), e('2026-03-10', 1800), e('2026-03-10', 200)],
    [{ date: new Date(2026, 2, 16).getTime(), weight: 80 }, { date: new Date(2026, 2, 17).getTime(), weight: 81 }, { date: new Date(2026, 2, 11).getTime() }], 3, now)
  assert.deepEqual(weeks.map((w) => [w.start.getDate(), w.kcal, w.days, w.weight]), [[2, 0, 0, undefined], [9, 2000, 1, undefined], [16, 2200, 2, 80.5]])
})

test('recetas: valores por 100 g del plato hecho y peso de la ración', () => {
  const lentils = { name: 'Lentejas secas', grams: 300, per100: { kcal: 300, p: 24, c: 45, f: 1.5 } }
  const oil = { name: 'Aceite', grams: 30, per100: { kcal: 900, p: 0, c: 0, f: 100 } }
  const r = recipeValues({ items: [lentils, oil], servings: 4 })
  assert.equal(r.weight, 330)
  assert.equal(r.portionG, 83)
  assert.equal(Math.round(r.total.kcal), 1170)
  // Con el peso de la olla (las lentejas absorben agua), cada 100 g tiene menos de todo.
  const cooked = recipeValues({ items: [lentils, oil], servings: 4, cookedG: 1170 })
  assert.deepEqual(cooked.per100, { kcal: 100, p: 6.2, c: 11.5, f: 2.9 })
  assert.equal(cooked.portionG, 293)
})

test('fibra y agua: la fibra de los alimentos con el dato, y los vasos según la EFSA', () => {
  const e = (fiber: number | undefined, grams: number) => ({ grams, per100: { kcal: 100, p: 0, c: 0, f: 0, ...(fiber !== undefined ? { fiber } : {}) } })
  assert.deepEqual(dayFiber([e(10, 200), e(undefined, 100), e(2, 50)]), { g: 21, missing: 1 })
  assert.equal(waterGoal('m'), 8)
  assert.equal(waterGoal('f'), 6)
  // Las recetas tienen fibra solo si todos sus ingredientes la tienen.
  assert.equal(recipeValues({ items: [{ name: 'a', grams: 100, per100: { kcal: 100, p: 0, c: 0, f: 0, fiber: 4 } }], servings: 1 }).per100.fiber, 4)
  assert.equal(recipeValues({ items: [{ name: 'a', grams: 100, per100: { kcal: 100, p: 0, c: 0, f: 0, fiber: 4 } }, { name: 'b', grams: 100, per100: { kcal: 100, p: 0, c: 0, f: 0 } }], servings: 1 }).per100.fiber, undefined)
})

test('semana tipo: cada día de lunes a domingo con lo apuntado, y se conserva en la copia', () => {
  const e = (day: string, name: string, at: number): FoodEntry => ({ id: day + name, day, meal: 'lunch', name, grams: 100, per100: { kcal: 100, p: 1, c: 1, f: 1 }, at })
  // 2026-03-16 es lunes; el 15 es domingo de la semana anterior.
  const entries = [e('2026-03-15', 'fuera', 1), e('2026-03-16', 'b', 2), e('2026-03-16', 'a', 1), e('2026-03-22', 'domingo', 1)]
  assert.equal(weekdayOf('2026-03-16'), 0)
  assert.equal(weekdayOf('2026-03-22'), 6)
  const days = weekTemplate(entries, '2026-03-19')
  assert.deepEqual(Object.keys(days), ['0', '6'])
  assert.deepEqual(days[0]!.map((x) => x.name), ['a', 'b'])
  const parsed = parseBackup(JSON.stringify({ sessions: [], routines: [], nutrition: { entries: [], foods: [], meals: [], week: { saved: Date.UTC(2026, 2, 19), days }, water: { '2026-03-16': 5, mal: 3 } } }))
  assert.deepEqual(parsed.nutrition.week!.days[6]!.map((x) => x.name), ['domingo'])
  assert.deepEqual(parsed.nutrition.water, { '2026-03-16': 5 })
})

test('última semana, día en texto, recordatorios y favoritos en la copia', () => {
  const e = (day: string, meal: MealKey, name: string, grams: number, p: number, kcal: number): FoodEntry => ({ id: day + name, day, meal, name, grams, per100: { kcal, p, c: 0, f: 0 }, at: 0 })
  const entries = [e('2026-03-09', 'lunch', 'Pollo', 200, 30, 150), e('2026-03-09', 'dinner', 'Arroz', 200, 3, 130), e('2026-03-12', 'lunch', 'Pollo', 100, 30, 150)]
  const w = lastWeek(entries, () => ({ ...goals, kcal: 560 }), '2026-03-15')
  assert.deepEqual([w.logged, Math.round(w.kcal), w.met, w.top?.name, w.top?.p], [2, 355, 1, 'Pollo', 90])
  const text = dayText(entries.filter((x) => x.day === '2026-03-09'), 'Mis comidas')
  assert.ok(text.includes('Comida (300 kcal)') && text.includes('- Pollo: 200 g') && text.includes('Total: 560 kcal'), text)
  // A las 16:00 sin nada apuntado: desayuno y comida pendientes; con la comida apuntada, solo el desayuno.
  const now = new Date(2026, 2, 16, 16, 0)
  assert.deepEqual(dueMeals([], now), ['breakfast', 'lunch'])
  assert.deepEqual(dueMeals([e('2026-03-16', 'lunch', 'x', 1, 0, 0)], now), ['breakfast'])
  const parsed = parseBackup(JSON.stringify({ sessions: [], routines: [], nutrition: { entries: [], foods: [], meals: [], favorites: ['basic:egg', 'off:8480000062505', 'raro'] } }))
  assert.deepEqual(parsed.nutrition.favorites, ['basic:egg', 'off:8480000062505'])
})
