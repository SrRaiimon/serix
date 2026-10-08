import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseBackup } from '../src/lib/backup'
import { amountOf, barcodeVariants, dayOptional, stem, traffic, computeGoals, fold, searchAesan, type AesanProduct, dayKey, dayTotals, doubtfulValues, matches, parseNutritionLabel, portionLabel, parseOffProduct, quickEntryAmount, rankProducts, recentFoods, searchOff, shiftDay, shownGrams, suspectValue, validBarcode, type BasicFood, type FoodEntry } from '../src/lib/nutrition'

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
  // Proteína por kilo elegida: 80 kg × 2 g.
  assert.equal(computeGoals({ sex: 'm', age: 30, heightCm: 178, weightKg: 80, activity: 1.55, aim: 'gain', proteinPerKg: 2 }).protein, 160)
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
    barcode: '3017620422003', name: 'Crema de cacao', brand: 'Marca', per100: { kcal: 539, p: 6.3, c: 57.5, f: 30.9 }, portion: { label: '1 ración', g: 15 },
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
        { id: 'mal-comida', day: '2026-01-05', meal: 'elevenses', name: 'X', grams: 100, per100: { kcal: 1, p: 1, c: 1, f: 1 } },
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
    // Fuera de la cuenta: el alcohol (7 kcal/g), los polialcoholes de lo «sin azúcar» y los ácidos del vinagre.
    const other = /cerveza|vino|sidra|licor|ginebra|\bron\b|vodka|whisky|brandy|aguardiente|pastís|sake|sangría|cóctel|ponche|kir|champán|cava|marsala|aperitivo|vinagre|sin azúcar|edulcorante|chicle/i.test(f.es)
    // La lista ampliada trae medias de CIQUAL con algo más de dispersión (p. ej. ñoquis).
    if (!other) assert.ok(Math.abs(calc - f.kcal) <= Math.max(15, f.kcal * (f.more ? 0.3 : 0.12)), `${f.id}: ${f.kcal} kcal frente a ${Math.round(calc)}`)
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

test('ración de Open Food Facts: sin gramos repetidos ni textos en inglés', () => {
  assert.equal(portionLabel('120 g'), '1 ración')
  assert.equal(portionLabel('1 portion (100 g)'), '1 ración')
  assert.equal(portionLabel('1 serving'), '1 ración')
  assert.equal(portionLabel(undefined), '1 ración')
  assert.equal(portionLabel('2 galletas (25 g)'), '2 galletas')
  assert.equal(portionLabel('1 pincho'), '1 pincho')
})

test('valores dudosos: las kcal no cuadran con los macros', () => {
  assert.ok(!doubtfulValues({ kcal: 64, p: 10, c: 5, f: 0.5 })) // yogur proteico
  assert.ok(!doubtfulValues({ kcal: 539, p: 6.3, c: 57.5, f: 30.9 })) // crema de cacao
  assert.ok(doubtfulValues({ kcal: 232, p: 7, c: 4, f: 0.5 })) // ficha mal tecleada
  assert.ok(!doubtfulValues({ kcal: 30, p: 1, c: 3, f: 0 })) // diferencia pequeña en algo ligero
})

test('valores dudosos: qué cifra revisar primero', () => {
  assert.equal(suspectValue({ kcal: 232, p: 7, c: 6.2, f: 55 }), 'f') // la grasa da de más
  assert.equal(suspectValue({ kcal: 500, p: 5, c: 10, f: 2 }), 'kcal') // los macros dan de menos
  assert.equal(suspectValue({ kcal: 64, p: 10, c: 5, f: 0.5 }), undefined)
})

test('totales en gramos: suman lo que se ve en cada fila (enteros desde 10 g)', () => {
  assert.equal(shownGrams(11.2), 11)
  assert.equal(shownGrams(8.34), 8.3)
  // 11,2 g (se ve «11») + 5,4 g = 16,4 → el total que se ve es 16, no 17.
  const items = [{ grams: 100, per100: { kcal: 0, p: 11.2, c: 0, f: 0 } }, { grams: 100, per100: { kcal: 0, p: 5.4, c: 0, f: 0 } }]
  assert.equal(dayTotals(items).p, 16.4)
})

