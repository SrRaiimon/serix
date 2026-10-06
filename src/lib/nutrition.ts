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

/** Valores por 100 g: kilocalorías y gramos de proteína, carbohidratos y grasa. */
export interface Per100 { kcal: number; p: number; c: number; f: number }

/** De dónde sale un alimento: lista básica (id), Open Food Facts (código de barras) o propio (id). */
export interface FoodRef { kind: 'basic' | 'off' | 'mine'; id: string }

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
}

export interface SavedMeal {
  id: string
  name: string
  items: { name: string; grams: number; per100: Per100; ref?: FoodRef }[]
}

export interface NutritionData {
  entries: FoodEntry[]
  foods: MyFood[]
  meals: SavedMeal[]
}

export const emptyNutrition = (): NutritionData => ({ entries: [], foods: [], meals: [] })

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
  /** Ver solo la proteína (sin calorías ni el resto de macros), para quien no quiere contar calorías. */
  proteinOnly?: boolean
}

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
export function computeGoals(input: { sex: Sex; age: number; heightCm: number; weightKg: number; activity: number; aim: Aim }): NutritionGoals {
  const { sex, age, heightCm, weightKg, activity, aim } = input
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161)
  const factor = aim === 'lose' ? 0.8 : aim === 'gain' ? 1.1 : 1
  const kcal = Math.round((bmr * activity * factor) / 10) * 10
  const protein = Math.round(weightKg * (aim === 'lose' ? 2.2 : 1.8))
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat, ...input }
}

/** Valores de una cantidad en gramos. */
export function amountOf(per100: Per100, grams: number): Per100 {
  const k = grams / 100
  return { kcal: per100.kcal * k, p: per100.p * k, c: per100.c * k, f: per100.f * k }
}

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
  const r1 = (v: number) => Math.round(v * 10) / 10
  return {
    kcal: parts.reduce((n, x) => n + Math.round(x.kcal), 0),
    p: parts.reduce((n, x) => n + r1(x.p), 0),
    c: parts.reduce((n, x) => n + r1(x.c), 0),
    f: parts.reduce((n, x) => n + r1(x.f), 0),
  }
}

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
    per100: { kcal: Math.round(kcal), p: round1(p), c: round1(c), f: round1(f) },
    ...(grams && grams > 0 && grams < 2000 && (!servingUnit || servingUnit === 'g' || servingUnit === 'ml')
      ? { portion: { label: str(product.serving_size) ?? t('1 ración', '1 serving'), g: round1(grams) } } : {}),
  }
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
      if (!code || seen.has(code)) continue
      const parsed = parseOffProduct(code, { product }, lang())
      if (parsed) {
        seen.add(code)
        out.push(parsed)
      }
    }
    return out.slice(0, 25)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return 'offline'
  }
}

/** Códigos de producto válidos (EAN-8, UPC-A, EAN-13, ITF-14), con su dígito de control. */
export function validBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits.pop()!
  const total = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (total % 10)) % 10 === check
}
