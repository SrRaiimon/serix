import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { applyTip, coachTips, forgottenGroups, hideTip, plannedGroupSets } from '../src/lib/coach'
import { groupShares } from '../src/lib/volume'
import { weightGoalStatus } from '../src/lib/goals'
import { defaultSettings, type AppData, type Routine, type Settings } from '../src/lib/store'
import { DAY, exercise, session, set, T0 } from './helpers'
import { buildLibraryProgram, generate, LIBRARY, type GeneratedProgram } from '../src/lib/generator'
import { weekDone } from '../src/lib/schedule'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)

const ex = (exerciseId: string, muscle: string, sets = 3) => ({ exerciseId, name: exerciseId, muscle, sets, repsMin: 8, repsMax: 12, rest: 90 })
const routine = (id: string, exercises: Routine['exercises']): Routine => ({ id, name: id, notes: '', order: 0, createdAt: 0, programName: 'P', exercises })
const settings: Settings = { ...defaultSettings, activeProgram: 'P', goal: 'hypertrophy', weeklyGoal: 2, equipment: 'gym' }
const NOW = T0 + 40 * DAY

/** Press de banca estancado (siempre 80 × 8) cada 4 días durante 40 días, y sentadilla mejorando. */
function history() {
  return Array.from({ length: 10 }, (_, i) => session(i * 4, [
    exercise('Barbell_Bench_Press_-_Medium_Grip', [set(80, 8), set(80, 8)], { muscle: 'pectorals' }),
    exercise('Barbell_Full_Squat', [set(100 + i * 2.5, 5)], { muscle: 'quads' }),
  ], { routineId: 'a' }))
}

test('entrenador: volumen previsto del programa por grupo', () => {
  const planned = plannedGroupSets([routine('a', [ex('Barbell_Bench_Press_-_Medium_Grip', 'pectorals', 4)]), routine('b', [ex('Barbell_Full_Squat', 'quads', 4)])], 4, catalog)
  // 2 veces por semana cada rutina: 8 series de pecho y 8 de cuádriceps (más los secundarios a medias).
  assert.equal(planned[0], 8)
  assert.equal(planned[5], 8)
  assert.ok(planned[4] > 0, 'el press cuenta algo para tríceps')
})

test('volumen: un remo cuenta una serie de espalda, no una y media (dorsal de secundario)', () => {
  const planned = plannedGroupSets([routine('a', [ex('Bent_Over_Barbell_Row', 'upper-back', 4)])], 1, catalog)
  assert.equal(planned[1], 4)
  assert.deepEqual(groupShares('upper-back', ['lats', 'biceps']).slice(0, 4), [0, 1, 0, 0.5])
})

test('entrenador: propone cambiar el ejercicio atascado y lo cambia en la rutina', () => {
  const routines = [routine('a', [ex('Barbell_Bench_Press_-_Medium_Grip', 'pectorals', 5), ex('Barbell_Full_Squat', 'quads', 5)])]
  const tips = coachTips({ routines, sessions: history(), settings, catalog, now: NOW }, 10)
  const swap = tips.find((x) => x.kind === 'swap')
  assert.ok(swap && swap.kind === 'swap', JSON.stringify(tips.map((x) => x.id)))
  assert.equal(swap.exerciseId, 'Barbell_Bench_Press_-_Medium_Grip')
  assert.equal(catalog.get(swap.alt.id)?.muscle, 'pectorals')
  const d = { routines: structuredClone(routines), settings: { ...settings } } as AppData
  applyTip(d, swap)
  assert.equal(d.routines[0].exercises[0].exerciseId, swap.alt.id)
  assert.equal(d.routines[0].exercises[0].sets, 5, 'conserva las series')
})

test('entrenador: grupos sin volumen y «Ahora no» hasta el lunes', () => {
  const routines = [routine('a', [ex('Barbell_Full_Squat', 'quads', 4), ex('Barbell_Bench_Press_-_Medium_Grip', 'pectorals', 2)])]
  const tips = coachTips({ routines, sessions: history(), settings, catalog, now: NOW }, 10)
  const more = tips.find((x) => x.kind === 'moreSets')
  assert.ok(more && more.kind === 'moreSets')
  const add = tips.find((x) => x.kind === 'addExercise')
  assert.ok(add && add.kind === 'addExercise', 'la espalda no la trabaja nada')
  const d = { routines: structuredClone(routines), settings: { ...settings } } as AppData
  applyTip(d, more)
  assert.equal(d.routines[0].exercises[more.index].sets, routines[0].exercises[more.index].sets + 1)
  applyTip(d, add)
  assert.equal(d.routines[0].exercises.at(-1)?.exerciseId, add.exercise.id)
  hideTip(d, add.id, NOW)
  const again = coachTips({ routines, sessions: history(), settings: d.settings, catalog, now: NOW }, 10)
  assert.ok(!again.some((x) => x.id === add.id))
  // La semana siguiente vuelve a salir.
  assert.ok(coachTips({ routines, sessions: history(), settings: d.settings, catalog, now: NOW + 7 * DAY }, 10).some((x) => x.id === add.id))
})

test('entrenador: sin datos suficientes no dice nada', () => {
  assert.deepEqual(coachTips({ routines: [], sessions: history().slice(0, 2), settings, catalog, now: NOW }), [])
})

