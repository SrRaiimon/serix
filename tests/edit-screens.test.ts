import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { editedExercises } from '../src/lib/workout'
import { T0, exercise, set } from './helpers'

test('corregir un entreno no borra la molestia apuntada en un ejercicio sin series', () => {
  const list = [
    exercise('bench', [set(80, 5), set(0, 0)]),
    exercise('squat', [], { discomfort: { zone: 'knee', at: T0 } }),
    exercise('row', [set(0, 0)]),
  ]
  const out = editedExercises(list)
  assert.deepEqual(out.map((e) => e.exerciseId), ['bench', 'squat'])
  assert.equal(out[0].sets.length, 1, 'la serie vacía se quita')
  assert.equal(out[1].discomfort?.zone, 'knee')
})
