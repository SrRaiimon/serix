import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blockWeek, cleanBlock } from '../src/lib/block'
import { periodRange, summarize } from '../src/lib/periodCard'
import { exercise, set } from './helpers'
import type { Session } from '../src/lib/store'

const monday = new Date(2026, 0, 5, 18).getTime() // lunes
const DAY = 86400000

test('bloque de 5 semanas: RIR de 3 a 1 y descarga al final, y se repite', () => {
  const b = { start: monday + 2 * DAY, weeks: 5 } // empezado un miércoles: cuenta esa semana
  const at = (week: number) => blockWeek(b, monday + (week - 1) * 7 * DAY + DAY)!
  assert.deepEqual([1, 2, 3, 4].map((w) => at(w).rir), [3, 2, 2, 1])
  assert.equal(at(4).deload, false)
  assert.deepEqual([at(5).deload, at(5).rir], [true, undefined])
  assert.deepEqual([at(6).week, at(6).cycle, at(6).rir], [1, 2, 3])
  assert.equal(blockWeek(b, monday - 7 * DAY), undefined) // antes de empezar
  assert.equal(blockWeek(undefined), undefined)
})

test('bloques de 4 y 7 semanas', () => {
  const four = (w: number) => blockWeek({ start: monday, weeks: 4 }, monday + (w - 1) * 7 * DAY)!
  assert.deepEqual([four(1).rir, four(2).rir, four(3).rir, four(4).deload], [3, 2, 1, true])
  const seven = (w: number) => blockWeek({ start: monday, weeks: 7 }, monday + (w - 1) * 7 * DAY)!.rir
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(seven), [3, 3, 2, 2, 1, 1])
})

test('bloque guardado: solo duraciones válidas', () => {
  assert.deepEqual(cleanBlock({ start: monday, weeks: 5 }), { start: monday, weeks: 5 })
  assert.equal(cleanBlock({ start: monday, weeks: 99 }), undefined)
  assert.equal(cleanBlock({ start: 'x', weeks: 5 }), undefined)
})

const s = (date: number, muscle: string, sets: number, name = 'Press'): Session => ({
  id: String(date), name: 'X', start: date, end: date + 3600000, notes: '',
  exercises: [exercise(name, Array.from({ length: sets }, () => set(100, 5)), { name, muscle })],
})

test('resumen del mes: cifras, días, racha, ejercicios y grupo', () => {
  const now = new Date(2026, 2, 20, 12).getTime() // 20 de marzo
  const sessions = [
    s(new Date(2026, 1, 27).getTime(), 'pectorals', 9), // febrero: no cuenta
    s(new Date(2026, 2, 2, 10).getTime(), 'pectorals', 3),
    s(new Date(2026, 2, 2, 19).getTime(), 'quads', 4, 'Sentadilla'), // dos el mismo día
    s(new Date(2026, 2, 10).getTime(), 'pectorals', 3),
    s(new Date(2026, 2, 18).getTime(), 'quads', 5, 'Sentadilla'),
  ]
  const m = summarize(sessions, 'month', now)
  assert.equal(m.sessions, 4)
  assert.equal(m.sets, 15)
  assert.equal(m.volume, 15 * 500)
  assert.equal(m.days.size, 3)
  assert.equal(m.days.get(new Date(2026, 2, 2).getTime()), 2)
  assert.equal(m.bestStreak, 3) // semanas del 2, 9 y 16 de marzo
  assert.deepEqual(m.top.map((e) => [e.name, e.sets]), [['Sentadilla', 9], ['Press', 6]])
  assert.equal(m.topGroup, 5) // cuádriceps
  assert.equal(summarize(sessions, 'lastMonth', now).sessions, 1)
  assert.equal(summarize(sessions, 'year', now).sessions, 5)
  assert.equal(summarize(sessions, 'lastYear', now).sessions, 0)
})

test('rangos de los periodos', () => {
  const now = new Date(2026, 0, 15, 9).getTime()
  assert.deepEqual(periodRange('lastMonth', now), { from: new Date(2025, 11, 1).getTime(), to: new Date(2026, 0, 1).getTime() })
  assert.equal(periodRange('month', now).to, new Date(2026, 0, 16).getTime())
})
