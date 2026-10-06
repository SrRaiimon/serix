import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseBackup } from '../src/lib/backup'
import { amountOf, computeGoals, dayKey, dayTotals, matches, parseOffProduct, quickEntryAmount, rankProducts, recentFoods, searchOff, shiftDay, validBarcode, type BasicFood, type FoodEntry } from '../src/lib/nutrition'

test('objetivo: Mifflin-St Jeor × actividad, ajustado al objetivo, con proteína por kilo', () => {
  // Hombre, 30 años, 178 cm, 80 kg: 10·80 + 6,25·178 − 5·30 + 5 = 1767,5 kcal en reposo.
  const gain = computeGoals({ sex: 'm', age: 30, heightCm: 178, weightKg: 80, activity: 1.55, aim: 'gain' })
  assert.equal(gain.kcal, 3010) // 1767,5 × 1,55 × 1,1, redondeado a 10
  assert.equal(gain.protein, 144) // 1,8 g/kg
  assert.equal(gain.fat, 84) // 25 % de las calorías
  assert.equal(gain.carbs, Math.round((3010 - 144 * 4 - 84 * 9) / 4))
  // Mujer que pierde grasa: −20 % y más proteína (2,2 g/kg).
  const lose = computeGoals({ sex: 'f', age: 40, heightCm: 165, weightKg: 70, activity: 1.375, aim: 'lose' })
  assert.equal(lose.kcal, Math.round(((10 * 70 + 6.25 * 165 - 5 * 40 - 161) * 1.375 * 0.8) / 10) * 10)
  assert.equal(lose.protein, 154)
})

test('cantidades y totales del día', () => {
  const oats = { kcal: 367, p: 13.3, c: 57.9, f: 6.5 }
  assert.deepEqual(amountOf(oats, 50), { kcal: 183.5, p: 6.65, c: 28.95, f: 3.25 })
  const entry = (name: string, grams: number, at: number): FoodEntry => ({ id: name + at, day: '2026-01-05', meal: 'breakfast', name, grams, per100: oats, at })
  assert.equal(Math.round(dayTotals([entry('a', 40, 1), entry('b', 60, 2)]).kcal), 367)
  // Recientes: lo último primero y sin repetir el mismo alimento.
  assert.deepEqual(recentFoods([entry('Avena', 40, 1), entry('Leche', 250, 2), entry('avena', 60, 3)]).map((e) => `${e.name} ${e.grams}`), ['avena 60', 'Leche 250'])
})

test('días en hora local y búsqueda sin tildes', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28')
  assert.equal(shiftDay('2025-12-31', 1), '2026-01-01')
  assert.ok(matches('Plátano', 'platano'))
  assert.ok(matches('Pechuga de pollo (hecha)', 'pollo pechuga'))
  assert.ok(!matches('Pechuga de pavo', 'pollo'))
})

test('códigos de barras: EAN-13, EAN-8 y UPC-A con dígito de control', () => {
  assert.ok(validBarcode('3017620422003')) // EAN-13
  assert.ok(validBarcode('96385074')) // EAN-8
  assert.ok(validBarcode('036000291452')) // UPC-A
  assert.ok(!validBarcode('3017620422004')) // dígito de control mal
  assert.ok(!validBarcode('12345'))
  assert.ok(!validBarcode('30176204220a3'))
})

test('Open Food Facts: valores por 100 g, nombre en el idioma de la app y ración en gramos', () => {
  const json = {
    product: {
      product_name: 'Pâte à tartiner', product_name_es: 'Crema de cacao', product_name_en: 'Cocoa spread', brands: 'Marca, Otra',
      serving_size: '15 g', serving_quantity: 15,
      nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
    },
  }
  assert.deepEqual(parseOffProduct('3017620422003', json, 'es'), {
    barcode: '3017620422003', name: 'Crema de cacao', brand: 'Marca', per100: { kcal: 539, p: 6.3, c: 57.5, f: 30.9 }, portion: { label: '15 g', g: 15 },
  })
  assert.equal(parseOffProduct('3017620422003', json, 'en')?.name, 'Cocoa spread')
  // Solo la energía en kJ (habitual en etiquetas de la UE): se pasa a kcal.
  const kj = { product: { product_name: 'Yogur', nutriments: { energy_100g: 418.4, proteins_100g: '4', carbohydrates_100g: 5, fat_100g: 1 } } }
  assert.equal(parseOffProduct('96385074', kj)?.per100.kcal, 100)
  // Sin valores o sin nombre: no sirve.
  assert.equal(parseOffProduct('96385074', { product: { product_name: 'X', nutriments: { proteins_100g: 1 } } }), undefined)
  assert.equal(parseOffProduct('96385074', { product: { nutriments: { 'energy-kcal_100g': 1, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } } }), undefined)
  assert.equal(parseOffProduct('96385074', { status: 0 }), undefined)
  assert.equal(parseOffProduct('96385074', null), undefined)
})

