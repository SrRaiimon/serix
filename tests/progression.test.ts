import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { LIFTS_531, plan, progressionStep, trainingMaxFrom } from '../src/lib/progression'
import { exercise, session, set } from './helpers'

const base = { exerciseId: 'bench', muscle: 'pectorals', sets: 3, repsMin: 8, repsMax: 12 }
const shape = (p: ReturnType<typeof plan>) => p?.sets.map((s) => `${s.weight}x${s.reps}${s.kind ? ':' + s.kind : ''}`)

test('sin progresión o sin datos: se rellena como siempre', () => {
  assert.equal(plan(base, [set(80, 12)], [], 'kg'), undefined)
  assert.equal(plan({ ...base, progression: 'double' }, [], [], 'kg'), undefined)
})

test('doble progresión: al llegar al máximo sube el peso y vuelve al mínimo', () => {
  const up = plan({ ...base, progression: 'double' }, [set(80, 12), set(80, 12), set(80, 12)], [], 'kg')
  assert.deepEqual(shape(up), ['82.5x8', '82.5x8', '82.5x8'])
  assert.deepEqual(up?.auto, { kind: 'up', from: 80, to: 82.5, mode: 'double' })
  // Si falta alguna serie o repetición, mismo peso y mismas repeticiones que la última vez.
  const hold = plan({ ...base, progression: 'double' }, [set(80, 12), set(80, 11), set(80, 10)], [], 'kg')
  assert.deepEqual(shape(hold), ['80x12', '80x11', '80x10'])
  assert.equal(hold?.auto?.kind, 'hold')
  assert.equal(plan({ ...base, progression: 'double' }, [set(80, 12), set(80, 12)], [], 'kg')?.auto?.kind, 'hold')
})

test('lineal: sube si completa, el doble en pierna; si no, repite el objetivo', () => {
  const squat = { exerciseId: 'squat', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, progression: 'linear' as const }
  assert.deepEqual(shape(plan(squat, [set(100, 5), set(100, 5), set(100, 5)], [], 'kg')), ['105x5', '105x5', '105x5'])
  assert.deepEqual(shape(plan(squat, [set(100, 5), set(100, 5), set(100, 3)], [], 'kg')), ['100x5', '100x5', '100x5'])
  assert.equal(progressionStep('quads', 'kg'), 5)
  assert.equal(progressionStep('pectorals', 'kg'), 2.5)
  // Los drop sets no cuentan.
  assert.equal(plan(squat, [set(100, 5), set(100, 5), set(100, 5), set(70, 4, { kind: 'drop' })], [], 'kg')?.auto?.kind, 'up')
})

test('5/3/1: semanas del ciclo, AMRAP, descarga y subida del TM', () => {
  const lift = { exerciseId: 'squat', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, progression: 'wave531' as const, trainingMax: 100, tmSince: 0 }
  const doneTimes = (n: number) => Array.from({ length: n }, (_, i) => session(i * 7, [exercise('squat', [set(80, 5)])]))
  const w1 = plan(lift, [], doneTimes(0), 'kg')
  assert.deepEqual(shape(w1), ['65x5', '75x5', '85x5:amrap'])
  assert.deepEqual(w1?.auto, { kind: 'wave', week: 1, tm: 100 })
  assert.deepEqual(shape(plan(lift, [], doneTimes(1), 'kg')), ['70x3', '80x3', '90x3:amrap'])
  assert.deepEqual(shape(plan(lift, [], doneTimes(2), 'kg')), ['75x5', '85x3', '95x1:amrap'])
  const deload = plan(lift, [], doneTimes(3), 'kg')
  assert.deepEqual(shape(deload), ['40x5', '50x5', '60x5'])
  assert.equal(deload?.deload, true)
  // Segundo ciclo: TM + 5 kg (pierna).
  const next = plan(lift, [], doneTimes(4), 'kg')
  assert.deepEqual(next?.auto, { kind: 'wave', week: 1, tm: 105 })
  assert.deepEqual(shape(next), ['67.5x5', '80x5', '90x5:amrap']) // 68,25 · 78,75 · 89,25 redondeados a 2,5
  // Lo hecho antes de fijar el TM no cuenta.
  assert.equal(plan({ ...lift, tmSince: Date.UTC(2030, 0, 1) }, [], doneTimes(3), 'kg')?.auto?.kind, 'wave')
  assert.deepEqual(plan({ ...lift, tmSince: Date.UTC(2030, 0, 1) }, [], doneTimes(3), 'kg')?.auto, { kind: 'wave', week: 1, tm: 100 })
  assert.equal(plan({ ...lift, trainingMax: undefined }, [], [], 'kg'), undefined)
})

test('5/3/1: los básicos y accesorios existen en el catálogo y el TM es el 90 %', () => {
  const ids = new Set((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: { id: string }[] }).exercises.map((e) => e.id))
  for (const l of LIFTS_531) {
    assert.ok(ids.has(l.id), l.id)
    for (const [id] of l.accessories) assert.ok(ids.has(id), id)
  }
  assert.equal(trainingMaxFrom(140, 'kg'), 125) // 126 → 125
})
