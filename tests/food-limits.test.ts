import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseBackup } from '../src/lib/backup'
import { buildDishes, makePlan, planMeals } from '../src/lib/mealPlan'
import { cleanFoodName, invalidFoodCalories, parseOffProduct, recipeValues, setMealSettings, type BasicFood } from '../src/lib/nutrition'

// Los valores por 100 g con los mismos límites al crear el alimento y al restaurar la copia: antes una receta con
// el peso hecho muy bajo pasaba de 100 g de proteína, la copia la descartaba y al restaurar se perdían la receta y
// todo lo apuntado con ella.

test('receta con el peso hecho muy bajo: 100 g del plato no pasan de 100 g de nada', () => {
  const v = recipeValues({ items: [{ name: 'Pollo', grams: 500, per100: { kcal: 110, p: 23, c: 0, f: 2 } }], servings: 1, cookedG: 50 })
  assert.equal(v.per100.p, 100)
  assert.equal(v.per100.kcal, 1000)
  assert.ok(v.per100.f <= 100)
})

test('Open Food Facts: un negativo en texto no vale, y un valor imposible se recorta', () => {
  const product = (nutriments: Record<string, unknown>) => parseOffProduct('8480000000000', { product: { product_name: 'Prueba', nutriments } })
  assert.equal(product({ 'energy-kcal_100g': 300, proteins_100g: '-40', carbohydrates_100g: 10, fat_100g: 5 }), undefined)
  const big = product({ 'energy-kcal_100g': 3000, proteins_100g: 150, carbohydrates_100g: '20', fat_100g: 5 })!
  assert.deepEqual([big.per100.kcal, big.per100.p, big.per100.c], [1000, 100, 20])
})

test('copia de seguridad: un alimento con un valor fuera de rango se recorta y se conservan sus apuntes', () => {
  const food = { id: 'f1', name: 'Receta', source: 'mine', per100: { kcal: 1200, p: 140, c: 3, f: 2, fiber: -1, salt: 0.5 } }
  const entry = { id: 'e1', day: '2026-10-20', meal: 'lunch', name: 'Receta', grams: 100, per100: food.per100, ref: { kind: 'mine', id: 'f1' }, at: Date.UTC(2026, 9, 20) }
  const data = parseBackup(JSON.stringify({ sessions: [], routines: [], nutrition: { entries: [entry], foods: [food], meals: [] } }))
  assert.equal(data.nutrition.foods.length, 1)
  assert.deepEqual(data.nutrition.foods[0].per100, { kcal: 1000, p: 100, c: 3, f: 2, fiber: 0, salt: 0.5 })
  assert.equal(data.nutrition.entries.length, 1)
  assert.equal(data.nutrition.entries[0].per100.p, 100)
  // Sin uno de los cuatro valores sí se descarta: no hay nada que recortar.
  const broken = parseBackup(JSON.stringify({ sessions: [], routines: [], nutrition: { entries: [], foods: [{ ...food, per100: { kcal: 100, p: 1, c: 1 } }], meals: [] } }))
  assert.equal(broken.nutrition.foods.length, 0)
})

test('menú propuesto: solo las comidas activadas', () => {
  const { foods } = JSON.parse(readFileSync('public/foods.json', 'utf8')) as { foods: BasicFood[] }
  const dishes = buildDishes(foods, [], '2026-03-10')
  setMealSettings(undefined, ['breakfast', 'lunch', 'dinner', 'supper'])
  try {
    assert.deepEqual(planMeals(), ['breakfast', 'lunch', 'dinner'])
    assert.deepEqual(Object.keys(makePlan(dishes, { entries: [] }, '2026-03-10', 1).meals).sort(), ['breakfast', 'dinner', 'lunch'])
  } finally {
    setMealSettings(undefined, undefined)
  }
  assert.equal(Object.keys(makePlan(dishes, { entries: [] }, '2026-03-10', 1).meals).length, 4)
})

test('alimento propio: las calorías imposibles tienen aviso, incluidos texto y negativos', () => {
  for (const value of ['999999', '1000.1', '-1', 'abc', '1e9', 'Infinity', '12,5,3']) assert.equal(invalidFoodCalories(value), true, value)
  for (const value of ['', ' ', '0', '1000', '82,5', '82.5']) assert.equal(invalidFoodCalories(value), false, value)
})

test('alimento propio: nombre sin espacios exteriores y con un máximo de 80 caracteres', () => {
  assert.equal(cleanFoodName('  Mi batido  '), 'Mi batido')
  assert.equal(cleanFoodName('x'.repeat(360)), 'x'.repeat(80))
  assert.equal(cleanFoodName('   '), '')
})
