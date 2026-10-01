import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { achievements } from '../src/lib/achievements'
import { DAY, T0, exercise, session, set } from './helpers'

const byId = (list: ReturnType<typeof achievements>) => Object.fromEntries(list.map((a) => [a.id, a]))

test('constancia: número de entrenamientos y rachas, con la sesión que lo consiguió', () => {
  const sessions = Array.from({ length: 12 }, (_, i) => session(i * 7, [exercise('Barbell_Squat', [set(60, 5)])], { id: `s${i}` }))
  const a = byId(achievements(sessions, [], 'kg'))
  assert.equal(a['sessions-1'].sessionId, 's0')
  assert.equal(a['sessions-10'].sessionId, 's9')
  assert.equal(a['sessions-25'].unlockedAt, undefined)
  assert.deepEqual(a['sessions-25'].progress?.[1], 25)
  assert.equal(a['streak-4'].sessionId, 's3')
  assert.equal(a['streak-12'].sessionId, 's11')
  // Un hueco de dos semanas corta la racha.
  const gap = [...sessions.slice(0, 3), ...sessions.slice(5).map((s) => ({ ...s }))]
  assert.equal(byId(achievements(gap, [], 'kg'))['streak-12'].unlockedAt, undefined)
})

test('fuerza: clubes en su unidad y relativos al peso corporal', () => {
  const sessions = [
    session(0, [exercise('Barbell_Bench_Press_-_Medium_Grip', [set(80, 5)])], { id: 'a' }),
    session(7, [exercise('Barbell_Deadlift', [set(160, 1)]), exercise('Barbell_Bench_Press_-_Medium_Grip', [set(100, 1)])], { id: 'b' }),
  ]
  const kg = byId(achievements(sessions, [{ id: 'm', date: T0 - DAY, weight: 80 }], 'kg'))
  assert.equal(kg['bench-bodyweight'].sessionId, 'a') // 80 kg con 80 kg de peso
  assert.equal(kg['club-1'].sessionId, 'b')
  assert.equal(kg['club-2'].sessionId, 'b')
  assert.equal(kg['deadlift-double'].sessionId, 'b')
  assert.equal(kg['club-1'].title[0], 'Club de los 100 kg')
  // En libras los umbrales son 225 y 315 lb (102 y 143 kg).
  const lb = byId(achievements(sessions, [], 'lb'))
  assert.equal(lb['club-1'].sessionId, 'b') // el peso muerto de 160 kg (352 lb), no la banca de 100 kg (220 lb)
  assert.equal(lb['club-2'].sessionId, 'b')
  assert.equal(byId(achievements(sessions.slice(0, 1), [], 'lb'))['club-1'].unlockedAt, undefined)
  // Sin peso corporal registrado no se pueden conseguir los relativos.
  assert.equal(lb['bench-bodyweight'].unlockedAt, undefined)
})

test('volumen, récords, variedad y horario', () => {
  const at = (day: number, hour: number) => new Date(2026, 0, 5 + day, hour).getTime()
  const sessions = Array.from({ length: 11 }, (_, i) => {
    const start = at(i, i === 0 ? 6 : 22)
    return session(0, [exercise('bench', [set(100 + i, 10)])], { id: `s${i}`, start, end: start + 3600000 })
  })
  const a = byId(achievements(sessions, [], 'kg'))
  assert.equal(a['early-bird'].sessionId, 's0')
  assert.equal(a['night-owl'].sessionId, 's1')
  assert.equal(a['volume-10'].sessionId, 's9') // 1000+1010+…: pasa de 10 t en la décima
  assert.equal(a['records-10'].sessionId, 's10') // la primera vez no es récord
  assert.deepEqual(a['variety-25'].progress, [1, 25])
})

test('los ejercicios de los clubes existen en el catálogo', () => {
  const ids = new Set((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: { id: string }[] }).exercises.map((e) => e.id))
  const src = readFileSync('src/lib/achievements.ts', 'utf8')
  for (const m of src.matchAll(/'([A-Z][A-Za-z_-]+(?:_-_[A-Za-z_-]+)?)'/g)) if (m[1].includes('_')) assert.ok(ids.has(m[1]), m[1])
})
