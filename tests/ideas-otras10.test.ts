import assert from 'node:assert/strict'
import { test } from 'node:test'
import { challengeProgress, type Challenge } from '../src/lib/friends'
import { fastState, supplementStreak, toggleSupplement } from '../src/lib/habits'
import { insights, sessionScores } from '../src/lib/insights'
import { exerciseVolume, sessionVolume } from '../src/lib/stats'
import { parseTempo, tempoAt } from '../src/lib/tempo'
import { DAY, exercise, session, set, T0 } from './helpers'

test('suplementos: marcar, desmarcar y días seguidos', () => {
  let log = toggleSupplement(undefined, 'Creatina', '2026-10-06')
  log = toggleSupplement(log, 'Creatina', '2026-10-07')
  log = toggleSupplement(log, 'Creatina', '2026-10-08')
  assert.equal(supplementStreak(log, 'Creatina', '2026-10-08'), 3)
  // Hoy aún no: cuenta hasta ayer.
  assert.equal(supplementStreak(log, 'Creatina', '2026-10-09'), 3)
  log = toggleSupplement(log, 'Creatina', '2026-10-07')
  assert.equal(supplementStreak(log, 'Creatina', '2026-10-08'), 1)
  assert.deepEqual(toggleSupplement({ '2026-10-08': ['A'] }, 'A', '2026-10-08'), {})
})

test('ayuno: horas, progreso y cuándo se abre la ventana', () => {
  const start = T0
  const st = fastState(start, 16, start + 8 * 3600000)
  assert.equal(st.hours, 8)
  assert.equal(st.progress, 0.5)
  assert.equal(st.endsAt, start + 16 * 3600000)
  assert.equal(fastState(start, 16, start + 17 * 3600000).done, true)
})

test('tempo: fases y en qué punto vas', () => {
  const p = parseTempo('3-1-1')!
  assert.deepEqual(p.map((x) => x.phase), ['down', 'hold', 'up'])
  assert.deepEqual(tempoAt(p, 0), { rep: 1, phase: 'down', left: 3, second: 0 })
  assert.equal(tempoAt(p, 3.2).phase, 'hold')
  assert.equal(tempoAt(p, 4.5).phase, 'up')
  assert.equal(tempoAt(p, 5.1).rep, 2)
  assert.equal(parseTempo('3-0-1-0')!.length, 2)
  assert.equal(parseTempo('rápido'), undefined)
})

test('peso por mancuerna: el peso movido cuenta las dos', () => {
  const each = exercise('Curl', [set(15, 10)], { perHand: true })
  assert.equal(exerciseVolume(each), 300)
  assert.equal(sessionVolume(session(0, [each, exercise('Bench', [set(60, 5)])])), 600)
})

test('retos de comida: días apuntando y días cumpliendo la proteína', () => {
  const c = { id: 'abcd', metric: 'proteinDays', start: new Date(2026, 9, 1).getTime(), end: new Date(2026, 9, 31).getTime(), by: 'Ana' } as Challenge
  const e = (day: string, p: number) => ({ id: day + p, day, meal: 'lunch' as const, name: 'x', grams: 100, per100: { kcal: 100, p, c: 0, f: 0 }, at: 0 })
  const entries = [e('2026-10-02', 140), e('2026-10-03', 80), e('2026-10-04', 150), e('2026-09-30', 200)]
  assert.equal(challengeProgress(c, [], { entries, protein: 150 }), 2)
  assert.equal(challengeProgress({ ...c, metric: 'logDays' }, [], { entries }), 3)
  assert.equal(challengeProgress(c, [], { entries }), 0)
})

test('lo que te hace rendir mejor: sueño con datos suficientes', () => {
  // Cada entreno, la sentadilla sube un poco; los días de buen sueño, bastante más.
  const sessions = Array.from({ length: 12 }, (_, i) => {
    const good = i % 2 === 0
    return session(i * 3, [exercise('Squat', [set(100 + (good ? 8 : 0), 5)])], { readiness: { sleep: good ? 5 : 1, energy: 3, soreness: 3 } })
  })
  assert.equal(sessionScores(sessions).length, 11)
  const list = insights(sessions)
  const sleep = list.find((x) => x.kind === 'sleep')
  assert.ok(sleep && sleep.diff >= 0.03)
  // Con pocos entrenos no se dice nada.
  assert.deepEqual(insights(sessions.slice(0, 4)), [])
  assert.ok(DAY > 0)
})
