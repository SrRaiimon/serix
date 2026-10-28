import './browser-stubs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, emptyFilter, type RawExercise } from '../src/lib/catalog'
import { FIGURES } from '../src/lib/figures'
import { equipmentInfo, generate } from '../src/lib/generator'
import { matchExercise } from '../src/lib/importCsv'
import { EQUIPMENT_KEYS, MUSCLE_KEYS } from '../src/lib/labels'
import { parseBackup } from '../src/lib/backup'
import { defaultTracking } from '../src/lib/tracking'
import { exercise, session, set } from './helpers'

type Extra = RawExercise & { reference?: { catalogue: string; id: string } }
const raw = JSON.parse(readFileSync('public/exercises_es.json', 'utf8')).exercises as RawExercise[]
const index = JSON.parse(readFileSync('public/exercises_index.json', 'utf8')).exercises as RawExercise[]
const extra = JSON.parse(readFileSync('scripts/catalog/extra_exercises.json', 'utf8')) as { exercises: Extra[]; equipmentOverrides: Record<string, string> }
const added = extra.exercises.filter((e) => e.reference?.catalogue === 'openGym')
const catalog = new Catalog(raw)

test('ampliación: 145 ejercicios distintos, pasos propios en ambos idiomas y figuras disponibles', () => {
  assert.equal(added.length, 145)
  assert.equal(raw.length, 1081)
  assert.equal(new Set(raw.map((e) => e.id)).size, raw.length)
  for (const e of added) {
    const loaded = catalog.get(e.id)!
    assert.ok(loaded, e.id)
    assert.ok(FIGURES[e.id], `${e.id}: figura`)
    assert.ok(EQUIPMENT_KEYS.includes(e.equipment), `${e.id}: material`)
    assert.ok(MUSCLE_KEYS.includes(e.muscle) && e.secondaryMuscles.every((m) => MUSCLE_KEYS.includes(m)), `${e.id}: músculos`)
    assert.equal(e.category, 'strength')
    assert.ok(e.instructions && e.instructions.length >= 4 && e.instructions.length <= 6, `${e.id}: pasos`)
    assert.equal(e.instructions.length, e.instructionsEn?.length)
    assert.ok(e.instructions.every((s) => s.trim().length > 15))
    assert.ok(!/https?:|gymvisual|<img|<video/i.test(JSON.stringify(loaded)), `${e.id}: recurso externo`)
    assert.equal(raw.filter((r) => r.name.toLocaleLowerCase() === e.name.toLocaleLowerCase()).length, 1, e.name)
    assert.equal(raw.filter((r) => r.nameEn.toLowerCase() === e.nameEn.toLowerCase()).length, 1, e.nameEn)
  }
})

test('ampliación: índice y catálogo completo conservan los mismos ids, material y registro', () => {
  assert.deepEqual(index, raw.map(({ instructions: _es, instructionsEn: _en, ...e }) => e))
  for (const [id, equipment] of Object.entries(extra.equipmentOverrides)) assert.equal(catalog.get(id)?.equipment, equipment, id)
  assert.equal(catalog.get('Smith_Machine_Squat')?.equipment, 'smith')
  assert.equal(catalog.get('Landmine_180s')?.equipment, 'landmine')
  assert.equal(catalog.get('Trap_Bar_Deadlift')?.equipment, 'trap-bar')
  assert.equal(defaultTracking(catalog.get('Suspension_Trainer_Front_Plank')), 'time')
  assert.equal(defaultTracking(catalog.get('Trap_Bar_Farmers_Carry')), 'time')
})

test('material: buscar nombres habituales y filtrar por músculo conserva solo el material elegido', () => {
  for (const [query, equipment] of [['TRX', 'suspension'], ['suspensión', 'suspension'], ['multipower', 'smith'], ['landmine', 'landmine'], ['barra hexagonal', 'trap-bar']]) {
    const list = catalog.filter({ ...emptyFilter, query, equipment }, [])
    assert.ok(list.length >= 4, query)
    assert.ok(list.every((e) => e.equipment === equipment), query)
    const muscle = list[0].muscle
    const filtered = catalog.filter({ ...emptyFilter, query, equipment, muscle }, [])
    assert.ok(filtered.length && filtered.every((e) => e.muscle === muscle && e.equipment === equipment))
  }
})

