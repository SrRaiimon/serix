import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { LIFTS_531, plan, progressionStep, rememberEquipment, trainingMaxFrom } from '../src/lib/progression'
import { exercise, session, set } from './helpers'
import { warmupSets } from '../src/lib/warmup'

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

test('progresión con RPE: al límite no se sube; sobrado, se sube antes', () => {
  const dbl = { ...base, progression: 'double' as const }
  const hard = plan(dbl, [set(80, 12, { rpe: 10 }), set(80, 12, { rpe: 9.5 }), set(80, 12, { rpe: 9 })], [], 'kg')
  assert.deepEqual(hard?.auto, { kind: 'hold', mode: 'double', reason: 'rpe' })
  assert.deepEqual(shape(hard), ['80x12', '80x12', '80x12'])
  const easy = plan(dbl, [set(80, 11, { rpe: 7 }), set(80, 11, { rpe: 7 }), set(80, 12, { rpe: 6 })], [], 'kg')
  assert.equal(easy?.auto?.kind, 'up')
  // Sin RPE apuntado, como siempre.
  assert.equal(plan(dbl, [set(80, 11), set(80, 11), set(80, 12)], [], 'kg')?.auto?.kind, 'hold')
})

test('aislamiento: saltos pequeños (5 %, al menos 1 kg)', () => {
  const lateral = { exerciseId: 'Side_Lateral_Raise', muscle: 'delts', sets: 3, repsMin: 12, repsMax: 15, progression: 'double' as const }
  const up = plan(lateral, [set(8, 15), set(8, 15), set(8, 15)], [], 'kg')
  assert.deepEqual(up?.auto, { kind: 'up', from: 8, to: 9, mode: 'double' })
  assert.equal(progressionStep('quads', 'kg', 'Leg_Extensions', 60), 3)
  assert.equal(progressionStep('quads', 'kg', 'Barbell_Squat', 100), 5)
})

test('lineal: tras 3 sesiones sin completar, un 10 % menos', () => {
  const squat = { exerciseId: 'squat', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, progression: 'linear' as const }
  const fail = (day: number) => session(day, [exercise('squat', [set(100, 5), set(100, 4), set(100, 3)], { muscle: 'quads' })])
  const history = [fail(0), fail(3), fail(6)]
  const p = plan(squat, [set(100, 5), set(100, 4), set(100, 3)], history, 'kg')
  assert.deepEqual(p?.auto, { kind: 'down', from: 100, to: 90, mode: 'linear' })
  // Con solo dos fallos, se repite.
  assert.equal(plan(squat, [set(100, 5), set(100, 4), set(100, 3)], history.slice(1), 'kg')?.auto?.kind, 'hold')
})

test('5/3/1: si un AMRAP no llega al mínimo, el TM baja un 10 % en el ciclo siguiente', () => {
  const lift = { exerciseId: 'squat', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, progression: 'wave531' as const, trainingMax: 100, tmSince: 0 }
  const week = (day: number, amrapReps: number) => session(day, [exercise('squat', [set(70, 5), set(80, 5), set(90, amrapReps, { kind: 'amrap' })])])
  const cycle = (third: number) => [week(0, 8), week(7, 5), week(14, third), session(21, [exercise('squat', [set(40, 5)])])]
  assert.deepEqual(plan(lift, [], cycle(0), 'kg')?.auto, { kind: 'wave', week: 1, tm: 90, reset: true })
  assert.deepEqual(plan(lift, [], cycle(3), 'kg')?.auto, { kind: 'wave', week: 1, tm: 105 })
})

test('pierna con mancuerna o a una pierna sube como el tren superior', () => {
  assert.equal(progressionStep('quads', 'kg', 'Barbell_Squat'), 5)
  assert.equal(progressionStep('quads', 'kg', 'Goblet_Squat'), 2.5)
  assert.equal(progressionStep('quads', 'kg', 'Dumbbell_Lunges'), 2.5)
})

test('porcentaje: usa el 1RM de los últimos 90 días desde hoy; tras una pausa, el de antes −10 %', () => {
  const lift = { exerciseId: 'bench', muscle: 'pectorals', sets: 3, repsMin: 5, repsMax: 5, progression: 'percent' as const, percent: 0.8 }
  const old = session(0, [exercise('bench', [set(100, 1)])])
  const recent = session(365, [exercise('bench', [set(80, 1)])])
  const today = recent.start + 86400000
  assert.equal(plan(lift, [], [old, recent], 'kg', today)?.sets[0].weight, 65) // 80 × 0,8 = 64 → 65
  // Volviendo de una pausa larga: lo de los 90 días antes de parar (80, no el récord de 100 de hace un año) −10 %.
  assert.equal(plan(lift, [], [old, recent], 'kg', recent.start + 200 * 86400000)?.sets[0].weight, 57.5) // 80 × 0,9 × 0,8 = 57,6
  assert.equal(plan(lift, [], [old], 'kg', today)?.sets[0].weight, 72.5) // 100 × 0,9 × 0,8 = 72
})

