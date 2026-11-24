import './browser-stubs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stallOffered, todayWhy } from '../src/lib/exerciseHints'
import { exercise, set } from './helpers'

const withAuto = (auto: unknown, extra = {}) => ({ ...exercise('Barbell_Curl', [set(55, 8, { done: false })]), auto, ...extra }) as ReturnType<typeof exercise>

test('rutina: la bajada dice «↓ −5 kg» y un ejercicio sin cambio no dice nada', () => {
  assert.match(todayWhy(withAuto({ kind: 'down', from: 60, to: 55, mode: 'double' }), 'kg'), /^↓ −5/)
  assert.match(todayWhy(withAuto({ kind: 'up', from: 55, to: 57.5, mode: 'double' }), 'kg'), /^↑ \+2[.,]5/)
  assert.match(todayWhy(withAuto({ kind: 'up', from: 40, to: 37.5, mode: 'double', assist: true }), 'kg'), /^↓ −2[.,]5.*ayuda/)
  assert.equal(todayWhy(withAuto(undefined), 'kg'), '')
  assert.equal(todayWhy(withAuto({ kind: 'hold', mode: 'linear' }), 'kg'), 'Repite el peso')
})

test('estancamiento: no se ofrece la descarga si la app ya bajó el peso, hay descarga, 5/3/1 o series hechas', () => {
  const base = withAuto({ kind: 'hold', mode: 'double' })
  assert.equal(stallOffered(base, null, { best: 100 }), true)
  assert.equal(stallOffered(withAuto({ kind: 'down', from: 60, to: 55, mode: 'double' }), null, { best: 100 }), false)
  assert.equal(stallOffered(withAuto({ kind: 'wave', week: 1, tm: 100 }), null, { best: 100 }), false)
  assert.equal(stallOffered(withAuto({ kind: 'hold', mode: 'double' }, { deload: true }), null, { best: 100 }), false)
  assert.equal(stallOffered(base, 'prueba con 60', { best: 100 }), false)
  assert.equal(stallOffered(base, null, undefined), false)
  assert.equal(stallOffered({ ...base, sets: [set(55, 8)] }, null, { best: 100 }), false)
})
