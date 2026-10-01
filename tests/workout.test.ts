import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyDeload, prefillSets } from '../src/lib/workout'
import type { SetEntry } from '../src/lib/store'
import { exercise, set } from './helpers'

const shape = (sets: SetEntry[]) => sets.map((s) => `${s.weight}x${s.reps}${s.kind ? ':' + s.kind : ''}${s.done ? '✓' : ''}`)

test('rellenar series con lo de la última vez', () => {
  assert.deepEqual(shape(prefillSets(3, [set(80, 10), set(80, 9), set(80, 8)])), ['80x10', '80x9', '80x8'])
  // Más series que la última vez: se repite la última.
  assert.deepEqual(shape(prefillSets(4, [set(80, 10), set(80, 9)])), ['80x10', '80x9', '80x9', '80x9'])
  assert.deepEqual(shape(prefillSets(2, [])), ['0x0', '0x0'])
  assert.ok(prefillSets(2, [set(80, 10)]).every((s) => !s.done && !s.warmup && !s.doneAt))
})

test('rellenar: los drop sets siguen a su serie y no cuentan como series', () => {
  const last = [set(80, 10), set(80, 9), set(60, 8, { kind: 'drop' }), set(45, 8, { kind: 'drop' })]
  assert.deepEqual(shape(prefillSets(2, last)), ['80x10', '80x9', '60x8:drop', '45x8:drop'])
  // La serie extra no repite los drop sets.
  assert.deepEqual(shape(prefillSets(3, last)), ['80x10', '80x9', '60x8:drop', '45x8:drop', '80x9'])
  assert.deepEqual(shape(prefillSets(2, [set(80, 10, { kind: 'amrap' }), set(80, 8, { kind: 'failure' })])), ['80x10:amrap', '80x8:failure'])
})

test('rellenar: un drop set sin serie delante se copia como normal', () => {
  assert.deepEqual(shape(prefillSets(1, [set(60, 8, { kind: 'drop' })])), ['60x8'])
})

test('descarga: ~60 % de las series pendientes y −10 % de peso', () => {
  const e = exercise('bench', [
    set(40, 10, { warmup: true, done: false }),
    set(100, 5), // ya hecha: no se toca
    set(100, 5, { done: false }), set(100, 5, { done: false }), set(100, 5, { done: false, kind: 'failure' }),
    set(100, 5, { done: false }), set(80, 8, { done: false, kind: 'drop' }),
  ])
  applyDeload(e, 'kg')
  assert.equal(e.deload, true)
  // 4 pendientes → quedan 2; el calentamiento y la hecha se conservan; fuera el drop set.
  assert.deepEqual(shape(e.sets), ['40x10', '100x5✓', '90x5', '90x5'])
})

test('descarga: redondea al incremento y deja al menos una serie', () => {
  const e = exercise('bench', [set(62.5, 8, { done: false })])
  applyDeload(e, 'kg')
  assert.deepEqual(shape(e.sets), ['57.5x8']) // 56,25 → 57,5
})
