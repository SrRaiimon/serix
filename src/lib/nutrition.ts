import { addDays, startOfWeek } from './format'
import { lang, t } from './i18n'

// Comidas: lo que comes cada día (calorías y macronutrientes) frente a un objetivo calculado con
// tus datos. Todo se guarda en el móvil. Los alimentos salen de tres sitios:
// - Lista básica (public/foods.json, generada con scripts/foods/build.py): tabla europea ANSES-CIQUAL
//   2020 (Licence Ouverte 2.0), con la energía calculada como en las etiquetas de la UE (Reglamento
//   1169/2011): los carbohidratos no incluyen la fibra.
// - Código de barras: Open Food Facts (ODbL). Solo se envía el código; el producto se guarda en
//   «Mis alimentos» para no volver a pedirlo.
// - Mis alimentos: los que creas tú.

export type MealKey = 'breakfast' | 'lunch' | 'snack' | 'dinner'
export const MEALS: MealKey[] = ['breakfast', 'lunch', 'snack', 'dinner']
export const mealLabel = (m: MealKey) => ({
  breakfast: t('Desayuno', 'Breakfast'),
  lunch: t('Comida', 'Lunch'),
  snack: t('Merienda', 'Snack'),
  dinner: t('Cena', 'Dinner'),
})[m]

/** Valores por 100 g: kilocalorías y gramos de proteína, carbohidratos y grasa (y fibra, si se sabe). */
export interface Per100 { kcal: number; p: number; c: number; f: number; fiber?: number }

/** De dónde sale un alimento: lista básica (id), Open Food Facts (código de barras) o propio (id). */
export interface FoodRef { kind: 'basic' | 'off' | 'mine' | 'quick'; id: string }

export interface FoodEntry {
  id: string
  /** Día en hora local, AAAA-MM-DD. */
  day: string
  meal: MealKey
  name: string
  grams: number
  /** Copia de los valores al apuntarlo: si luego cambias el alimento, lo comido ese día no cambia. */
  per100: Per100
  ref?: FoodRef
  at: number
}

export interface Portion { label: string; g: number }

export interface MyFood {
  id: string
  name: string
  brand?: string
  barcode?: string
  per100: Per100
  portion?: Portion
  source: 'mine' | 'off'
  /** Receta: sus ingredientes; los valores por 100 g y la ración salen de ellos. */
  recipe?: Recipe
}

export interface RecipeItem { name: string; grams: number; per100: Per100; ref?: FoodRef }

export interface Recipe {
  items: RecipeItem[]
  servings: number
  /** Lo que pesa el plato ya hecho (el agua se evapora o se absorbe); si no, la suma de ingredientes. */
  cookedG?: number
}

/** Valores de una receta: por 100 g del plato hecho, y cuánto pesa una ración. */
export function recipeValues(r: Recipe): { per100: Per100; total: Per100; weight: number; portionG: number } {
  const total = sum(r.items.map((i) => amountOf(i.per100, i.grams)))
  const weight = r.cookedG && r.cookedG > 0 ? r.cookedG : r.items.reduce((n, i) => n + i.grams, 0)
  const k = weight > 0 ? 100 / weight : 0
  const round = (v: number) => Math.round(v * 10) / 10
  return {
    per100: {
      kcal: Math.round(total.kcal * k), p: round(total.p * k), c: round(total.c * k), f: round(total.f * k),
      ...(r.items.every((i) => i.per100.fiber !== undefined) ? { fiber: round(r.items.reduce((n, i) => n + (i.per100.fiber! * i.grams) / 100, 0) * k) } : {}),
    },
    total, weight, portionG: Math.round(weight / Math.max(1, r.servings)),
  }
}

export interface WeekItem { meal: MealKey; name: string; grams: number; per100: Per100; ref?: FoodRef }

/** Día de la semana de un día, con el lunes como 0. */
export const weekdayOf = (day: string) => (fromDayKey(day).getDay() + 6) % 7

/** Semana tipo a partir de la semana (lunes a domingo) que contiene `day`: los días con algo apuntado. */
export function weekTemplate(entries: FoodEntry[], day: string): Partial<Record<number, WeekItem[]>> {
  const monday = shiftDay(day, -weekdayOf(day))
  const days: Partial<Record<number, WeekItem[]>> = {}
  for (let i = 0; i < 7; i++) {
    const items = entries.filter((e) => e.day === shiftDay(monday, i)).sort((a, b) => a.at - b.at)
      .map(({ meal, name, grams, per100, ref }) => ({ meal, name, grams, per100, ...(ref ? { ref } : {}) }))
    if (items.length) days[i] = items
  }
  return days
}

