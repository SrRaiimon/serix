import { dataLang } from './i18n'
import { ALL_MEALS, dayTotals, fold, MEALS, optionals, shiftDay, type BasicFood, type DayPlan, type FoodEntry, type FoodRef, type MealKey, type NutritionData, type Per100, type PlanPrefs } from './nutrition'

// Menú del día propuesto: un plato por comida, con las cantidades ajustadas a lo que te queda del
// objetivo. Los platos salen de una lista base (alimentos de la lista básica) y de lo que tú comes:
// una comida que has apuntado igual dos o más veces se convierte en un plato tuyo. Aprende de lo que
// aceptas, lo que cambias y los alimentos que quitas, y prefiere lo que sueles comer en cada comida.

/**
 * Qué hace cada alimento al ajustar: «p» sube o baja la proteína, «c» las calorías, «f» (aceite, frutos
 * secos) completa las calorías cuando los hidratos llegan a su límite, y «x» va fijo.
 */
type Role = 'p' | 'c' | 'f' | 'x'

export interface DishItem {
  /** Id de la lista básica, o «n:» + el nombre para los demás. */
  key: string
  name: string
  per100: Per100
  ref?: FoodRef
  role: Role
  g: number
  min: number
  max: number
  /** Redondeo: 5 o 10 g, o una unidad entera (1 huevo, 1 rebanada). */
  step: number
}

export interface Dish {
  id: string
  meal: MealKey
  name: string
  items: DishItem[]
  /** Plato sacado de lo que tú comes. */
  mine?: boolean
  /** Veces que lo has comido (platos tuyos). */
  times?: number
}

/** Reparto del objetivo del día entre las comidas. */
export const MEAL_SPLIT: Record<MealKey, number> = { breakfast: 0.25, brunch: 0.1, lunch: 0.35, snack: 0.12, dinner: 0.28, supper: 0.08 }

