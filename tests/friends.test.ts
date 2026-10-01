import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeSnapshot, encodeSnapshot, friendKey, mySnapshot, sameWeek } from '../src/lib/friends'
import { toBase64Url } from '../src/lib/share'
import { defaultSettings, type AppData } from '../src/lib/store'
import { exercise, session, set } from './helpers'

const now = new Date(2026, 0, 14, 20).getTime() // miércoles
const at = (daysAgo: number, ex: ReturnType<typeof exercise>[]) => {
  const start = now - daysAgo * 86400000
  return session(0, ex, { start, end: start + 3600000 })
}
const sessions = [
  at(1, [exercise('Barbell_Bench_Press_-_Medium_Grip', [set(80, 5), set(80, 5)])]),
  at(9, [exercise('Barbell_Squat', [set(120, 5)]), exercise('Wide-Grip_Barbell_Bench_Press', [set(90, 1)])]),
  at(40, [exercise('Barbell_Deadlift', [set(150, 3)])]),
]
const data: AppData = { version: 1, routines: [], sessions, measurements: [], exerciseNotes: {}, friends: [], settings: { ...defaultSettings, name: '  Ana  ' } }

test('resumen propio: semana, mes, racha y mejores básicos', () => {
  const s = mySnapshot(data, sessions, now)
  assert.equal(s.name, 'Ana')
  assert.deepEqual(s.week, { sessions: 1, volume: 800, sets: 2, minutes: 60 })
  assert.equal(s.month.sessions, 2) // 13 de enero y 5 de enero
  assert.equal(s.total, 3)
  assert.equal(s.streak, 2)
  assert.equal(s.lifts.bench, 93.3) // 80 × 5 → 93,3 (mejor que 90 × 1)
  assert.equal(s.lifts.squat, 140)
  assert.equal(s.lifts.deadlift, 165)
})

test('enlace: ida y vuelta, y valores manipulados acotados', async () => {
  const s = mySnapshot(data, sessions, now)
  assert.deepEqual(await decodeSnapshot(await encodeSnapshot(s)), s)
  const evil = 'j' + toBase64Url(new TextEncoder().encode(JSON.stringify([1, 'x'.repeat(500), now, [-5, 1e12, 'a', 3], [], 9e9, 2, [99999, -1, 'x']])))
  const d = await decodeSnapshot(evil)
  assert.equal(d?.name.length, 40)
  assert.deepEqual(d?.week, { sessions: 0, volume: 1e8, sets: 0, minutes: 3 })
  assert.equal(d?.streak, 1000)
  assert.deepEqual(d?.lifts, { bench: undefined, squat: undefined, deadlift: undefined })
  assert.equal(await decodeSnapshot('zroto'), undefined)
  assert.equal(await decodeSnapshot('j' + toBase64Url(new TextEncoder().encode('[2,"x"]'))), undefined)
})

test('amigos por nombre y semanas comparables', () => {
  assert.equal(friendKey(' Ána '), friendKey('ana'))
  assert.equal(sameWeek(now - 86400000, now), true)
  assert.equal(sameWeek(now - 5 * 86400000, now), false) // el viernes anterior
})