export interface SavedMeal {
  id: string
  name: string
  items: { name: string; grams: number; per100: Per100; ref?: FoodRef }[]
}

/** Menú propuesto para un día (ver mealPlan.ts): qué plato toca en cada comida y lo que has quitado. */
export interface DayPlan {
  day: string
  /** Para que «Rehacer» dé otro menú y el mismo día salga siempre igual. */
  seed: number
  /** Plato de cada comida, alimentos quitados y platos descartados con «Otra opción». */
  meals: Partial<Record<MealKey, { dish: string; removed?: string[]; skipped?: string[] }>>
}

/** Menú propuesto de un día, si lo hay. */
export const planFor = (n: { plans?: DayPlan[] }, day: string) => n.plans?.find((p) => p.day === day)

/** Lo que el generador ha aprendido de ti: platos aceptados y rechazados, y alimentos que quitas. */
export interface PlanPrefs {
  dishes: Record<string, { yes: number; no: number }>
  removed: Record<string, number>
}

export interface NutritionData {
  entries: FoodEntry[]
  foods: MyFood[]
  meals: SavedMeal[]
  /** Menús propuestos de hoy y de mañana. */
  plans?: DayPlan[]
  /** Vasos de agua (250 ml) de cada día. */
  water?: Record<string, number>
  /** Semana tipo: lo que se come cada día de la semana (0 = lunes), para volver a apuntarlo. */
  week?: { saved: number; days: Partial<Record<number, WeekItem[]>> }
  prefs?: PlanPrefs
  /** Días marcados a mano como de entreno (los días con entrenamiento ya cuentan solos). */
  trainingDays?: string[]
}

export const emptyNutrition = (): NutritionData => ({ entries: [], foods: [], meals: [] })

// MARK: Objetivo de cada día y resumen del mes

/** Lo máximo que se resta al día siguiente, en parte del objetivo: más sería comer demasiado poco. */
export const CARRY_OVER_MAX = 0.15

/**
 * Días de entreno y de descanso: los días que entrenas se suma un 10 % de calorías (en hidratos) y los
 * de descanso se resta lo justo para que la semana sume lo mismo, según cuántos días entrenas. La resta
 * nunca pasa del 15 %: si entrenas casi a diario, se suma menos. La proteína no cambia.
 */
export function trainingShift(kcal: number, perWeek: number): { up: number; down: number } {
  const t = Math.min(6, Math.max(1, Math.round(perWeek)))
  const up = Math.round((kcal * Math.min(0.1, (CARRY_OVER_MAX * (7 - t)) / t)) / 10) * 10
  return { up, down: Math.round((up * t) / (7 - t) / 10) * 10 }
}

export interface DayGoalOptions {
  /** Restar al día siguiente lo que te pasas. */
  carryOver: boolean
  /** Más calorías los días de entreno: qué días entrenaste (o marcaste) y cuántos días entrenas a la semana. */
  training?: { days: Set<string>; perWeek: number }
}

/** Objetivo base de un día: el de siempre, o el de entreno o descanso. */
function baseForDay(goals: NutritionGoals, day: string, opts: DayGoalOptions): NutritionGoals & { training?: boolean; shift: number } {
  if (!opts.training || goals.proteinOnly) return { ...goals, shift: 0 }
  const { up, down } = trainingShift(goals.kcal, opts.training.perWeek)
  const training = opts.training.days.has(day)
  const shift = training ? up : -down
  return { ...goals, kcal: goals.kcal + shift, carbs: Math.max(0, Math.round(goals.carbs + shift / 4)), training, shift }
}

/**
 * Objetivo de un día: el de entreno o descanso y, con la compensación activada, menos lo que te pasaste
 * el día anterior (como mucho un 15 % del objetivo y siempre de los hidratos; la proteína no se toca).
 * Se compara con el objetivo base del día anterior, no con el ya rebajado, para no encadenar recortes.
 */
