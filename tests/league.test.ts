import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FriendSnapshot } from '../src/lib/friends'
import { crowns, leaguePoints, pastChampions, weeklyLeague } from '../src/lib/league'
import { DAY } from './helpers'

// Miércoles 14 de octubre de 2026.
const NOW = new Date(2026, 9, 14, 12).getTime()
const stats = (sessions: number, sets = sessions * 15) => ({ sessions, volume: sessions * 5000, sets, minutes: sessions * 60 })
const snap = (name: string, at: number, week: number, weeks: [number, number][], extra: Partial<FriendSnapshot> = {}): FriendSnapshot => ({
  name, at, week: stats(week), month: stats(week * 4), streak: 2, total: 50, lifts: {}, weeks, ...extra,
})

test('liga: puntos por constancia con topes', () => {
  assert.equal(leaguePoints(3, 45, 1, 5), 30 + 9 + 5 + 5)
  assert.equal(leaguePoints(9, 400, 9, 0), 60 + 30 + 25)
})

test('liga: solo cuentan los resúmenes de esta semana, y los récords de esta semana', () => {
  const me = snap('Yo', NOW, 2, [])
  const ana = snap('Ana', NOW - DAY, 3, [], { prs: [{ exerciseId: 'x', name: 'x', weight: 1, reps: 1, at: NOW - DAY }, { exerciseId: 'y', name: 'y', weight: 1, reps: 1, at: NOW - 20 * DAY }] })
  const old = snap('Luis', NOW - 10 * DAY, 6, [])
  const rows = weeklyLeague(me, [ana, old], NOW)
  assert.deepEqual(rows.map((r) => r.name), ['Ana', 'Yo'])
  assert.equal(rows[0].prs, 1)
})

test('liga: ganadores de semanas pasadas, solo con semanas completas', () => {
  // Mi resumen de hoy: 8 semanas, la última es esta (a medias).
  const me = snap('Yo', NOW, 1, [[2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [2, 1], [3, 1], [1, 1]])
  // Ana lo mandó el lunes pasado (semana anterior): su última semana (la pasada) está a medias y no cuenta.
  const ana = snap('Ana', NOW - 9 * DAY, 1, [[3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [3, 1], [1, 1]])
  const champions = pastChampions(me, [ana], NOW)
  // La semana pasada solo la tengo completa yo: nadie gana. Las anteriores, Ana (3 > 2).
  assert.equal(champions.length, 6)
  assert.ok(champions.every((c) => c.name === 'Ana'))
  assert.deepEqual(crowns(champions), [{ name: 'Ana', count: 6 }])
})