test('generador: el gimnasio admite los cuatro materiales y suspensión no presupone máquinas en casa', () => {
  for (const e of ['suspension', 'smith', 'landmine', 'trap-bar']) assert.ok(equipmentInfo('gym').allowed.includes(e))
  assert.deepEqual(equipmentInfo('suspension').allowed, ['suspension', 'bodyweight'])
  assert.ok(!equipmentInfo('bodyweight').allowed.includes('suspension'))
  for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
    const p = generate({ goal: 'general', level, days: 3, minutes: 45, equipment: 'suspension' }, catalog)
    assert.ok(p.days.flatMap((d) => d.exercises).some((x) => x.exercise.equipment === 'suspension'))
    assert.ok(p.days.every((d) => d.exercises.length >= 3))
    assert.ok(p.days.flatMap((d) => d.exercises).every((x) => ['suspension', 'bodyweight'].includes(x.exercise.equipment) || /^(Towel_Door_Row|Backpack_)/.test(x.exercise.id)))
  }
})

test('CSV: el material explícito distingue multipower, barra hexagonal, landmine y TRX', () => {
  for (const [name, equipment] of [
    ['Hip Thrust (Smith Machine)', 'smith'], ['Bent Over Row (Trap Bar)', 'trap-bar'],
    ['Shoulder Press (Landmine)', 'landmine'], ['Row (TRX)', 'suspension'], ['Row (Suspension)', 'suspension'],
  ]) assert.equal(matchExercise(name, catalog)?.equipment, equipment, name)
  assert.equal(matchExercise('Squat (Smith Machine)', catalog)?.id, 'Smith_Machine_Squat')
  assert.equal(matchExercise('Deadlift (Trap Bar)', catalog)?.id, 'Trap_Bar_Deadlift')
})

test('copias: conservan perfil, ejercicios nuevos y material de ejercicios propios sin cambiar la versión', () => {
  const gear = ['suspension', 'smith', 'landmine', 'trap-bar']
  const customExercises = gear.map((equipment, i) => ({ id: `custom-new${i}`, name: `Ejercicio ${i}`, muscle: 'quads', secondaryMuscles: [], equipment, tracking: 'weight_reps', createdAt: Date.now() }))
  const saved = session(0, [exercise('Suspension_Leg_Curl', [set(0, 10)])])
  const restored = parseBackup(JSON.stringify({ version: 1, routines: [], sessions: [saved], settings: { equipment: 'suspension' }, customExercises }))
  assert.equal(restored.version, 1)
  assert.equal(restored.settings.equipment, 'suspension')
  assert.deepEqual(restored.customExercises.map((e) => e.equipment), gear)
  assert.equal(restored.sessions[0].exercises[0].exerciseId, 'Suspension_Leg_Curl')
})


test('nombres ingleses: siglas y guiones coherentes sin cambiar los ids nuevos', () => {
  for (const [id, name] of [
    ['Smith_Jm_Bench_Press', 'Smith JM Press'],
    ['Landmine_Single_Leg_Landmine_Rdl', 'Landmine Single-Leg RDL'],
    ['Trap_Bar_Split_Stance_Rdl', 'Trap Bar Split-Stance RDL'],
    ['Landmine_Half_Kneeling_Shoulders_Press', 'Half-Kneeling Landmine Press'],
    ['Suspender_Face_Pull', 'Suspension Face Pull'],
    ['Band_Lunges', 'Band Lunge'],
    ['Dumbbell_Cossack_Squats', 'Dumbbell Cossack Squat'],
    ['Smith_Step_Up', 'Smith Step-Up'],
    ['Cable_Y_Raise', 'Cable Y-Raise'],
  ]) assert.equal(catalog.get(id)?.nameEn, name, id)
  for (const e of added) assert.doesNotMatch(e.nameEn, /Suspender|\bRdl\b|\bJm\b|Single Leg|Half Kneeling|Step Up|Y Raise|\bLunges\b|\bSquats\b/, e.id)
})