export function goalsForDay(goals: NutritionGoals, entries: FoodEntry[], day: string, opts: DayGoalOptions): NutritionGoals & { carried: number; training?: boolean; shift: number } {
  const base = baseForDay(goals, day, opts)
  if (!opts.carryOver || goals.proteinOnly) return { ...base, carried: 0 }
  const prev = shiftDay(day, -1)
  const eaten = entries.filter((e) => e.day === prev)
  if (!eaten.length) return { ...base, carried: 0 }
  const over = dayTotals(eaten).kcal - baseForDay(goals, prev, opts).kcal
  const carried = over > 0 ? Math.min(Math.round(over / 10) * 10, Math.round((goals.kcal * CARRY_OVER_MAX) / 10) * 10) : 0
  if (!carried) return { ...base, carried: 0 }
  return { ...base, kcal: base.kcal - carried, carbs: Math.max(0, Math.round(base.carbs - carried / 4)), carried }
}

/** Opciones del objetivo diario a partir de los datos de la app (ajustes, entrenos y días marcados). */
export function dayGoalOptions(data: {
  sessions: { start: number }[]
  nutrition: { trainingDays?: string[] }
  settings: { nutritionCarryOver?: boolean; nutritionTrainingSplit?: boolean; weeklyGoal: number }
}): DayGoalOptions {
  const carryOver = data.settings.nutritionCarryOver !== false
  if (data.settings.nutritionTrainingSplit === false) return { carryOver }
  const days = new Set(data.nutrition.trainingDays ?? [])
  for (const s of data.sessions) days.add(dayKey(s.start))
  return { carryOver, training: { days, perWeek: data.settings.weeklyGoal } }
}

// MARK: Semanas

export interface WeekIntake {
  start: Date
  /** Media de calorías de los días con algo apuntado (0 si no hay ninguno). */
  kcal: number
  /** Días con algo apuntado. */
  days: number
  /** Peso medio de la semana, en kg (si te pesaste). */
  weight?: number
}

/** Últimas semanas (lunes a domingo, la actual incluida): calorías medias y peso medio. */
export function weeklyIntake(entries: FoodEntry[], weights: { date: number; weight?: number }[], weeks: number, now = Date.now()): WeekIntake[] {
  const current = startOfWeek(now)
  const byDay = new Map<string, FoodEntry[]>()
  for (const e of entries) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
  return Array.from({ length: weeks }, (_, n) => {
    const start = addDays(current, -7 * (weeks - 1 - n))
    const end = addDays(start, 7).getTime()
    const days = Array.from({ length: 7 }, (_, i) => byDay.get(dayKey(addDays(start, i)))).filter((d): d is FoodEntry[] => !!d?.length)
    const w = weights.filter((m) => m.weight !== undefined && m.date >= start.getTime() && m.date < end).map((m) => m.weight!)
    return {
      start,
      kcal: days.length ? Math.round(days.reduce((a, d) => a + dayTotals(d).kcal, 0) / days.length) : 0,
      days: days.length,
      ...(w.length ? { weight: w.reduce((a, b) => a + b, 0) / w.length } : {}),
    }
  })
}

// MARK: Ajuste según el peso

/** Ritmo sano de cambio de peso a la semana, en % del peso, para cada objetivo. */
export const WEIGHT_RATE: Record<Aim, [number, number]> = { lose: [-1, -0.25], keep: [-0.3, 0.3], gain: [0.1, 0.5] }
/** Lo que se propone cambiar cada vez. */
export const ADJUST_STEP = 150

export interface WeightAdvice {
  /** kg por semana (negativo: bajando). */
  rate: number
  /** % del peso por semana. */
  pct: number
  /** Calorías que se proponen sumar (+) o restar (−). */
  change: number
  /** Media de lo apuntado en esas semanas, si hay bastantes días apuntados. */
  eaten?: number
}

/**
 * Si en las últimas 3 semanas el peso no va al ritmo de tu objetivo, propone subir o bajar 150 kcal.
 * Hace falta pesarse al menos 4 veces en 14 días o más (la tendencia, no un día suelto). Si has
 * apuntado bastante comida y comes bastante más o menos de tu objetivo, no propone nada: primero hay
 * que comer lo que marca.
 */