// Platos base: [alimento, papel, gramos, mínimo, máximo, por unidades]. Sin mínimo ni máximo, va fijo.
type Spec = [id: string, role: Role, g: number, min?: number, max?: number, units?: boolean]
const BASE: { id: string; meal: MealKey; es: string; en: string; items: Spec[] }[] = [
  { id: 'b-oats', meal: 'breakfast', es: 'Avena con leche y plátano', en: 'Oats with milk and banana', items: [['oats', 'c', 50, 30, 120], ['milk-semi', 'x', 250], ['quark', 'p', 125, 0, 375], ['banana', 'x', 120]] },
  { id: 'b-toast-ham', meal: 'breakfast', es: 'Tostadas con tomate y jamón', en: 'Toast with tomato and ham', items: [['bread-whole', 'c', 80, 40, 200, true], ['tomato', 'x', 60], ['olive-oil', 'f', 5, 5, 20], ['serrano', 'p', 30, 15, 90], ['coffee-milk', 'x', 200]] },
  { id: 'b-eggs', meal: 'breakfast', es: 'Huevos revueltos con tostada', en: 'Scrambled eggs on toast', items: [['egg-scrambled', 'p', 120, 60, 240], ['bread', 'c', 60, 30, 180], ['orange', 'x', 150]] },
  { id: 'b-quark', meal: 'breakfast', es: 'Queso batido con muesli y fresas', en: 'Quark with muesli and strawberries', items: [['quark', 'p', 250, 125, 500], ['muesli', 'c', 50, 30, 120], ['strawberries', 'x', 150]] },
  { id: 'b-turkey', meal: 'breakfast', es: 'Tostadas de pavo y aguacate', en: 'Turkey and avocado toast', items: [['sandwich-loaf-whole', 'c', 50, 25, 100, true], ['turkey-slices', 'p', 60, 30, 120], ['avocado', 'f', 40, 20, 80], ['coffee-milk', 'x', 200]] },

  { id: 'l-chicken-rice', meal: 'lunch', es: 'Pollo con arroz y brócoli', en: 'Chicken with rice and broccoli', items: [['chicken-breast', 'p', 150, 100, 250], ['rice', 'c', 200, 100, 500], ['broccoli', 'x', 150], ['olive-oil', 'f', 10, 5, 30]] },
  { id: 'l-pasta-tuna', meal: 'lunch', es: 'Pasta con atún y tomate', en: 'Pasta with tuna and tomato', items: [['pasta', 'c', 220, 120, 500], ['tuna-canned', 'p', 112, 56, 168, true], ['tomato', 'x', 120], ['olive-oil', 'f', 10, 5, 30]] },
  { id: 'l-lentils', meal: 'lunch', es: 'Lentejas con huevo y ensalada', en: 'Lentils with egg and salad', items: [['lentils', 'c', 300, 200, 500], ['egg-boiled', 'p', 60, 0, 180, true], ['lettuce', 'x', 80], ['olive-oil', 'f', 10, 5, 30]] },
  { id: 'l-beef-potato', meal: 'lunch', es: 'Ternera con patata asada y judías', en: 'Beef with baked potato and green beans', items: [['beef-steak', 'p', 150, 100, 250], ['potato-baked', 'c', 250, 120, 600], ['green-beans', 'x', 150], ['olive-oil', 'f', 10, 5, 30]] },
  { id: 'l-chickpeas-cod', meal: 'lunch', es: 'Garbanzos con bacalao y espinacas', en: 'Chickpeas with cod and spinach', items: [['chickpeas', 'c', 250, 150, 500], ['cod', 'p', 120, 80, 250], ['spinach', 'x', 60], ['olive-oil', 'f', 10, 5, 30]] },
  { id: 'l-turkey-rice', meal: 'lunch', es: 'Pavo con arroz integral y pimiento', en: 'Turkey with brown rice and pepper', items: [['turkey-breast', 'p', 150, 100, 250], ['rice-brown', 'c', 200, 100, 500], ['pepper', 'x', 150], ['olive-oil', 'f', 10, 5, 30]] },

  { id: 's-quark', meal: 'snack', es: 'Queso batido con arándanos y avena', en: 'Quark with blueberries and oats', items: [['quark', 'p', 250, 125, 500], ['blueberries', 'x', 75], ['oats', 'c', 30, 0, 60]] },
  { id: 's-sandwich', meal: 'snack', es: 'Bocadillo de pavo', en: 'Turkey sandwich', items: [['bread', 'c', 80, 40, 120], ['turkey-slices', 'p', 60, 30, 120], ['tomato', 'x', 60]] },
  { id: 's-yogurt', meal: 'snack', es: 'Yogur con nueces, miel y kiwi', en: 'Yogurt with walnuts, honey and kiwi', items: [['yogurt-plain', 'p', 125, 125, 375, true], ['walnuts', 'f', 15, 0, 30], ['honey', 'c', 10, 0, 30], ['kiwi', 'x', 75]] },
  { id: 's-ricecakes', meal: 'snack', es: 'Tortitas con crema de cacahuete y leche', en: 'Rice cakes with peanut butter and milk', items: [['rice-cakes', 'c', 24, 16, 48, true], ['peanut-butter', 'f', 16, 8, 32], ['milk-semi', 'p', 250, 200, 400]] },
  { id: 's-banana-milk', meal: 'snack', es: 'Plátano y un vaso de leche', en: 'Banana and a glass of milk', items: [['banana', 'c', 120, 120, 240, true], ['milk-semi', 'p', 250, 200, 400]] },

  { id: 'd-salmon', meal: 'dinner', es: 'Salmón con patata y calabacín', en: 'Salmon with potato and courgette', items: [['salmon', 'p', 150, 100, 220], ['potato-boiled', 'c', 200, 0, 500], ['zucchini', 'x', 200], ['olive-oil', 'f', 5, 5, 20]] },
  { id: 'd-omelette', meal: 'dinner', es: 'Tortilla francesa con ensalada y pan', en: 'Omelette with salad and bread', items: [['egg', 'p', 120, 120, 240, true], ['olive-oil', 'f', 5, 5, 20], ['lettuce', 'x', 80], ['tomato', 'x', 120], ['bread', 'c', 60, 0, 120]] },
  { id: 'd-hake', meal: 'dinner', es: 'Merluza con boniato y judías verdes', en: 'Hake with sweet potato and green beans', items: [['hake', 'p', 200, 150, 300], ['sweet-potato', 'c', 150, 0, 500], ['green-beans', 'x', 150], ['olive-oil', 'f', 10, 5, 30]] },
  { id: 'd-wrap', meal: 'dinner', es: 'Wraps de pollo', en: 'Chicken wraps', items: [['chicken-breast', 'p', 120, 80, 200], ['tortilla-wheat', 'c', 120, 60, 240, true], ['lettuce', 'x', 40], ['tomato', 'x', 60]] },
  { id: 'd-potato-tuna', meal: 'dinner', es: 'Ensalada de patata con atún y huevo', en: 'Potato salad with tuna and egg', items: [['potato-boiled', 'c', 200, 100, 500], ['tuna-canned', 'p', 112, 56, 168, true], ['egg-boiled', 'x', 60], ['tomato', 'x', 120], ['olive-oil', 'f', 10, 5, 30]] },
  { id: 'd-tofu', meal: 'dinner', es: 'Tofu salteado con arroz y champiñones', en: 'Stir-fried tofu with rice and mushrooms', items: [['tofu', 'p', 150, 100, 250], ['rice', 'c', 150, 0, 400], ['mushrooms', 'x', 100], ['olive-oil', 'f', 10, 5, 30]] },
]

