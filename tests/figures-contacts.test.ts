import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FIGURES } from '../src/lib/figures'
import { place, poseAt } from '../src/lib/figureEngine'

/** Cuánto se mueve un punto a lo largo de la animación. */
function travel(id: string, joint: 'toe2' | 'ankle2' | 'wrist' | 'wrist2' | 'ankle'): number {
  const f = FIGURES[id]
  const pts = Array.from({ length: 13 }, (_, s) => place(f, poseAt(f, s / 12))[joint])
  return Math.max(...pts.map((p) => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1])))
}

test('figuras: el pie de atrás de las zancadas y la sentadilla búlgara no patina', () => {
  for (const id of ['Split_Squats', 'Dumbbell_Lunges', 'Barbell_Lunge']) assert.ok(travel(id, 'toe2') < 3, `${id}: ${travel(id, 'toe2').toFixed(1)}`)
})

test('figuras: las manos de las flexiones se quedan en el suelo', () => {
  assert.ok(travel('Pushups', 'wrist') < 4, travel('Pushups', 'wrist').toFixed(1))
})

test('figuras: al caminar los pies sí avanzan', () => {
  assert.ok(travel('Farmers_Walk', 'ankle2') > 20)
})

test('figuras: en la prensa de piernas el tobillo va en línea recta hacia la plataforma', () => {
  const f = FIGURES.Leg_Press
  const a = place(f, poseAt(f, 0)).ankle, b = place(f, poseAt(f, 1)).ankle
  const dir = (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI
  assert.ok(Math.abs(dir - 58) < 6, `dirección ${dir.toFixed(1)}`)
})