export function weightAdvice(weights: { date: number; weight?: number }[], goals: NutritionGoals, entries: FoodEntry[], now = Date.now()): WeightAdvice | undefined {
  if (!goals.aim || goals.proteinOnly) return undefined
  const from = now - 21 * 86400000
  const points = weights.filter((m) => m.weight !== undefined && m.date >= from && m.date <= now).map((m) => ({ x: m.date / 86400000, y: m.weight! }))
  if (points.length < 4) return undefined
  const span = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))
  if (span < 14) return undefined
  // Recta de mínimos cuadrados: kg por día.
  const mx = points.reduce((n, p) => n + p.x, 0) / points.length
  const my = points.reduce((n, p) => n + p.y, 0) / points.length
  const slope = points.reduce((n, p) => n + (p.x - mx) * (p.y - my), 0) / points.reduce((n, p) => n + (p.x - mx) ** 2, 0)
  const rate = slope * 7
  const pct = (rate / my) * 100
  const [min, max] = WEIGHT_RATE[goals.aim]
  const change = pct < min ? ADJUST_STEP : pct > max ? -ADJUST_STEP : 0
  if (!change) return undefined
  // ¿Comes lo que marca el objetivo? Solo con 7 días apuntados o más.
  const fromDay = dayKey(from), today = dayKey(now)
  const byDay = new Map<string, FoodEntry[]>()
  for (const e of entries) if (e.day >= fromDay && e.day < today) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
  const eaten = byDay.size >= 7 ? Math.round([...byDay.values()].reduce((n, d) => n + dayTotals(d).kcal, 0) / byDay.size) : undefined
  if (eaten !== undefined && Math.abs(eaten - goals.kcal) > goals.kcal * 0.1) return undefined
  return { rate, pct, change, ...(eaten !== undefined ? { eaten } : {}) }
}

export type DayStatus = 'met' | 'over' | 'under'

/**
 * Cómo fue el día: cumplido si las calorías quedan a ±10 % del objetivo, pasado o corto si no. Con
 * «solo proteína», cumplido desde el 90 % de la proteína (no hay «pasarse»).
 */
export function dayStatus(totals: Per100, goals: NutritionGoals): DayStatus {
  if (goals.proteinOnly) return totals.p >= goals.protein * 0.9 ? 'met' : 'under'
  if (totals.kcal > goals.kcal * 1.1) return 'over'
  if (totals.kcal < goals.kcal * 0.9) return 'under'
  return 'met'
}

export type Sex = 'm' | 'f'
export type Aim = 'lose' | 'keep' | 'gain'

export interface NutritionGoals {
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Datos con los que se calculó (para recalcular); si los escribes a mano, no hay. */
  sex?: Sex
  age?: number
  heightCm?: number
  weightKg?: number
  activity?: number
  aim?: Aim
  /** Gramos de proteína por kilo con los que se calculó (si no, 1,8 o 2,2 según el objetivo). */
  proteinPerKg?: number
  /** Ver solo la proteína (sin calorías ni el resto de macros), para quien no quiere contar calorías. */
  proteinOnly?: boolean
  /** Calorías sumadas o restadas por el ajuste según el peso (ya incluidas en kcal; se conservan al recalcular). */
  adjust?: number
}

/** Suma (o resta) calorías al objetivo, en hidratos, y lo apunta como ajuste. */
export function adjustGoals(goals: NutritionGoals, change: number): NutritionGoals {
  const adjust = (goals.adjust ?? 0) + change
  return { ...goals, kcal: goals.kcal + change, carbs: Math.max(0, Math.round(goals.carbs + change / 4)), ...(adjust ? { adjust } : { adjust: undefined }) }
}

/** Proteína por kilo que se puede elegir (1,6 g/kg es el mínimo con beneficio claro para ganar músculo). */
export const PROTEIN_PER_KG = [1.6, 1.8, 2, 2.2]
export const defaultProteinPerKg = (aim: Aim) => (aim === 'lose' ? 2.2 : 1.8)

/** Factor de actividad (gasto del día respecto al metabolismo en reposo). */
export const ACTIVITY = [
  { value: 1.375, label: () => t('Poco activo', 'Lightly active'), detail: () => t('Trabajo sentado y entrenas 2-3 días', 'Desk job and 2-3 workouts a week') },
  { value: 1.55, label: () => t('Activo', 'Active'), detail: () => t('Entrenas 3-5 días o te mueves bastante', '3-5 workouts or on your feet a lot') },
  { value: 1.725, label: () => t('Muy activo', 'Very active'), detail: () => t('Entrenas 6-7 días o trabajo físico', '6-7 workouts or a physical job') },
]

export const AIMS: { id: Aim; label: () => string; detail: () => string }[] = [
  { id: 'lose', label: () => t('Perder grasa', 'Lose fat'), detail: () => t('Un 20 % menos de lo que gastas', '20% below what you burn') },
  { id: 'keep', label: () => t('Mantener', 'Maintain'), detail: () => t('Lo mismo que gastas', 'What you burn') },
  { id: 'gain', label: () => t('Ganar músculo', 'Build muscle'), detail: () => t('Un 10 % más de lo que gastas', '10% above what you burn') },
]