export const itemKey = (e: { name: string; ref?: FoodRef }) => (e.ref?.kind === 'basic' ? e.ref.id : `n:${fold(e.name)}`)

/** Papel de un alimento según de dónde le vienen las calorías. */
function roleOf(v: Per100): Role {
  const p = 4 * v.p, c = 4 * v.c, f = 9 * v.f
  const total = p + c + f
  if (total <= 0) return 'x'
  // Proteína: lo que la aporta en buena parte (pollo, atún) o en cantidad aunque tenga grasa (huevo).
  if (p / total >= 0.4 || (v.p >= 10 && p / total >= 0.25)) return 'p'
  if (c / total >= 0.55) return 'c'
  return 'x'
}

/** Comidas apuntadas de los últimos 60 días, por comida y día. */
function recentMeals(entries: FoodEntry[], today: string) {
  const from = shiftDay(today, -60)
  const groups = new Map<string, FoodEntry[]>()
  for (const e of entries) {
    if (e.day < from || e.day >= today || e.ref?.kind === 'quick' || e.grams < 5) continue
    const k = `${e.day}|${e.meal}`
    groups.set(k, [...(groups.get(k) ?? []), e])
  }
  return [...groups.values()]
}

/** Platos base que se pueden hacer con la lista básica y platos tuyos (lo que repites). */
export function buildDishes(basic: BasicFood[], entries: FoodEntry[], today: string): Dish[] {
  const en = dataLang() === 'en'
  const byId = new Map(basic.map((f) => [f.id, f]))
  const base: Dish[] = []
  for (const d of BASE) {
    const items: DishItem[] = []
    for (const [id, role, g, min, max, units] of d.items) {
      const f = byId.get(id)
      if (!f) break
      items.push({
        key: id, name: en ? f.en : f.es, per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f, ...optionals(f) }, ref: { kind: 'basic', id },
        role, g, min: min ?? g, max: max ?? g, step: units ? f.portion.g : g >= 50 ? 10 : 5,
      })
    }
    if (items.length === d.items.length) base.push({ id: d.id, meal: d.meal, name: en ? d.en : d.es, items })
  }
  // Tuyos: la misma combinación de alimentos en la misma comida, dos días o más.
  const combos = new Map<string, { meal: MealKey; last: FoodEntry[]; times: number }>()
  for (const group of recentMeals(entries, today)) {
    const keys = [...new Set(group.map(itemKey))].sort()
    if (keys.length > 6) continue
    const id = `h:${group[0].meal}:${keys.join('+')}`
    const prev = combos.get(id)
    const newer = !prev || group[0].day > prev.last[0].day
    combos.set(id, { meal: group[0].meal, last: newer ? group : prev.last, times: (prev?.times ?? 0) + 1 })
  }
  const mine: Dish[] = []
  for (const [id, c] of combos) {
    if (c.times < 2) continue
    // En tus platos todo se ajusta (menos verduras y bebidas sin apenas calorías), pero poco: entre un
    // 60 % y un 150 % de lo que sueles poner, para que siga siendo tu plato.
    const items = c.last.map((e): DishItem => {
      const v = e.per100
      const role = v.kcal < 40 ? 'x' : roleOf(v) !== 'x' ? roleOf(v) : (9 * v.f) / Math.max(1, 4 * v.p + 4 * v.c + 9 * v.f) >= 0.6 ? 'f' : 'c'
      return {
        key: itemKey(e), name: e.name, per100: e.per100, ref: e.ref, role, g: e.grams,
        min: role === 'x' ? e.grams : e.grams * 0.6, max: role === 'x' ? e.grams : e.grams * 1.5, step: e.grams >= 50 ? 10 : 5,
      }
    })
    mine.push({ id, meal: c.meal, name: c.last.map((e) => e.name).join(', '), items, mine: true, times: c.times })
  }
  return [...mine, ...base]
}

