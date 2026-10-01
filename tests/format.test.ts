import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clock, editable, fromKg, parseDecimal, rest, startOfWeek, toKg } from '../src/lib/format'
import { digitsToSeconds, formatDigits, secondsToDigits } from '../src/lib/tracking'

test('kg ↔ lb ida y vuelta', () => {
  for (const kg of [0, 2.5, 20, 100, 227.5]) assert.ok(Math.abs(toKg(fromKg(kg, 'lb'), 'lb') - kg) < 1e-9)
  assert.equal(fromKg(100, 'kg'), 100)
})

test('números editables con coma decimal', () => {
  assert.equal(editable(62.5), '62,5')
  assert.equal(editable(80), '80')
  assert.equal(editable(1 / 3), '0,33')
  assert.equal(parseDecimal('62,5'), 62.5)
  assert.equal(parseDecimal(' 80 '), 80)
  assert.equal(parseDecimal(''), null)
  assert.equal(parseDecimal('abc'), null)
})

test('relojes y descansos', () => {
  assert.equal(clock(0), '0:00')
  assert.equal(clock(90), '1:30')
  assert.equal(clock(3725), '1:02:05')
  assert.equal(rest(45), '45 s')
  assert.equal(rest(120), '2 min')
  assert.equal(rest(150), '2:30 min')
})

test('tiempo tipo microondas', () => {
  assert.equal(digitsToSeconds('130'), 90)
  assert.equal(digitsToSeconds('90'), 90)
  assert.equal(formatDigits('130'), '1:30')
  assert.equal(formatDigits('5'), '0:05')
  for (const s of [5, 59, 60, 90, 3599]) assert.equal(digitsToSeconds(secondsToDigits(s)), s)
})

test('la semana empieza en lunes', () => {
  const sunday = new Date(2026, 0, 11, 18)
  const monday = startOfWeek(sunday)
  assert.equal(monday.getDay(), 1)
  assert.equal(monday.getDate(), 5)
  assert.equal(startOfWeek(monday).getTime(), monday.getTime())
})
