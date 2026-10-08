import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { muscleBalance } from '../src/lib/balance'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { buildLibraryProgram, equipmentInfo, LIBRARY } from '../src/lib/generator'
import { buildSegments, DEFAULTS, totalSeconds } from '../src/lib/intervals'
import { focusFor } from '../src/lib/warmupRoutine'
import { exercise, set } from './helpers'
import type { Session } from '../src/lib/store'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)

test('biblioteca: cada programa sale completo con el material indicado', () => {
  for (const p of LIBRARY) {
    for (const equipment of p.equipment ? [p.equipment] : (['gym', 'dumbbells', 'bodyweight'] as const)) {
      const program = buildLibraryProgram(p, equipment, catalog)
      assert.equal(program.days.length, p.templates.length, p.id)
      const allowed = new Set(equipmentInfo(equipment).allowed)
      for (const day of program.days) {
        assert.ok(day.exercises.length >= Math.min(3, p.templates[0].slots.length), `${p.id} ${equipment}: ${day.name} con ${day.exercises.length} ejercicios`)
        assert.equal(new Set(day.exercises.map((e) => e.exercise.id)).size, day.exercises.length, `${p.id}: ejercicio repetido en ${day.name}`)
        for (const e of day.exercises) assert.ok(allowed.has(e.exercise.equipment), `${p.id} ${equipment}: ${e.exercise.id} usa ${e.exercise.equipment}`)
      }
    }
  }
})

test('5×5: básicos con progresión lineal y accesorios sin ella', () => {
  const p = buildLibraryProgram(LIBRARY.find((x) => x.id === 'strength5x5')!, 'gym', catalog)
  const a = p.days[0].exercises
  assert.deepEqual(a.map((e) => [e.sets, e.repsMin, e.repsMax, e.progression]), [[5, 5, 5, 'linear'], [5, 5, 5, 'linear'], [5, 5, 5, 'linear']])
})

const DAY = 86400000
const now = Date.UTC(2026, 2, 20)
const s = (daysAgo: number, muscle: string, sets: number): Session => ({
  id: `${daysAgo}${muscle}`, name: 'X', start: now - daysAgo * DAY, end: now - daysAgo * DAY + 3600000, notes: '',
  exercises: [exercise(muscle, Array.from({ length: sets }, () => set(50, 10)), { muscle })],
})

test('equilibrio: avisa de mucho empuje y poco tirón', () => {
  const b = muscleBalance([s(1, 'pectorals', 12), s(3, 'triceps', 6), s(5, 'lats', 6), s(40, 'lats', 30)], now)
  const pp = b.pairs.find((p) => p.id === 'pushPull')!
  assert.deepEqual(pp.sets, [18, 6]) // lo de hace 40 días no cuenta
  assert.equal(pp.short, 1)
})

test('equilibrio: proporciones normales y pocos datos no avisan', () => {
  const ok = muscleBalance([s(1, 'pectorals', 10), s(2, 'lats', 9), s(3, 'quads', 10), s(4, 'hamstrings', 5)], now)
  assert.deepEqual(ok.pairs.map((p) => p.short), [undefined, undefined])
  const few = muscleBalance([s(1, 'quads', 8), s(2, 'pectorals', 2)], now)
  assert.equal(few.pairs.find((p) => p.id === 'quadsHams')!.short, undefined) // 8 series: muy pocas
  const hams = muscleBalance([s(1, 'quads', 15), s(2, 'hamstrings', 2)], now)
  assert.equal(hams.pairs.find((p) => p.id === 'quadsHams')!.short, 1)
})

test('equilibrio: grupos sin ninguna serie (con suficiente entrenamiento)', () => {
  const b = muscleBalance([s(1, 'pectorals', 15), s(2, 'lats', 15)], now)
  assert.ok(b.neglected.some(([es]) => es === 'Cuádriceps'))
  assert.deepEqual(muscleBalance([s(1, 'pectorals', 5)], now).neglected, [])
})

test('calentamiento: 8 movimientos con cambios de 5 s y unos 5 minutos', () => {
  const segments = buildSegments({ ...DEFAULTS.warmup, focus: 'legs' })
  const work = segments.filter((x) => x.kind === 'work')
  assert.equal(work.length, 8)
  assert.ok(work.every((x) => x.label && x.cue))
  assert.equal(segments.filter((x) => x.kind === 'rest').length, 7)
  assert.equal(totalSeconds(segments), 5 + 8 * 30 + 7 * 5)
  // Cada cambio anuncia el siguiente movimiento.
  const i = segments.findIndex((x) => x.kind === 'rest')
  assert.equal(segments[i].label, segments[i + 1].label)
})

test('calentamiento según el entrenamiento', () => {
  assert.equal(focusFor(['quads', 'hamstrings', 'glutes', 'abs']), 'legs')
  assert.equal(focusFor(['pectorals', 'lats', 'delts', 'quads']), 'upper')
  assert.equal(focusFor(['pectorals', 'quads']), 'full')
})

test('equilibrio: un grupo trabajado como secundario no sale «sin ninguna serie»', () => {
  // La sentadilla (cuádriceps) trabaja glúteos: «Series por grupo» le da media serie, así que no está olvidado.
  const sessions = [s(1, 'quads', 15), s(2, 'pectorals', 15)]
  assert.ok(muscleBalance(sessions, now).neglected.some(([es]) => es === 'Glúteos'))
  assert.ok(!muscleBalance(sessions, now, (id) => (id === 'quads' ? ['glutes'] : [])).neglected.some(([es]) => es === 'Glúteos'))
})