/**
 * Objetivo diario: metabolismo en reposo (Mifflin-St Jeor) × actividad, ajustado al objetivo.
 * Proteína por kilo de peso (más alta al perder grasa para conservar músculo), grasa ~25 % de las
 * calorías y el resto, carbohidratos.
 */
export function computeGoals(input: { sex: Sex; age: number; heightCm: number; weightKg: number; activity: number; aim: Aim; proteinPerKg?: number }): NutritionGoals {
  const { sex, age, heightCm, weightKg, activity, aim } = input
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161)
  const factor = aim === 'lose' ? 0.8 : aim === 'gain' ? 1.1 : 1
  const kcal = Math.round((bmr * activity * factor) / 10) * 10
  const protein = Math.round(weightKg * (input.proteinPerKg ?? defaultProteinPerKg(aim)))
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat, ...input }
}

/** Valores de una cantidad en gramos. */
export function amountOf(per100: Per100, grams: number): Per100 {
  const k = grams / 100
  return { kcal: per100.kcal * k, p: per100.p * k, c: per100.c * k, f: per100.f * k, ...(per100.fiber !== undefined ? { fiber: per100.fiber * k } : {}) }
}

/** Fibra recomendada al día para adultos (EFSA, ingesta adecuada). */
export const FIBER_GOAL = 25

/** Fibra del día: la de los alimentos que traen el dato, y cuántos no lo traen. */
export function dayFiber(entries: { per100: Per100; grams: number }[]): { g: number; missing: number } {
  return {
    g: entries.reduce((n, e) => n + ((e.per100.fiber ?? 0) * e.grams) / 100, 0),
    missing: entries.filter((e) => e.per100.fiber === undefined).length,
  }
}

/**
 * Agua recomendada en vasos de 250 ml (EFSA: 2,5 l al día los hombres y 2 l las mujeres en total; un
 * 20 % sale de la comida, el resto de lo que bebes).
 */
export const waterGoal = (sex?: Sex) => (sex === 'f' ? 6 : 8)

export function sum(items: Per100[]): Per100 {
  return items.reduce((a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f }), { kcal: 0, p: 0, c: 0, f: 0 })
}

export const entryTotals = (e: { per100: Per100; grams: number }) => amountOf(e.per100, e.grams)

/**
 * Totales para mostrar: cada alimento se redondea como se ve en su fila y se suman esos números, así
 * las comidas y el día cuadran con lo que se lee (sin 1451 frente a 1452 por los decimales).
 */
export const dayTotals = (entries: { per100: Per100; grams: number }[]) => {
  const parts = entries.map(entryTotals)
  return {
    kcal: parts.reduce((n, x) => n + Math.round(x.kcal), 0),
    p: parts.reduce((n, x) => n + shownGrams(x.p), 0),
    c: parts.reduce((n, x) => n + shownGrams(x.c), 0),
    f: parts.reduce((n, x) => n + shownGrams(x.f), 0),
  }
}

/** Gramos como se muestran: enteros desde 10 g, con un decimal por debajo (8,3 g; 11 g). */
export const shownGrams = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10)

/** AAAA-MM-DD en hora local. */
export function dayKey(d: Date | number = Date.now()): string {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + days))
}

export const fromDayKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Lo último que has apuntado, sin repetir (por nombre), para volver a añadirlo de un toque. */
export function recentFoods(entries: FoodEntry[], max = 12): FoodEntry[] {
  const seen = new Set<string>()
  const out: FoodEntry[] = []
  for (const e of [...entries].sort((a, b) => b.at - a.at)) {
    const key = e.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
    if (out.length >= max) break
  }
  return out
}

// MARK: Lista básica

export interface BasicFood {
  id: string
  es: string
  en: string
  /** Código del alimento en la tabla CIQUAL, para comprobar los valores. */
  ciqual: number
  kcal: number
  p: number
  c: number
  f: number
  fiber?: number
  portion: { es: string; en: string; g: number }
}