// MARK: Cantidades

export interface PlannedItem { key: string; name: string; per100: Per100; ref?: FoodRef; grams: number }

const amount = (items: { per100: Per100 }[], grams: number[], k: 'kcal' | 'p' | 'c' | 'f') => items.reduce((n, x, i) => n + (x.per100[k] * grams[i]) / 100, 0)

/**
 * Cantidades del plato para unas calorías y una proteína: los alimentos «p» se ajustan a la proteína,
 * los «c» a las calorías que faltan, dentro de sus límites, y se redondea a cantidades de verdad.
 */
export function fitDish(dish: Dish, target: { kcal: number; p: number }, removed: string[] = []): PlannedItem[] {
  const items = dish.items.filter((i) => !removed.includes(i.key))
  const grams = items.map((i) => i.g)
  const clamp = (i: DishItem, g: number) => Math.min(i.max, Math.max(i.min, g))
  const scale = (role: Role, k: 'p' | 'kcal', goal: number) => {
    const idx = items.map((x, n) => (x.role === role ? n : -1)).filter((n) => n >= 0)
    if (!idx.length) return
    const own = amount(idx.map((n) => items[n]), idx.map((n) => grams[n]), k)
    const rest = amount(items, grams, k) - own
    if (own <= 0) return
    const factor = Math.max(0, (goal - rest) / own)
    for (const n of idx) grams[n] = clamp(items[n], grams[n] * factor)
  }
  for (let round = 0; round < 4; round++) {
    scale('p', 'p', target.p)
    scale('c', 'kcal', target.kcal)
    scale('f', 'kcal', target.kcal)
  }
  // Redondeo a cantidades de verdad. La proteína primero (hacia arriba desde un tercio de unidad: mejor
  // un huevo de más que quedarse corto) y luego se reajustan las calorías con lo redondeado.
  const snap = (n: number, up = 0.5) => {
    const i = items[n]
    const lo = Math.ceil(i.min / i.step) * i.step, hi = Math.max(lo, Math.floor(i.max / i.step) * i.step)
    grams[n] = Math.min(hi, Math.max(lo, Math.floor(grams[n] / i.step + 1 - up) * i.step))
  }
  items.forEach((i, n) => i.role === 'p' && snap(n, 0.35))
  scale('c', 'kcal', target.kcal)
  scale('f', 'kcal', target.kcal)
  items.forEach((i, n) => i.role !== 'p' && snap(n))
  return items.map((i, n) => ({ key: i.key, name: i.name, per100: i.per100, ref: i.ref, grams: grams[n] })).filter((x) => x.grams > 0)
}

/** Calorías y proteína que tocan a cada comida pendiente: lo que queda del día, repartido. */
export function mealTargets(goal: { kcal: number; protein: number }, dayEntries: FoodEntry[], pending: MealKey[]): Partial<Record<MealKey, { kcal: number; p: number }>> {
  const eaten = dayTotals(dayEntries)
  const kcal = Math.max(0, goal.kcal - eaten.kcal), p = Math.max(0, goal.protein - eaten.p)
  const share = pending.reduce((n, m) => n + MEAL_SPLIT[m], 0)
  return Object.fromEntries(pending.map((m) => [m, { kcal: (kcal * MEAL_SPLIT[m]) / share, p: (p * MEAL_SPLIT[m]) / share }]))
}

// MARK: Elegir y aprender

export const emptyPrefs = (): PlanPrefs => ({ dishes: {}, removed: {} })

/** Cuánto apetece un plato: lo que sueles comer en esa comida, lo que aceptas y lo que quitas o cambias. */
export function dishWeight(dish: Dish, prefs: PlanPrefs, usual: Map<string, number>): number {
  let w = dish.mine ? 3 + Math.min(dish.times ?? 0, 6) : 1
  // Alimentos que sueles apuntar en esta comida (cada uno suma, hasta ×3).
  w *= Math.min(3, 1 + dish.items.reduce((n, i) => n + Math.min(usual.get(i.key) ?? 0, 4) * 0.1, 0))
  const f = prefs.dishes[dish.id]
  if (f) w *= (1 + f.yes) / (1 + 2 * f.no)
  for (const i of dish.items) if ((prefs.removed[i.key] ?? 0) >= 2 && i.role !== 'x') w *= 0.3
  return w
}