test('grupos olvidados: los que entrenabas y llevas 10 días sin tocar', () => {
  const sessions = [
    session(0, [exercise('Pullups', [set(0, 8)], { muscle: 'lats' })]),
    session(15, [exercise('Barbell_Full_Squat', [set(100, 5)], { muscle: 'quads' })]),
  ]
  const list = forgottenGroups(sessions, T0 + 16 * DAY)
  assert.deepEqual(list, [{ group: 1, days: 16 }])
})

test('meta de peso: tendencia, previsión y si es demasiado rápida', () => {
  const weighIns = Array.from({ length: 6 }, (_, i) => ({ date: T0 + i * 5 * DAY, weight: 82 - i * 0.4 }))
  const now = T0 + 25 * DAY
  const st = weightGoalStatus({ kg: 76, from: 82, createdAt: T0, by: now + 40 * DAY }, weighIns, now)!
  assert.ok(st.perWeek! < -0.5 && st.perWeek! > -0.6, String(st.perWeek))
  assert.ok(st.eta! > now)
  assert.equal(st.onTrack, false, '4 kg en 6 semanas a 0,56 kg/semana no llega')
  assert.equal(st.tooFast, undefined)
  const rushed = weightGoalStatus({ kg: 70, from: 82, createdAt: T0, by: now + 21 * DAY }, weighIns, now)!
  assert.equal(rushed.tooFast, true)
  const done = weightGoalStatus({ kg: 81, from: 82, createdAt: T0 }, weighIns, now)!
  assert.equal(done.progress, 1)
  assert.ok(done.doneAt)
})

test('entrenador: un grupo que solo recibe trabajo de rebote también recibe propuesta de ejercicio', () => {
  // Mucho press (el tríceps trabaja de rebote) y ningún ejercicio propio de tríceps.
  const routines = [
    routine('a', [ex('Barbell_Bench_Press_-_Medium_Grip', 'pectorals', 3), ex('Bent_Over_Barbell_Row', 'upper-back', 3), ex('Barbell_Curl', 'biceps', 3)]),
    routine('b', [ex('Incline_Dumbbell_Press', 'pectorals', 3), ex('Seated_Cable_Rows', 'upper-back', 3), ex('Hammer_Curls', 'biceps', 3)]),
  ]
  const tips = coachTips({ routines, sessions: history(), settings, catalog, now: NOW }, 20)
  const add = tips.find((x) => x.kind === 'addExercise' && catalog.get(x.exercise.id)?.muscle === 'triceps')
  assert.ok(add && add.kind === 'addExercise', tips.map((x) => x.id).join(', '))
})

test('entrenador: un programa recién creado no recibe consejos de volumen (ni el generado ni los de la biblioteca)', () => {
  const asRoutines = (p: GeneratedProgram) => p.days.map((d, i) => routine(`r${i}`, d.exercises.map((g) => ex(g.exercise.id, g.exercise.muscle, g.sets))))
  // Diez entrenos de antes (de otro programa): el entrenador ya habla, pero este programa aún no se ha usado.
  const before = history().map((s) => ({ ...s, routineId: 'viejo' }))
  const volume = (p: GeneratedProgram, s: Settings) => coachTips({ routines: asRoutines(p), sessions: before, settings: { ...s, weeklyGoal: p.days.length }, catalog, now: NOW }, 20)
    .filter((x) => x.kind === 'moreSets' || x.kind === 'fewerSets' || x.kind === 'addExercise')
  for (const goal of ['hypertrophy', 'fatLoss', 'strength'] as const) {
    for (const equipment of ['gym', 'bodyweight'] as const) {
      const c = { goal, level: 'intermediate' as const, days: 4, minutes: 60, equipment }
      assert.deepEqual(volume(generate(c, catalog), { ...settings, ...c }).map((x) => x.id), [], `${goal}/${equipment}`)
    }
  }
  for (const p of LIBRARY) assert.deepEqual(volume(buildLibraryProgram(p, p.equipment ?? 'gym', catalog, false, 60), settings).map((x) => x.id), [], p.id)
})

test('entrenador: el cardio y los saltos no cuentan como series de fuerza', () => {
  const planned = plannedGroupSets([routine('a', [ex('Mountain_Climbers', 'quads', 3), ex('Freehand_Jump_Squat', 'quads', 3), ex('Barbell_Full_Squat', 'quads', 3)])], 1, catalog)
  assert.equal(planned[5], 3)
})


test('semana cumplida: weekDone y sin «semana más suave» para esta semana', () => {
  const monday = new Date(NOW); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const week = (n: number) => Array.from({ length: n }, (_, i) => ({ start: monday.getTime() + i * 3600000, end: monday.getTime() + i * 3600000 + 60000 }))
  // Si hoy es lunes, lo de hoy no cuenta como semana cumplida (hoy aún se entrena).
  const today = new Date(NOW).getDay() === 1
  assert.equal(weekDone({ sessions: week(3), settings: { weeklyGoal: 3 } }, NOW), !today)
  assert.equal(weekDone({ sessions: week(2), settings: { weeklyGoal: 3 } }, NOW), false)
})