let basic: Promise<BasicFood[]> | undefined
export function loadBasicFoods(): Promise<BasicFood[]> {
  basic ??= fetch(`${import.meta.env.BASE_URL}foods.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { foods: BasicFood[] }) => d.foods)
    .catch((e) => { basic = undefined; throw e })
  return basic
}

/** Búsqueda sin tildes ni mayúsculas: todas las palabras tienen que aparecer. */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
export function matches(name: string, query: string): boolean {
  const n = fold(name)
  return fold(query).split(/\s+/).filter(Boolean).every((w) => n.includes(w))
}

// MARK: Open Food Facts

export interface ScannedProduct {
  barcode: string
  name: string
  brand?: string
  per100: Per100
  portion?: Portion
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)

/** Convierte la respuesta de Open Food Facts en un producto, o nada si no trae los valores por 100 g. */
export function parseOffProduct(barcode: string, json: unknown, language: 'es' | 'en' = 'es'): ScannedProduct | undefined {
  if (typeof json !== 'object' || json === null) return undefined
  const product = (json as { product?: Record<string, unknown> }).product
  if (!product) return undefined
  const nut = (product.nutriments ?? {}) as Record<string, unknown>
  const kcal = n(nut['energy-kcal_100g']) ?? (n(nut['energy_100g']) !== undefined ? n(nut['energy_100g'])! / 4.184 : undefined)
  const p = n(nut.proteins_100g), c = n(nut.carbohydrates_100g), f = n(nut.fat_100g)
  if (kcal === undefined || p === undefined || c === undefined || f === undefined) return undefined
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : undefined)
  // En Europa un envase trae el nombre en varios idiomas: primero el de la app, luego el principal.
  const other = language === 'es' ? 'en' : 'es'
  const name = str(product[`product_name_${language}`]) ?? str(product.product_name) ?? str(product[`product_name_${other}`])
    ?? str(product[`generic_name_${language}`]) ?? str(product.generic_name)
  if (!name) return undefined
  const grams = n(product.serving_quantity)
  const servingUnit = str(product.serving_quantity_unit)
  return {
    barcode,
    name,
    brand: str(product.brands)?.split(',')[0].trim(),
    per100: { kcal: Math.round(kcal), p: round1(p), c: round1(c), f: round1(f), ...(n(nut.fiber_100g) !== undefined && n(nut.fiber_100g)! <= 100 ? { fiber: round1(n(nut.fiber_100g)!) } : {}) },
    ...(grams && grams > 0 && grams < 2000 && (!servingUnit || servingUnit === 'g' || servingUnit === 'ml')
      ? { portion: { label: portionLabel(str(product.serving_size)), g: round1(grams) } } : {}),
  }
}

/**
 * Nombre de la ración de un envase. Open Food Facts trae textos como «15 g», «1 portion (100 g)» o
 * «2 galletas (25 g)»: se quitan los gramos (ya se muestran aparte) y, si no queda un nombre propio,
 * se llama «1 ración».
 */
export function portionLabel(text?: string): string {
  const rest = (text ?? '').replace(/\([^)]*\)/g, ' ').replace(/\b\d+([.,]\d+)?\s*(g|gr|grs|gramos|ml|cl|l)\b\.?/gi, ' ').replace(/\s+/g, ' ').trim()
  const generic = /^(\d+([.,]\d+)?\s*)?(x\s*)?(portions?|servings?|raci[oó]n(es)?|porci[oó]n(es)?|unidad(es)?|units?|serve)?$/i
  return !rest || generic.test(rest) ? t('1 ración', '1 serving') : rest.slice(0, 40)
}

/**
 * Valores que no cuadran: las kcal de la etiqueta frente a las que salen de los macros (4/4/9).
 * La fibra, los polialcoholes y el alcohol explican diferencias pequeñas; una grande suele ser un
 * error al teclear la ficha en Open Food Facts.
 */
export function doubtfulValues(v: Per100): boolean {
  const calc = 4 * v.p + 4 * v.c + 9 * v.f
  return Math.abs(calc - v.kcal) > Math.max(40, v.kcal * 0.3)
}

/**
 * El valor que más probablemente está mal cuando no cuadran: si los macros dan de más, el que más kcal
 * aporta (p. ej. 55 g de grasa en un yogur); si dan de menos, las kcal.
 */
export function suspectValue(v: Per100): 'kcal' | 'p' | 'c' | 'f' | undefined {
  if (!doubtfulValues(v)) return undefined
  if (4 * v.p + 4 * v.c + 9 * v.f < v.kcal) return 'kcal'
  return (['p', 'c', 'f'] as const).reduce((a, b) => ((b === 'f' ? 9 : 4) * v[b] > (a === 'f' ? 9 : 4) * v[a] ? b : a))
}

const round1 = (v: number) => Math.round(v * 10) / 10

/** Busca el producto en Open Food Facts. Solo se envía el código de barras. */
export async function fetchOffProduct(barcode: string, signal?: AbortSignal): Promise<ScannedProduct | undefined | 'offline'> {
  const fields = 'product_name,product_name_es,product_name_en,generic_name,generic_name_es,generic_name_en,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit'
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`, { signal })
    if (r.status === 404) return undefined
    if (!r.ok) return 'offline'
    return parseOffProduct(barcode, await r.json(), lang())
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return 'offline'
  }
}

