import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { equipmentInfo } from '../src/lib/generator'
import { better, scoreText, wodOf, wodSession, type WodRecord } from '../src/lib/wod'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)
const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 9, 1 + i, 12)).toISOString().slice(0, 10))

test('WOD: el mismo día sale el mismo, y «otro» es distinto', () => {
  assert.deepEqual(wodOf('2026-10-08', 'gym', 'intermediate'), wodOf('2026-10-08', 'gym', 'intermediate'))
  assert.notDeepEqual(wodOf('2026-10-08', 'gym', 'intermediate', 1), wodOf('2026-10-08', 'gym', 'intermediate'))
})

test('WOD: solo ejercicios que existen y que tu material permite', () => {
  for (const equipment of ['gym', 'dumbbells', 'kettlebell', 'bands', 'bodyweight'] as const) {
    const allowed = new Set([...equipmentInfo(equipment).allowed, ...(equipment === 'gym' ? ['other', 'machine', 'medicine-ball'] : []), 'other'])
    for (const day of days) {
      for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
        const w = wodOf(day, equipment, level, 0, catalog)
        assert.ok(w.moves.length >= 2, `${day} ${equipment}`)
        assert.equal(new Set(w.moves.map((m) => m.exerciseId)).size, w.moves.length)
        for (const m of w.moves) {
          const e = catalog.get(m.exerciseId)
          assert.ok(e, m.exerciseId)
          assert.ok(allowed.has(e.equipment), `${equipment}: ${m.exerciseId} (${e.equipment})`)
          if (equipment !== 'gym') assert.ok(!['Pullups', 'Rowing_Machine', 'Wall_Ball', 'Barbell_Thruster'].includes(m.exerciseId), `${equipment}: ${m.exerciseId}`)
        }
      }
    }
  }
})

test('WOD: los sábados, la prueba fija que se repite cada 4 semanas', () => {
  const a = wodOf('2026-10-10', 'gym', 'intermediate')
  assert.ok(a.benchmark)
  assert.equal(wodOf('2026-11-07', 'gym', 'beginner').key, a.key, 'misma prueba 4 semanas después, sea cual sea el nivel')
  assert.notEqual(wodOf('2026-10-17', 'gym', 'intermediate').benchmark, a.benchmark)
})

test('WOD: el resultado queda como entrenamiento con el total de cada ejercicio', () => {
  const w = { key: 'k', format: 'amrap' as const, minutes: 12, moves: [{ exerciseId: 'Pushups', reps: 10 }, { exerciseId: 'Bodyweight_Squat', reps: 15 }, { exerciseId: 'Rowing_Machine', meters: 250 }] }
  const r: WodRecord = { key: 'k', format: 'amrap', minutes: 12, rounds: 5, reps: 13 }
  const s = wodSession(w, r, catalog, 0, 720000)
  assert.deepEqual(s.exercises.map((e) => e.sets[0].reps), [60, 78, 0])
  assert.equal(s.exercises[2].sets[0].distance, 1.25)
  assert.equal(s.wod, r)
  assert.equal(scoreText(r), '5 rondas + 13 reps')
  const ladder = wodSession({ key: 'l', format: 'forTime', minutes: 15, ladder: [21, 15, 9], moves: [{ exerciseId: 'Pushups', reps: 9 }] }, { key: 'l', format: 'forTime', minutes: 15, rounds: 3, seconds: 400 }, catalog, 0, 1)
  assert.equal(ladder.exercises[0].sets[0].reps, 45)
})

test('WOD: qué resultado es mejor', () => {
  const base = { key: 'k', minutes: 15 }
  assert.ok(better({ ...base, format: 'forTime', rounds: 3, seconds: 400 }, { ...base, format: 'forTime', rounds: 3, seconds: 450 }))
  assert.ok(better({ ...base, format: 'forTime', rounds: 3, seconds: 900 }, { ...base, format: 'forTime', rounds: 3 }), 'acabar siempre gana a quedarse sin tiempo')
  assert.ok(better({ ...base, format: 'amrap', rounds: 5, reps: 3 }, { ...base, format: 'amrap', rounds: 5 }))
})
