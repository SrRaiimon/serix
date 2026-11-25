import assert from 'node:assert/strict'
import { test } from 'node:test'
import { achievements } from '../src/lib/achievements'
import { goalStatus } from '../src/lib/goals'
import { insights } from '../src/lib/insights'
import { recordCardSVG } from '../src/lib/shareCard'
import { DAY, T0, exercise, session, set } from './helpers'

test('logros: el primer entreno con peso tras hacerlo sin peso no cuenta como récord (igual que el resumen)', () => {
  // Diez veces dominadas sin lastre (sin carga) y después diez con lastre subiendo: 9 récords, no 10.
  const sessions = [
    ...Array.from({ length: 10 }, (_, i) => session(i, [exercise('Pullups', [set(0, 8)])])),
    ...Array.from({ length: 10 }, (_, i) => session(10 + i, [exercise('Pullups', [set(5 + i, 8)])])),
  ]
  const a = achievements(sessions, [], 'kg').find((x) => x.id === 'records-10')!
  assert.equal(a.unlockedAt, undefined)
  assert.deepEqual(a.progress, [9, 10])
})

test('meta de fuerza conseguida en un entreno anterior a la meta (editado): la fecha de la marca, no hoy', () => {
  const sessions = [session(0, [exercise('Bench', [set(100, 1)])])]
  const goal = { id: 'g', exerciseId: 'Bench', name: 'Banca', kg: 95, from: 90, createdAt: T0 + 30 * DAY }
  assert.equal(goalStatus(goal, sessions, T0 + 40 * DAY).doneAt, T0)
})

test('descanso antes del entreno: cuenta desde el entreno anterior, aunque no tenga puntuación', () => {
  // Cada 5 días: fuerza fuerte, fuerza floja al día siguiente y cardio dos días después. Todos los descansos son
  // de 1 o 2 días, así que no hay «corto frente a largo». Antes se medía de fuerza a fuerza: la fuerte salía tras
  // 4 días y decía que rindes más con descansos largos.
  const sessions = Array.from({ length: 12 }, (_, c) => [
    session(c * 5, [exercise('Bench', [set(84, 5)])]),
    session(c * 5 + 1, [exercise('Bench', [set(80, 5)])]),
    session(c * 5 + 3, [exercise('Running', [set(0, 0, { duration: 1800 })])]),
  ]).flat()
  assert.equal(insights(sessions).find((x) => x.kind === 'rest'), undefined)
})

test('tarjeta de récord: una mejora de menos de 1 kg no sale como «+0 kg»', () => {
  const svg = recordCardSVG({ record: { exerciseId: 'Bench', name: 'Banca', weight: 100, reps: 1, e1rm: 100, date: T0 }, unit: 'kg', previous: 99.6, setText: '100 × 1' })
  assert.ok(!svg.includes('+0 kg'))
  assert.match(svg, /\+0[,.]4 kg/)
})

test('logros: un ejercicio en dos bloques del mismo entreno es un solo récord (como el resumen)', () => {
  // Primer entreno de base; luego diez entrenos con press en dos bloques, los dos por encima de la marca: 10 récords, no 20.
  const sessions = [
    session(0, [exercise('Barbell_Bench_Press_-_Medium_Grip', [set(60, 8)])]),
    ...Array.from({ length: 10 }, (_, i) => session(1 + i, [
      exercise('Barbell_Bench_Press_-_Medium_Grip', [set(62 + i * 2, 8)]),
      exercise('Barbell_Bench_Press_-_Medium_Grip', [set(62 + i * 2, 8)]),
    ])),
  ]
  const a = achievements(sessions, [], 'kg').find((x) => x.id === 'records-10')!
  assert.notEqual(a.unlockedAt, undefined)
  assert.equal(a.sessionId, sessions[10].id) // el décimo récord es el décimo entreno con mejora, no el quinto
})