test('etiqueta: lee la tabla nutricional por 100 g (texto de la foto)', () => {
  const es = `INFORMACIÓN NUTRICIONAL  Por 100 g  Por ración (125 g)
Valor energético 254 kJ / 60 kcal  318 kJ / 75 kcal
Grasas 0,5 g 0,6 g
de las cuales saturadas 0,3 g 0,4 g
Hidratos de carbono 6,2 g 7,8 g
de los cuales azúcares 6,2 g 7,8 g
Proteínas 7,0 g 8,8 g
Sal 0,12 g 0,15 g`
  assert.deepEqual(parseNutritionLabel(es), { kcal: 60, f: 0.5, c: 6.2, p: 7, portion: 125 })
  // Multilingüe, solo kJ y «<0,5»: se pasa a kcal y el menor que cuenta como 0.
  const multi = `Energía/Energy 1046 kJ
Grasas/Fat/Matières grasses <0,5 g
Hidratos de carbono/Carbohydrate/Glucides 58 g
Proteínas/Protein/Protéines 9,1 g`
  assert.deepEqual(parseNutritionLabel(multi), { kcal: 250, f: 0, c: 58, p: 9.1 })
  // Alemán y una cifra imposible (OCR leyó «150» en vez de «15,0»).
  assert.deepEqual(parseNutritionLabel('Brennwert 1500 kJ / 358 kcal\nFett 150 g\nKohlenhydrate 60 g\nEiweiß 12 g'), { kcal: 358, c: 60, p: 12 })
  assert.deepEqual(parseNutritionLabel('foto borrosa sin tabla'), {})
  // Lectura real de Tesseract: la «g» de cada cifra sale como un 9 pegado.
  const glued = 'Valor energético 252 kJ / 60 kcal\nGrasas 0,59\nde las cuales saturadas 0,19\nHidratos de carbono 6,29\nde los cuales azúcares 6,29\nProteínas 7,09\nSal 0,139'
  assert.deepEqual(parseNutritionLabel(glued), { kcal: 60, f: 0.5, c: 6.2, p: 7 })
  // Dos columnas con la «g» unas veces leída y otras no; un 9 de verdad con su unidad se respeta.
  const twoCols = 'Energía 1580 kJ 474 kJ\n375 kcal 113 kcal\n\nGrasas 7,09 219\n\nde las cuales saturadas 1,29 0,49\n\nHidratos de carbono 60 g 18g\n\nFibra alimentaria 10g 3,09\n\nProteínas 13g 3,99'
  assert.deepEqual(parseNutritionLabel(twoCols), { kcal: 375, f: 7, c: 60, p: 13 })
  assert.equal(parseNutritionLabel('INFORMACIÓN NUTRICIONAL por 100 g por ración (30 g)\n' + twoCols).portion, 30)
  // Enteros con la «g» convertida en 9: «13 g» → «139» (imposible) y «6 g» → «69» (no cuadra con las kcal).
  assert.deepEqual(parseNutritionLabel('375 kcal\nGrasas 7,09\nHidratos de carbono 60 g\nProteínas 139 3,99'), { kcal: 375, f: 7, c: 60, p: 13 })
  assert.deepEqual(parseNutritionLabel('120 kcal\nGrasas 69\nHidratos de carbono 12 g\nProteínas 3 g'), { kcal: 120, f: 6, c: 12, p: 3 })
  assert.deepEqual(parseNutritionLabel('Grasas 0,49 g\nHidratos de carbono 49 g\nProteínas 19 g'), { f: 0.49, c: 49, p: 19 })
})

