import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sessionsToCsv } from '../src/lib/exportCsv'
import { parseCsv } from '../src/lib/importCsv'
import { setLang } from '../src/lib/i18n'
import { exercise, session, set } from './helpers'

const data = [
  session(0, [
    exercise('bench', [set(40, 10, { warmup: true }), set(82.5, 8, { rpe: 8.5 }), set(60, 6, { kind: 'drop' }), set(80, 5, { done: false })], { name: 'Press "banca"; plano' }),
    exercise('plank', [set(0, 0, { duration: 60 })], { name: 'Plancha', tracking: 'time' }),
  ], { name: 'Empuje', notes: 'Bien' }),
]

test('CSV en español: punto y coma, coma decimal, comillas y solo series hechas', () => {
  const csv = sessionsToCsv(data, 'kg')
  assert.ok(csv.startsWith('﻿'))
  const rows = parseCsv(csv)
  assert.equal(rows[0][0], 'Fecha')
  assert.equal(rows[0][6], 'Peso (kg)')
  assert.equal(rows.length, 5) // cabecera + 3 series de press + 1 de plancha
  assert.deepEqual(rows[1].slice(3, 8), ['Press "banca"; plano', '', 'Calentamiento', '40', '10'])
  assert.deepEqual(rows[2].slice(4, 11), ['1', 'Normal', '82,5', '8', '', '', '8,5'])
  assert.equal(rows[3][5], 'Drop set')
  assert.deepEqual(rows[4].slice(3, 9), ['Plancha', '1', 'Normal', '', '', '60'])
  assert.equal(rows[2][11], 'Bien')
})

test('CSV en inglés y en libras', () => {
  setLang('en')
  try {
    const rows = parseCsv(sessionsToCsv(data, 'lb'))
    assert.equal(rows[0][6], 'Weight (lb)')
    assert.equal(rows[2][6], '181.88') // 82,5 kg
    assert.equal(rows[1][5], 'Warm-up')
  } finally {
    setLang('es')
  }
})