/**
 * Busca productos por nombre en Open Food Facts (solo se envía el texto). En español, solo los que se
 * venden en España. Devuelve los que traen valores por 100 g; 'offline' si no responde.
 */
export async function searchOff(query: string, signal?: AbortSignal): Promise<ScannedProduct[] | 'offline'> {
  const fields = 'code,product_name,product_name_es,product_name_en,generic_name,generic_name_es,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit'
  const country = lang() === 'es' ? '&tagtype_0=countries&tag_contains_0=contains&tag_0=spain' : ''
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=40&fields=${fields}${country}`
  try {
    // Su buscador a veces está saturado (503, sin cabeceras CORS: el navegador lo ve como error de red);
    // un segundo intento al rato suele bastar.
    let r = await fetch(url, { signal }).catch((e: Error) => { if (e.name === 'AbortError') throw e; return undefined })
    if (!r?.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      r = await fetch(url, { signal })
    }
    if (!r.ok) return 'offline'
    const data = (await r.json()) as { products?: Record<string, unknown>[] }
    const seen = new Set<string>()
    const out: ScannedProduct[] = []
    for (const product of data.products ?? []) {
      const code = typeof product.code === 'string' ? product.code : ''
      const parsed = code ? parseOffProduct(code, { product }, lang()) : undefined
      // Sin repetir: ni el mismo código ni el mismo producto (nombre y marca) con otro código.
      const key = parsed && `${fold(parsed.name)}|${fold(parsed.brand ?? '')}`
      if (!parsed || seen.has(code) || seen.has(key!)) continue
      seen.add(code)
      seen.add(key!)
      out.push(parsed)
    }
    return rankProducts(out, query).slice(0, 25)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return 'offline'
  }
}

/**
 * Lo más parecido a lo buscado primero: el nombre con todas las palabras (sin contar la marca), que
 * empiece por la primera palabra y sea corto («Yogur natural» antes que «Turrón de yogur»).
 */
export function rankProducts<T extends { name: string; brand?: string }>(items: T[], query: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  const score = (p: T) => {
    const name = fold(p.name)
    const brand = fold(p.brand ?? '')
    const inName = words.filter((w) => name.includes(w)).length
    const inBrand = words.filter((w) => !name.includes(w) && brand.includes(w)).length
    const startsWithWord = words.some((w) => !brand.includes(w) && name.startsWith(w)) ? 2 : 0
    return inName * 3 + inBrand + startsWithWord - name.length / 100
  }
  return items.map((p, i) => ({ p, i, s: score(p) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.p)
}

/**
 * Un apunte rápido (calorías y macros de un plato, sin alimento): se guarda como una cantidad cuyos
 * valores por 100 g quedan dentro de lo normal, para que la copia de seguridad lo acepte igual.
 */
export function quickEntryAmount(total: Per100): { grams: number; per100: Per100 } {
  const factor = Math.max(1, Math.ceil(Math.max(total.kcal / 900, total.p / 100, total.c / 100, total.f / 100)))
  const grams = 100 * factor
  return { grams, per100: { kcal: total.kcal / factor, p: total.p / factor, c: total.c / factor, f: total.f / factor } }
}

/** Códigos de producto válidos (EAN-8, UPC-A, EAN-13, ITF-14), con su dígito de control. */
export function validBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits.pop()!
  const total = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (total % 10)) % 10 === check
}

// MARK: Etiqueta

/**
 * Valores por 100 g leídos de la tabla nutricional de un envase (texto de la foto, ver labelOcr.ts).
 * Las etiquetas de la UE (Reglamento 1169/2011) traen siempre la columna «por 100 g» primero, así que
 * de cada fila se toma la primera cifra. Reconoce los nombres en español, inglés, francés, alemán,
 * italiano y portugués; las filas «de las cuales» (saturadas, azúcares) se ignoran.
 */
export function parseNutritionLabel(text: string): Partial<Per100> & { portion?: number } {
  let lines = fold(text).replace(/(\d)\s*[,·]\s*(\d)/g, '$1.$2').split(/\n+/)
  // Tesseract confunde a menudo la «g» de la unidad con un 9 pegado a una cifra con decimales («7,0 g» →
  // «7,09»). Las etiquetas dan grasas, hidratos y proteínas con un decimal: un segundo decimal 9 sin «g»
  // detrás es la unidad.
  const nutrient = /gras|lipid|fat\b|fett|grass|gordur|hidrat|carbo|glucid|kohlen|protei|eiwei/
  lines = lines.map((l) => (nutrient.test(l) ? l.replace(/(\d+\.\d)9(?!\d|\s*m?g\b)/g, '$1') : l))
  // Cada cifra da una o dos lecturas: la literal y, si es un entero acabado en 9 sin «g» detrás («13 g» →
  // «139»), la misma sin ese 9. Luego se elige la combinación que cuadra con las kcal.
  const readings = (s: string): number[] | undefined => {
    const m = s.match(/(<\s*)?(\d+(?:\.\d+)?)(\s*m?g\b)?/)
    if (!m) return undefined
    if (m[1]) return [0]
    const v = Number(m[2])
    return !m[3] && /^\d+9$/.test(m[2]) ? [v, Number(m[2].slice(0, -1))] : [v]
  }
  const sub = /saturad|saturat|satur|gesattig|monoinsat|polyinsat|poliinsat|trans|azucar|sugar|sucre|zucker|zuccher|acucar|polialcoh|polyol|almidon|starch|fibra|fibre|fiber|ballast/
  const after = (line: string, re: RegExp) => {
    const m = line.match(re)
    return m ? line.slice((m.index ?? 0) + m[0].length) : undefined
  }
  const names = {
    f: /grasas?|lipidos|fat\b|matieres grasses|fett\b|grassi|gorduras?/,
    c: /hidratos de carbono|carbohidratos|carbohydrates?|glucides|kohlenhydrate|carboidrati/,
    p: /proteinas?|proteins?|proteines?|eiwei(?:ss|ß)|proteine/,
  }
  const found: Partial<Record<'f' | 'c' | 'p', number[]>> = {}
  for (const line of lines) {
    if (sub.test(line)) continue
    for (const k of ['f', 'c', 'p'] as const) {
      if (found[k]) continue
      const rest = after(line, names[k])
      const r = rest === undefined ? undefined : readings(rest)
      // Valores imposibles por 100 g: mejor dejarlos vacíos que proponer algo absurdo.
      const ok = r?.filter((v) => v <= 100)
      if (ok?.length) found[k] = ok
      else if (r) found[k] = []
    }
  }
  const out: Partial<Per100> & { portion?: number } = {}
  // Energía: la primera cifra en kcal; si solo viene en kJ, se pasa a kcal (1 kcal = 4,184 kJ).
  const flat = lines.join(' ')
  const kcal = flat.match(/(\d+(?:\.\d+)?)\s*kcal/)
  const kj = flat.match(/(\d+(?:\.\d+)?)\s*kj/)
  if (kcal) out.kcal = Number(kcal[1])
  else if (kj) out.kcal = Math.round(Number(kj[1]) / 4.184)
  if (out.kcal !== undefined && out.kcal > 1000) delete out.kcal
  // Elige, entre las lecturas posibles, la que más se acerca a 4·p + 4·c + 9·f = kcal (sin kcal, la literal).
  const pick = (k: 'f' | 'c' | 'p') => {
    const r = found[k]
    if (!r?.length) return
    if (r.length === 1 || out.kcal === undefined) { out[k] = r[0]; return }
    const val = (j: 'f' | 'c' | 'p', v: number) => (j === k ? v : (out[j] ?? found[j]?.[0] ?? 0))
    const err = (v: number) => Math.abs(4 * val('p', v) + 4 * val('c', v) + 9 * val('f', v) - out.kcal!)
    out[k] = err(r[1]) < err(r[0]) ? r[1] : r[0]
  }
  for (const k of ['f', 'c', 'p'] as const) if (found[k]?.length === 1) pick(k)
  for (const k of ['f', 'c', 'p'] as const) if ((found[k]?.length ?? 0) > 1) pick(k)
  // Peso de la ración, si la etiqueta lo da («por ración (30 g)», «per serving 30g»).
  const portion = flat.match(/(?:racion|porcion|serving|portion|porzione|porcao)[^\d\n]{0,15}(\d+(?:\.\d+)?)\s*(?:g|ml)\b/)
  if (portion && Number(portion[1]) > 0 && Number(portion[1]) <= 2000) out.portion = Number(portion[1])
  return out
}