test('supermercados (AESAN): el archivo es válido y la búsqueda prioriza nombre y marca', () => {
  const d = JSON.parse(readFileSync('public/aesan.json', 'utf8')) as { subcategories: string[]; products: (string | number)[][] }
  assert.ok(d.products.length > 25000)
  for (const p of d.products) {
    assert.ok(validBarcode(p[0] as string) || /^\d{8,14}$/.test(p[0] as string))
    assert.ok((p[3] as number) <= 1000 && [p[4], p[5], p[6]].every((x) => (x as number) >= 0 && (x as number) <= 100))
    assert.ok(d.subcategories[p[7] as number] !== undefined)
  }
  const item = (barcode: string, name: string, brand: string, category: string): AesanProduct => ({ barcode, name, brand, category, per100: { kcal: 1, p: 0, c: 0, f: 0 }, text: fold(`${name} ${brand} ${category}`) })
  const list = [item('1', 'Chclt rln', 'Nestle', 'Tabletas de chocolate'), item('2', 'Chocolate negro 70%', 'Valor', 'Tabletas de chocolate'), item('3', 'Yogur natural', 'Hacendado', 'Yogures')]
  assert.deepEqual(searchAesan(list, 'chocolate').map((x) => x.barcode), ['2', '1'])
  assert.deepEqual(searchAesan(list, 'hacendado yogur').map((x) => x.barcode), ['3'])
  assert.deepEqual(barcodeVariants('036000291452'), ['036000291452', '0036000291452'])
  assert.deepEqual(barcodeVariants('0036000291452'), ['0036000291452', '036000291452'])
})

test('búsqueda: singular y plural, y sinónimos como palabra entera', () => {
  assert.equal(stem('huevos'), 'huevo')
  assert.equal(stem('panes'), 'pan')
  assert.equal(stem('nueces'), 'nuez')
  assert.equal(stem('arroces'), 'arroz')
  assert.equal(stem('tomates'), 'tomate')
  assert.ok(matches('Huevo', 'huevos'))
  assert.ok(matches('Pasta (cocida)', 'macarrones'))
  assert.ok(matches('Patata cocida', 'papas'))
  assert.ok(matches('Zumo de naranja', 'jugo de naranja'))
  assert.ok(matches('Alubias blancas cocidas', 'frijoles'))
  // Un sinónimo no vale como trozo de otra palabra: «papa» no es «papaya».
  assert.ok(!matches('Papaya', 'patata'))
  // Lo escrito sí, mientras se teclea.
  assert.ok(matches('Pechuga de pollo', 'pech pol'))
})

test('azúcares y sal: semáforo por 100 g y totales del día con los que traen el dato', () => {
  assert.equal(traffic('sugar', 4), 'low')
  assert.equal(traffic('sugar', 10), 'medium')
  assert.equal(traffic('sugar', 30), 'high')
  assert.equal(traffic('sugar', 10.6, true), 'medium')
  assert.equal(traffic('sugar', 12, true), 'high')
  assert.equal(traffic('salt', 0.2), 'low')
  assert.equal(traffic('salt', 2), 'high')
  const e = (salt: number | undefined, grams: number) => ({ grams, per100: { kcal: 0, p: 0, c: 0, f: 0, ...(salt !== undefined ? { salt } : {}) } })
  assert.deepEqual(dayOptional([e(1.5, 200), e(undefined, 100)], 'salt'), { g: 3, missing: 1 })
  assert.deepEqual(amountOf({ kcal: 100, p: 1, c: 2, f: 3, sugar: 10, salt: 1 }, 50), { kcal: 50, p: 0.5, c: 1, f: 1.5, sugar: 5, salt: 0.5 })
  // Open Food Facts trae azúcares y sal.
  const off = parseOffProduct('1', { product: { product_name: 'Galletas', nutriments: { 'energy-kcal_100g': 450, proteins_100g: 6, carbohydrates_100g: 70, fat_100g: 16, sugars_100g: 24.4, salt_100g: 0.555 } } })!
  assert.deepEqual([off.per100.sugar, off.per100.salt], [24.4, 0.56])
  // Se conservan en la copia.
  const entry = { id: 'x', day: '2026-03-10', meal: 'lunch', name: 'x', grams: 100, per100: { kcal: 100, p: 1, c: 2, f: 3, sugar: 5, salt: 0.4 }, at: 1 }
  assert.deepEqual(parseBackup(JSON.stringify({ sessions: [], routines: [], nutrition: { entries: [entry], foods: [], meals: [] } })).nutrition.entries[0].per100, entry.per100)
})
