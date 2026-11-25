import { lang, setLang } from '../src/lib/i18n'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clock, editable, fromKg, parseDecimal, relative, rest, startOfWeek, toKg, tons } from '../src/lib/format'
import { esc } from '../src/lib/cardStyle'
import { e1rm } from '../src/lib/stats'
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

test('volumen en toneladas a partir de 1000', () => {
  assert.equal(tons(17100, 'kg'), '17,1 t')
  assert.equal(tons(373140, 'kg'), '373,1 t')
  assert.equal(tons(6000, 'kg'), '6,0 t')
  assert.equal(tons(950, 'kg'), '950 kg')
  assert.equal(tons(10000, 'lb'), '22,0k lb')
})

test('volumen de Inicio: toneladas escritas en español e inglés, y kg por debajo de una', () => {
  const before = lang()
  try {
    setLang('es')
    assert.equal(tons(3200, 'kg', true), '3,2 toneladas')
    assert.equal(tons(1000, 'kg', true), '1,0 tonelada')
    assert.equal(tons(999, 'kg', true), '999 kg')
    assert.equal(tons(0, 'kg', true), '0 kg')
    assert.equal(tons(10000, 'lb', true), tons(10000, 'lb'))
    setLang('en')
    assert.equal(tons(3200, 'kg', true), '3.2 tonnes')
    assert.equal(tons(1000, 'kg', true), '1.0 tonne')
    assert.equal(tons(999, 'kg', true), '999 kg')
  } finally {
    setLang(before)
  }
})

test('relative: una fecha futura no dice «Hace -3 días»', () => {
  assert.ok(!/-\d/.test(relative(Date.now() + 3 * 86400000)))
  assert.equal(relative(Date.now()), lang() === 'en' ? 'Today' : 'Hoy')
})

test('tons: 999,9 kg pasa a toneladas, no sale «1000 kg»', () => {
  assert.ok(!/^1000 kg/.test(tons(999.9, 'kg')), tons(999.9, 'kg'))
  assert.ok(/t$/.test(tons(999.9, 'kg')), tons(999.9, 'kg'))
})

test('e1rm: sin estimar más allá de 12 repeticiones, y un carácter de control no rompe la tarjeta', () => {
  assert.equal(esc('a\u0001b<c>&'), 'ab&lt;c&gt;&amp;')
  assert.equal(e1rm(20, 100), e1rm(20, 12))
  assert.ok(e1rm(20, 100) < 30)
  assert.equal(e1rm(100, 1), 100)
})
