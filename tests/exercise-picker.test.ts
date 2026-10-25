import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, emptyFilter, type RawExercise } from '../src/lib/catalog'
import { orderPickerExercises, POPULAR_EXERCISE_IDS } from '../src/lib/exercisePicker'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)
const popular = new Set(POPULAR_EXERCISE_IDS)
const ids = (list: { id: string }[]) => list.map((e) => e.id)

test('selector: los 30 básicos existen sin duplicados en los dos catálogos', () => {
  assert.equal(POPULAR_EXERCISE_IDS.length, 30)
  assert.equal(popular.size, 30)
  for (const file of ['public/exercises_es.json', 'public/exercises_index.json']) {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { exercises: { id: string }[] }
    const available = new Set(ids(data.exercises))
    for (const id of POPULAR_EXERCISE_IDS) assert.ok(available.has(id), `${file}: ${id}`)
  }
})

test('selector sin historial: banca, sentadilla y peso muerto primero; el resto conserva su orden', () => {
  const list = catalog.filter(emptyFilter, [])
  const before = ids(list)
  const ordered = ids(orderPickerExercises(list, new Map()))
  assert.deepEqual(ordered.slice(0, 6), [
    'Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Squat', 'Barbell_Deadlift',
    'Standing_Military_Press', 'Pullups', 'Bent_Over_Barbell_Row',
  ])
  assert.deepEqual(ordered.slice(0, 30), POPULAR_EXERCISE_IDS)
  assert.deepEqual(ordered.slice(30), before.filter((id) => !popular.has(id)))
  assert.deepEqual(ids(list), before)
})

test('selector con historial: los usados ganan a los básicos y se ordenan por fecha, sin duplicarse', () => {
  const list = catalog.filter(emptyFilter, [])
  const uncommon = list.find((e) => !popular.has(e.id))!
  const usage = new Map([
    ['Barbell_Squat', { last: 10 }],
    [uncommon.id, { last: 30 }],
    ['Plank', { last: 20 }],
  ])
  const ordered = ids(orderPickerExercises(list, usage))
  assert.deepEqual(ordered.slice(0, 5), [uncommon.id, 'Plank', 'Barbell_Squat', 'Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Deadlift'])
  assert.equal(new Set(ordered).size, list.length)
  // Si se hicieron en la misma sesión, se mantiene el orden anterior aunque uno sea más popular.
  assert.deepEqual(ids(orderPickerExercises([catalog.get('Plank')!, uncommon], new Map([
    ['Plank', { last: 20 }], [uncommon.id, { last: 20 }],
  ]))), ['Plank', uncommon.id])
})

test('selector filtrado por músculo o material: usados, básicos y resto sin introducir otros ejercicios', () => {
  for (const [filter, expected] of [
    [{ ...emptyFilter, muscle: 'pectorals' }, ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Incline_Dumbbell_Press', 'Dips_-_Chest_Version', 'Pushups', 'Cable_Crossover']],
    [{ ...emptyFilter, equipment: 'cable' }, ['Wide-Grip_Lat_Pulldown', 'Triceps_Pushdown', 'Seated_Cable_Rows', 'Face_Pull', 'Cable_Crossover']],
  ] as const) {
    const list = catalog.filter(filter, [])
    const used = list.find((e) => !popular.has(e.id))!
    assert.ok(used)
    const ordered = ids(orderPickerExercises(list, new Map([[used.id, { last: 10 }]])))
    assert.deepEqual(ordered.slice(0, expected.length + 1), [used.id, ...expected])
    assert.deepEqual(ordered.slice(expected.length + 1), ids(list).filter((id) => !popular.has(id) && id !== used.id))
  }
})
