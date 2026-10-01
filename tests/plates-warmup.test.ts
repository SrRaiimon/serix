import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromKg, toKg } from '../src/lib/format'
import { loadBar } from '../src/lib/plates'
import { warmupSets } from '../src/lib/warmup'

test('discos: reparte de mayor a menor', () => {
  assert.deepEqual(loadBar(100, 20, 'kg'), { perSide: [25, 15], total: 100, missing: 0 })
  assert.deepEqual(loadBar(60, 20, 'kg'), { perSide: [20], total: 60, missing: 0 })
  assert.deepEqual(loadBar(142.5, 20, 'kg'), { perSide: [25, 25, 10, 1.25], total: 142.5, missing: 0 })
})

test('discos: avisa de lo que no se puede cargar', () => {
  assert.deepEqual(loadBar(101, 20, 'kg'), { perSide: [25, 15], total: 100, missing: 1 })
})

test('discos: por debajo de la barra no se pone nada', () => {
  assert.deepEqual(loadBar(15, 20, 'kg'), { perSide: [], total: 20, missing: 0 })
})

test('discos: en libras', () => {
  assert.deepEqual(loadBar(toKg(225, 'lb'), 45, 'lb'), { perSide: [45, 45], total: 225, missing: 0 })
})

test('calentamiento pesado: barra sola y rampa de tres series', () => {
  assert.deepEqual(warmupSets(100, 'kg', 20), [
    { weight: 20, reps: 10 }, { weight: 50, reps: 5 }, { weight: 70, reps: 3 }, { weight: 85, reps: 1 },
  ])
})

test('calentamiento ligero: sin series repetidas con la barra', () => {
  assert.deepEqual(warmupSets(40, 'kg', 20), [{ weight: 20, reps: 10 }, { weight: 30, reps: 4 }])
})

test('calentamiento sin barra y sin peso', () => {
  assert.deepEqual(warmupSets(30, 'kg'), [{ weight: 15, reps: 8 }, { weight: 22.5, reps: 4 }])
  assert.deepEqual(warmupSets(0, 'kg', 20), [])
})

test('calentamiento en libras redondea a 5 lb', () => {
  const sets = warmupSets(toKg(140, 'lb'), 'lb', toKg(45, 'lb')).map((s) => Math.round(fromKg(s.weight, 'lb')))
  assert.deepEqual(sets, [45, 70, 100, 120])
})

test('calentamiento: siempre por debajo del peso de trabajo y cada vez más pesado', () => {
  for (const unit of ['kg', 'lb'] as const) {
    for (let work = 2.5; work <= 300; work += 2.5) {
      for (const bar of [undefined, 20]) {
        const sets = warmupSets(work, unit, bar)
        sets.forEach((s, i) => {
          assert.ok(s.weight > 0 && s.weight < work, `${work} ${unit}: ${s.weight}`)
          if (i) assert.ok(s.weight > sets[i - 1].weight, `${work} ${unit}: no sube`)
        })
      }
    }
  }
})
