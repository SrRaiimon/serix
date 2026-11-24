import { parseDecimal } from './format'
import { dataLang, lang, t } from './i18n'
import { clampPer100, optionals, type Per100, type Portion } from './nutrition'
import { fold } from './search'

// Productos escaneados y etiquetas: Open Food Facts, la etiqueta leída con la cámara y las comprobaciones de los valores.
// Salió de nutrition.ts (que lo reexporta) para partir el fichero; no depende de nada de él que se use al cargar.

// MARK: Open Food Facts

export interface ScannedProduct {
  barcode: string
  name: string
  brand?: string
  per100: Per100
  portion?: Portion
}

// Número o texto con un número, nunca negativo (Open Food Facts trae a veces «-40» como texto).
const n = (v: unknown) => {
  const x = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(x) && x >= 0 ? x : undefined
}

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
    per100: clampPer100({ kcal: Math.round(kcal), p: round1(p), c: round1(c), f: round1(f), ...optionals({ fiber: ok100(n(nut.fiber_100g)), sugar: ok100(n(nut.sugars_100g)), salt: ok100(n(nut.salt_100g)) }) }),
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
/** Un valor por 100 g posible, redondeado (la sal con dos decimales). */
const ok100 = (v?: number) => (v !== undefined && v >= 0 && v <= 100 ? Math.round(v * 100) / 100 : undefined)

/** Busca el producto en Open Food Facts. Solo se envía el código de barras. */
export async function fetchOffProduct(barcode: string, signal?: AbortSignal): Promise<ScannedProduct | undefined | 'offline'> {
  const fields = 'product_name,product_name_es,product_name_en,generic_name,generic_name_es,generic_name_en,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit'
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`, { signal })
    if (r.status === 404) return undefined
    if (!r.ok) return 'offline'
    return parseOffProduct(barcode, await r.json(), dataLang())
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
      const parsed = code ? parseOffProduct(code, { product }, dataLang()) : undefined
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
  for (const whole of lines) {
    // «Grasas 12 g de las cuales saturadas 3 g» en una sola línea: vale lo de antes de la subfila (antes se saltaba
    // la línea entera y se perdía la grasa).
    const cut = whole.search(sub)
    const line = cut < 0 ? whole : whole.slice(0, cut)
    if (!line.trim()) continue
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

// Límites del formulario de alimento propio; el campo vacío aún no necesita un aviso.
export function invalidFoodCalories(value: string): boolean {
  const kcal = parseDecimal(value)
  return value.trim() !== '' && (kcal === null || kcal < 0 || kcal > 1000)
}
export const cleanFoodName = (name: string): string => name.trim().slice(0, 80)