/** Veces que has apuntado cada alimento en cada comida (últimos 60 días). */
export function usualFoods(entries: FoodEntry[], today: string): Record<MealKey, Map<string, number>> {
  const out = Object.fromEntries(ALL_MEALS.map((m) => [m, new Map<string, number>()])) as Record<MealKey, Map<string, number>>
  for (const group of recentMeals(entries, today))
    for (const key of new Set(group.map(itemKey))) out[group[0].meal].set(key, (out[group[0].meal].get(key) ?? 0) + 1)
  return out
}

/** Número pseudoaleatorio repetible (mulberry32): el mismo día y semilla, el mismo menú. */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261)

/** Plato principal (proteína) de un plato, para no repetir pollo en la comida y en la cena. */
const mainOf = (d: Dish) => d.items.find((i) => i.role === 'p')?.key

/** Cuánto se aleja el plato ajustado de lo que toca (0 = clavado). */
export function fitError(dish: Dish, target: { kcal: number; p: number }): number {
  const v = dayTotals(fitDish(dish, target))
  return Math.max(Math.abs(v.kcal - target.kcal) / Math.max(target.kcal, 1), (target.p - v.p) / Math.max(target.p, 1))
}

export function pickDish(dishes: Dish[], meal: MealKey, opts: { seed: number; day: string; prefs: PlanPrefs; usual: Map<string, number>; skip?: string[]; avoid?: Set<string>; target?: { kcal: number; p: number } }): Dish | undefined {
  const options = dishes.filter((d) => d.meal === meal && !opts.skip?.includes(d.id))
  const pool = options.length ? options : dishes.filter((d) => d.meal === meal)
  if (!pool.length) return undefined
  const weights = pool.map((d) => {
    const main = mainOf(d)
    // Un plato que no llega a cuadrar con tus cifras (muchas calorías o muy pocas) sale menos.
    const err = opts.target ? fitError(d, opts.target) : 0
    // A los tuyos se les perdona más: lo que comes de verdad pesa más que cuadrar al gramo.
    const fit = err <= 0.12 ? 1 : err <= 0.25 ? 0.35 : 0.08
    return dishWeight(d, opts.prefs, opts.usual) * (main && opts.avoid?.has(main) ? 0.25 : 1) * (d.mine && err <= 0.4 ? Math.max(fit, 0.6) : fit)
  })
  let r = random(opts.seed ^ hash(`${opts.day}|${meal}|${opts.skip?.length ?? 0}`))() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

/** Menú de un día: un plato por comida, sin repetir el principal. */
export function makePlan(dishes: Dish[], data: Pick<NutritionData, 'entries' | 'prefs'>, day: string, seed: number, targets: Partial<Record<MealKey, { kcal: number; p: number }>> = {}): DayPlan {
  const usual = usualFoods(data.entries, day)
  const prefs = data.prefs ?? emptyPrefs()
  const avoid = new Set<string>()
  const meals: DayPlan['meals'] = {}
  for (const meal of MEALS) {
    const dish = pickDish(dishes, meal, { seed, day, prefs, usual: usual[meal], avoid, target: targets[meal] })
    if (!dish) continue
    meals[meal] = { dish: dish.id }
    const main = mainOf(dish)
    if (main) avoid.add(main)
  }
  return { day, seed, meals }
}

/** Aprende: plato aceptado o cambiado. */
export function rateDish(prefs: PlanPrefs | undefined, id: string, liked: boolean): PlanPrefs {
  const p = prefs ?? emptyPrefs()
  const now = p.dishes[id] ?? { yes: 0, no: 0 }
  return { ...p, dishes: { ...p.dishes, [id]: liked ? { ...now, yes: now.yes + 1 } : { ...now, no: now.no + 1 } } }
}

/** Aprende: alimento quitado de un plato. */
export function rateRemoved(prefs: PlanPrefs | undefined, key: string): PlanPrefs {
  const p = prefs ?? emptyPrefs()
  return { ...p, removed: { ...p.removed, [key]: (p.removed[key] ?? 0) + 1 } }
}