test('copias: comidas y objetivo con valores fuera de rango se descartan', () => {
  const base = { routines: [], sessions: [] }
  const parsed = parseBackup(JSON.stringify({
    ...base,
    nutrition: {
      entries: [
        { id: 'ok', day: '2026-01-05', meal: 'lunch', name: 'Arroz', grams: 200, per100: { kcal: 145, p: 2.9, c: 31.8, f: 0.4 }, at: Date.UTC(2026, 0, 5) },
        { id: 'mal-dia', day: 'ayer', meal: 'lunch', name: 'X', grams: 100, per100: { kcal: 1, p: 1, c: 1, f: 1 } },
        { id: 'mal-comida', day: '2026-01-05', meal: 'brunch', name: 'X', grams: 100, per100: { kcal: 1, p: 1, c: 1, f: 1 } },
        { id: 'mal-valores', day: '2026-01-05', meal: 'lunch', name: 'X', grams: 100, per100: { kcal: 5000, p: 1, c: 1, f: 1 } },
      ],
      foods: [{ id: 'f', name: '', per100: { kcal: 1, p: 1, c: 1, f: 1 } }, { id: 'g', name: 'Bien', barcode: 'abc', per100: { kcal: 100, p: 1, c: 1, f: 1 } }],
      meals: [{ id: 'vacia', name: 'Nada', items: [] }],
    },
    settings: { nutrition: { kcal: 99999, protein: 100, carbs: 100, fat: 50 } },
  }))
  assert.deepEqual(parsed.nutrition.entries.map((e) => e.id), ['ok'])
  assert.deepEqual(parsed.nutrition.foods.map((f) => [f.name, f.barcode]), [['Bien', undefined]])
  assert.equal(parsed.nutrition.meals.length, 0)
  assert.equal(parsed.settings.nutrition, undefined)
  // Una copia de antes de Comidas se importa con todo vacío.
  assert.deepEqual(parseBackup(JSON.stringify(base)).nutrition, { entries: [], foods: [], meals: [] })
})

test('lista básica: valores coherentes con sus calorías (factores de la UE)', () => {
  const { foods } = JSON.parse(readFileSync('public/foods.json', 'utf8')) as { foods: BasicFood[] }
  assert.ok(foods.length >= 100)
  assert.equal(new Set(foods.map((f) => f.id)).size, foods.length)
  for (const f of foods) {
    assert.ok(f.es && f.en && f.ciqual > 0 && f.portion.g > 0, f.id)
    // Energía UE: 4 kcal/g proteína e hidratos, 9 grasa, 2 fibra (más el alcohol, que no se guarda).
    const calc = 4 * f.p + 4 * f.c + 9 * f.f + 2 * (f.fiber ?? 0)
    const alcohol = ['beer', 'wine'].includes(f.id)
    if (!alcohol) assert.ok(Math.abs(calc - f.kcal) <= Math.max(15, f.kcal * 0.12), `${f.id}: ${f.kcal} kcal frente a ${Math.round(calc)}`)
  }
})

test('totales: suman lo que se ve en cada fila (sin desajustes por decimales)', () => {
  // 3 alimentos de 100,4 kcal: cada fila muestra 100 y el día, 300 (no 301).
  const items = [1, 2, 3].map(() => ({ grams: 100, per100: { kcal: 100.4, p: 10.04, c: 0, f: 0 } }))
  assert.equal(dayTotals(items).kcal, 300)
  assert.equal(Math.round(dayTotals(items).p * 10) / 10, 30)
})

test('búsqueda en Open Food Facts: solo productos con valores, sin repetir, y avisa si no responde', async () => {
  const original = globalThis.fetch
  let url = ''
  const ok = (body: unknown) => (async (u: string) => { url = u; return new Response(JSON.stringify(body), { status: 200 }) }) as unknown as typeof fetch
  const n = { 'energy-kcal_100g': 70, proteins_100g: 8, carbohydrates_100g: 4, fat_100g: 2 }
  try {
    globalThis.fetch = ok({ products: [
      { code: '8480000213587', product_name_es: 'Griego ligero', brands: 'Hacendado', nutriments: n },
      { code: '8480000213587', product_name_es: 'Repetido', nutriments: n },
      { code: '1111111111116', product_name: 'Sin valores', nutriments: {} },
    ] })
    const found = await searchOff('griego ligero')
    assert.ok(Array.isArray(found))
    assert.deepEqual((found as { name: string }[]).map((p) => p.name), ['Griego ligero'])
    assert.ok(url.includes('search_terms=griego%20ligero') && url.includes('tag_0=spain'))
    globalThis.fetch = (async () => new Response('<html>no disponible</html>', { status: 503 })) as unknown as typeof fetch
    assert.equal(await searchOff('x'), 'offline')
    globalThis.fetch = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    assert.equal(await searchOff('x'), 'offline')
  } finally {
    globalThis.fetch = original
  }
})

test('resultados de Open Food Facts: lo más parecido primero', () => {
  const items = [
    { name: 'Tsatsiki a base de yogur griego', brand: 'Hacendado' },
    { name: 'Turrón Yogur con Frutos Rojos', brand: 'Hacendado' },
    { name: 'Yogur natural 0%', brand: 'Hacendado' },
    { name: 'Yogur sabor fresa', brand: 'Hacendado' },
  ]
  assert.deepEqual(rankProducts(items, 'hacendado yogur').map((p) => p.name).slice(0, 2), ['Yogur natural 0%', 'Yogur sabor fresa'])
})

test('apunte a mano: los totales se guardan con valores por 100 g dentro de lo normal', () => {
  const small = quickEntryAmount({ kcal: 450, p: 20, c: 50, f: 15 })
  assert.deepEqual(small, { grams: 100, per100: { kcal: 450, p: 20, c: 50, f: 15 } })
  // Un plato grande: 1400 kcal y 160 g de hidratos se reparten en 200 g para no pasar de 1000 kcal o 100 g por 100 g.
  const big = quickEntryAmount({ kcal: 1400, p: 60, c: 160, f: 50 })
  assert.equal(big.grams, 200)
  assert.deepEqual(amountOf(big.per100, big.grams), { kcal: 1400, p: 60, c: 160, f: 50 })
  assert.ok(big.per100.kcal <= 1000 && big.per100.c <= 100)
})