test('sin peso: al llegar al máximo en todas, una repetición más; pasado el tope, variante más difícil', () => {
  const push = { exerciseId: 'Pushups', muscle: 'pectorals', sets: 3, repsMin: 8, repsMax: 12, progression: 'double' as const }
  // Aún no llega al máximo en todas: se rellena como siempre.
  assert.equal(plan(push, [set(0, 12), set(0, 12), set(0, 10)], [], 'kg'), undefined)
  const up = plan(push, [set(0, 12), set(0, 13), set(0, 12)], [], 'kg')
  assert.deepEqual(shape(up), ['0x13', '0x13', '0x13'])
  assert.deepEqual(up?.auto, { kind: 'reps', from: 12, to: 13 })
  // En «Manual» (sin progresión) no se toca nada aunque se apunten 0 kg.
  assert.equal(plan({ ...push, progression: undefined }, [set(0, 12), set(0, 12), set(0, 12)], [], 'kg'), undefined)
  const top = plan(push, [set(0, 17), set(0, 17), set(0, 18)], [], 'kg')
  assert.deepEqual(top?.auto, { kind: 'reps', from: 17, to: 17, harder: true })
  // Ya por encima del tope: nunca menos de lo que haces.
  assert.deepEqual(shape(plan(push, [set(0, 20), set(0, 20), set(0, 20)], [], 'kg')), ['0x20', '0x20', '0x20'])
})

test('5/3/1: dos sesiones en la misma semana cuentan como una semana del ciclo', () => {
  const lift = { exerciseId: 'squat', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, progression: 'wave531' as const, trainingMax: 100, tmSince: 0 }
  const a = session(0, [exercise('squat', [set(70, 5)])])
  const b = { ...session(0, [exercise('squat', [set(70, 5)])]), start: a.start + 3600000 }
  // Más tarde, otra semana: toca la semana 2 del ciclo (no la 3).
  assert.equal(plan(lift, [], [a, b], 'kg', a.start + 30 * 86400000)?.auto?.kind === 'wave' && (plan(lift, [], [a, b], 'kg', a.start + 30 * 86400000)?.auto as { week: number }).week, 2)
  // La misma semana: se repite la semana 1.
  assert.equal((plan(lift, [], [a], 'kg', a.start + 7200000)?.auto as { week: number }).week, 1)
})

test('mancuernas y kettlebells: suben al siguiente peso que existe, por material y no por el nombre', () => {
  rememberEquipment([{ id: 'Hammer_Curls', equipment: 'dumbbell' }, { id: 'Goblet_Squat', equipment: 'kettlebell' }, { id: 'Incline_Dumbbell_Press', equipment: 'dumbbell' }])
  // El martillo es de aislamiento: antes 24 → 25 (5 %); la goblet, de pierna: antes 24 → 26,5 (ahora 28).
  assert.equal(progressionStep('biceps', 'kg', 'Hammer_Curls', 24), 2)
  assert.equal(progressionStep('quads', 'kg', 'Goblet_Squat', 24), 4, 'desde 16, de 4 en 4: 24 → 28')
  assert.equal(progressionStep('quads', 'kg', 'Goblet_Squat', 18), 2, '18 → 20')
  assert.equal(progressionStep('quads', 'kg', 'Goblet_Squat', 12), 2)
  assert.equal(progressionStep('quads', 'kg', 'Goblet_Squat', 15), 1)
  // Hasta 10 kg, de 1 en 1; las series de 2 y de 2,5 desde ahí.
  assert.equal(progressionStep('biceps', 'kg', 'Hammer_Curls', 8), 1)
  assert.equal(progressionStep('pectorals', 'kg', 'Incline_Dumbbell_Press', 22), 2)
  assert.equal(progressionStep('pectorals', 'kg', 'Incline_Dumbbell_Press', 22.5), 2.5)
  // 10, 20, 30 están en las dos series: decide lo que ya se ha usado.
  assert.equal(progressionStep('pectorals', 'kg', 'Incline_Dumbbell_Press', 20), 2)
  assert.equal(progressionStep('pectorals', 'kg', 'Incline_Dumbbell_Press', 20, [15, 17.5, 20]), 2.5)
  assert.equal(progressionStep('pectorals', 'kg', 'Incline_Dumbbell_Press', 20, [16, 18, 20]), 2)
  // En libras, como siempre.
  assert.equal(progressionStep('pectorals', 'lb', 'Incline_Dumbbell_Press', 50), progressionStep('pectorals', 'lb'))
})


test('mancuernas: el calentamiento va a pesos que existen y no cambia la serie de la subida', () => {
  rememberEquipment([{ id: 'Incline_Dumbbell_Press', equipment: 'dumbbell' }])
  // Con 20 kg de trabajo, el calentamiento era 10 y 15 (redondeo a 2,5): 15 no existe en un juego de 2 en 2.
  const ramp = warmupSets(20, 'kg', undefined, false, 'Incline_Dumbbell_Press').map((w) => w.weight)
  assert.ok(ramp.every((w) => w < 10 || w % 2 === 0), ramp.join(', '))
  // Y aunque el historial tenga un calentamiento de 15 (de antes), la subida de 20 sigue la serie de 2 en 2.
  const sessions = [16, 18, 20].map((w, i) => session(i * 4, [exercise('Incline_Dumbbell_Press', [{ ...set(15, 4), warmup: true }, set(w, 12), set(w, 12), set(w, 12)], { muscle: 'pectorals' })]))
  const p = plan({ exerciseId: 'Incline_Dumbbell_Press', muscle: 'pectorals', sets: 3, repsMin: 8, repsMax: 12, progression: 'double' }, sessions[2].exercises[0].sets.filter((s) => !s.warmup), sessions, 'kg')
  assert.equal(p?.sets[0].weight, 22)
})
