import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deflateRawSync } from 'node:zlib'
import { fakeIndexedDB } from './helpers'
import { Catalog, emptyFilter, type RawExercise } from '../src/lib/catalog'
import { cleanCustomExercise } from '../src/lib/customExercises'
import { defaultTracking } from '../src/lib/tracking'
import { CATALOG_VERSION, migrateCatalog } from '../src/lib/migrate'
import { decodePlan, encodePlan, extractCode } from '../src/lib/share'
import { defaultSettings, getData, replaceData, setExerciseNote } from '../src/lib/store'
import { exercise, session, set } from './helpers'

fakeIndexedDB()

const ex = (id: string, name: string, muscle = 'chest', category = 'strength'): RawExercise =>
  ({ id, name, nameEn: name, muscle, bodyPart: 'chest', equipment: 'barbell', category, level: 'beginner', secondaryMuscles: [], instructions: [] })

const catalog = new Catalog(
  [ex('Barbell_Bench_Press', 'Press de banca', 'chest'), ex('Plank', 'Plancha', 'abdominals', 'stretching')],
  { old_bench: 'Barbell_Bench_Press', old_gone: 'No_Existe' },
)

test('migración del catálogo antiguo', () => {
  replaceData({
    version: 1,
    routines: [{ id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [
      { exerciseId: 'old_bench', name: 'Bench press (viejo)', muscle: 'pectorals', sets: 3, repsMin: 8, repsMax: 12, rest: 90 },
      { exerciseId: 'old_gone', name: 'Sin equivalencia', muscle: 'x', sets: 3, repsMin: 8, repsMax: 12, rest: 90 },
    ] }],
    sessions: [session(0, [exercise('old_bench', [set(80, 8)], { name: 'Nombre del historial', muscle: 'pectorals' })])],
    measurements: [],
    exerciseNotes: { old_bench: 'Banco en el 3', old_gone: 'Se queda' }, friends: [], challenges: [], customExercises: [], nutrition: { entries: [], foods: [], meals: [] },
    settings: { ...defaultSettings, favorites: ['old_bench', 'Barbell_Bench_Press', 'old_gone'] },
  })
  migrateCatalog(catalog)
  const d = getData()
  const [bench, gone] = d.routines[0].exercises
  assert.equal(bench.exerciseId, 'Barbell_Bench_Press')
  assert.equal(bench.name, 'Press de banca')
  assert.equal(bench.muscle, 'chest')
  // Sin equivalencia: se queda tal cual, sin perder nada.
  assert.equal(gone.exerciseId, 'old_gone')
  assert.equal(gone.name, 'Sin equivalencia')
  // En el historial cambia el id (para estadísticas) pero se respeta el nombre.
  const done = d.sessions[0].exercises[0]
  assert.equal(done.exerciseId, 'Barbell_Bench_Press')
  assert.equal(done.name, 'Nombre del historial')
  assert.equal(done.sets[0].weight, 80)
  assert.deepEqual(d.settings.favorites, ['Barbell_Bench_Press', 'old_gone'])
  assert.deepEqual(d.exerciseNotes, { Barbell_Bench_Press: 'Banco en el 3', old_gone: 'Se queda' })
  assert.equal(d.settings.catalogVersion, CATALOG_VERSION)
})

test('la migración solo se hace una vez', () => {
  const before = getData()
  migrateCatalog(catalog)
  assert.equal(getData(), before)
})

const routine = {
  id: 'r', name: 'Pierna y core', notes: '', order: 0, createdAt: 0, exercises: [
    { exerciseId: 'Barbell_Bench_Press', name: '', muscle: '', sets: 4, repsMin: 6, repsMax: 8, rest: 120, groupId: 'g' },
    { exerciseId: 'Plank', name: '', muscle: '', sets: 3, repsMin: 1, repsMax: 1, rest: 60, tracking: 'time' as const, targetSeconds: 45, groupId: 'g' },
    { exerciseId: 'No_Existe', name: '', muscle: '', sets: 3, repsMin: 8, repsMax: 12, rest: 90 },
  ],
}

test('compartir rutina: ida y vuelta', async () => {
  const code = await encodePlan([routine], 'Mi programa')
  const plan = await decodePlan(code, catalog)
  assert.equal(plan.programName, 'Mi programa')
  assert.equal(plan.skipped, 1)
  const [a, b] = plan.routines[0].exercises
  assert.equal(plan.routines[0].name, 'Pierna y core')
  assert.equal(a.name, 'Press de banca')
  assert.deepEqual([a.sets, a.repsMin, a.repsMax, a.rest], [4, 6, 8, 120])
  assert.equal(b.tracking, 'time')
  assert.equal(b.targetSeconds, 45)
  assert.ok(a.groupId && a.groupId === b.groupId)
})

// Enlaces ya enviados a otras personas: tienen que seguir abriéndose en versiones futuras.
const OLD_LINKS = {
  compressed: 'zJcxBC4IwHIbxryLv-T1sZVI7Cl3D-xjD5E-ObMomZYjfPaTz8-NZ8YbRRIKxKyIMmiAptsW36MYkIBYYa1G36S7D4GuJXe-bJDmDJSueqQ-K-Eh49LNPMmVQUTtaNEMbn-CRmpqVIubwErA8_fNt9Ncl5Fl2sm94Uc5tbvsB',
  plain: 'jeyJ2IjoxLCJyIjpbeyJuIjoiUGllcm5hIHkgY29yZSIsIngiOltbIkJhcmJlbGxfQmVuY2hfUHJlc3MiLDQsNiw4LDEyMCwid2VpZ2h0X3JlcHMiLDAsMV0sWyJQbGFuayIsMywxLDEsNjAsInRpbWUiLDQ1LDFdLFsiTm9fRXhpc3RlIiwzLDgsMTIsOTBdXX1dfQ',
}

test('los enlaces ya compartidos siguen funcionando', async () => {
  for (const code of Object.values(OLD_LINKS)) {
    const plan = await decodePlan(code, catalog)
    assert.equal(plan.routines[0].name, 'Pierna y core')
    assert.equal(plan.routines[0].exercises.length, 2)
  }
})

test('un enlace manipulado no mete objetos ni valores raros en las rutinas', async () => {
  const forge = (payload: unknown) => 'j' + Buffer.from(JSON.stringify(payload)).toString('base64url')
  const plan = await decodePlan(forge({ v: 1, p: { a: 1 }, r: [{ n: 'x'.repeat(500), x: [['Barbell_Bench_Press', 3, 8, 12, 90, 'zzz', 0, 0]] }] }), catalog)
  // El nombre del programa tiene que ser texto; el de la rutina, acotado; el seguimiento, uno de los tres.
  assert.equal(plan.programName, undefined)
  assert.equal(plan.routines[0].name.length, 80)
  assert.equal(plan.routines[0].exercises[0].tracking, 'weight_reps')
  const named = await decodePlan(forge({ v: 1, p: 'P'.repeat(200), r: [] }), catalog)
  assert.equal(named.programName?.length, 80)
})

test('un enlace manipulado: topes de rutinas y ejercicios, repeticiones al revés y bombas de compresión', async () => {
  const forge = (payload: unknown) => 'j' + Buffer.from(JSON.stringify(payload)).toString('base64url')
  const ex = ['Barbell_Bench_Press', 3, 20, 5, 90, 'weight_reps', 0, 0]
  const many = await decodePlan(forge({ v: 1, r: Array.from({ length: 80 }, () => ({ n: 'R', x: Array.from({ length: 150 }, () => ex) })) }), catalog)
  assert.equal(many.routines.length, 50)
  assert.equal(many.routines[0].exercises.length, 100)
  // repsMin 20 y repsMax 5 → 5-20, no un rango imposible.
  assert.deepEqual([many.routines[0].exercises[0].repsMin, many.routines[0].exercises[0].repsMax], [5, 20])
  // Una carga que se descomprime a más del tope se corta (ceros comprimidos: unos pocos bytes → 3 MB).
  const bomb = 'z' + deflateRawSync(Buffer.alloc(3_000_000, 0x20)).toString('base64url')
  await assert.rejects(decodePlan(bomb, catalog), /demasiado grandes/)
  // Y no se confunde con un enlace dañado.
  await assert.rejects(decodePlan(bomb, catalog), (e: Error) => !/incompleto/.test(e.message))
})

test('enlaces dañados o ajenos dan un mensaje claro', async () => {
  await assert.rejects(decodePlan('zAAAA', catalog), /incompleto o dañado/)
  await assert.rejects(decodePlan('x123', catalog), /no es de una rutina/)
  assert.equal(extractCode('https://srraiimon.github.io/serix/#/import/zAbc_-1'), 'zAbc_-1')
  assert.equal(extractCode('hola'), undefined)
})

test('notas de ejercicio: se guardan recortadas y vacías se borran', () => {
  setExerciseNote('Plank', 'x'.repeat(400))
  assert.equal(getData().exerciseNotes.Plank.length, 300)
  setExerciseNote('Plank', '  ')
  assert.equal('Plank' in getData().exerciseNotes, false)
})

// MARK: Ejercicios propios

const mine = { id: 'custom-a1b2c3', name: 'Press pecho máquina azul', muscle: 'pectorals', secondaryMuscles: ['triceps'], equipment: 'machine', tracking: 'weight_reps' as const, notes: 'Asiento en el 4\nAgarre neutro', createdAt: 1 }

test('los ejercicios propios se suman al catálogo', () => {
  const withMine = new Catalog([ex('Plank', 'Plancha')], {}, [mine, { ...mine, id: 'custom-cardio1', name: 'Remo de mi gimnasio', muscle: 'cardio', tracking: 'distance_time' }])
  const e = withMine.get('custom-a1b2c3')!
  assert.equal(e.custom, true)
  assert.equal(e.bodyPart, 'chest')
  assert.deepEqual(e.instructions, ['Asiento en el 4', 'Agarre neutro'])
  assert.equal(defaultTracking(withMine.get('custom-cardio1')), 'distance_time')
  assert.deepEqual(withMine.filter({ ...emptyFilter, query: 'azul' }, []).map((x) => x.id), ['custom-a1b2c3'])
})

test('una rutina compartida lleva sus ejercicios propios', async () => {
  const r = { ...routine, exercises: [{ exerciseId: mine.id, name: mine.name, muscle: mine.muscle, sets: 3, repsMin: 8, repsMax: 12, rest: 90 }, routine.exercises[0]] }
  const plan = await decodePlan(await encodePlan([r], undefined, [mine, { ...mine, id: 'custom-otro01' }]), catalog)
  assert.equal(plan.skipped, 0)
  assert.equal(plan.routines[0].exercises[0].name, 'Press pecho máquina azul')
  assert.deepEqual(plan.customExercises.map((c) => c.id), [mine.id]) // solo el que usa la rutina
  // Si ya lo tienes, no se vuelve a crear.
  const known = new Catalog([ex('Barbell_Bench_Press', 'Press de banca')], {}, [mine])
  assert.deepEqual((await decodePlan(await encodePlan([r], undefined, [mine]), known)).customExercises, [])
})

test('ejercicios propios manipulados se descartan o se corrigen', () => {
  assert.equal(cleanCustomExercise({ ...mine, id: 'Barbell_Squat' }), undefined) // no puede pisar el catálogo
  assert.equal(cleanCustomExercise({ ...mine, name: '   ' }), undefined)
  assert.equal(cleanCustomExercise({ ...mine, muscle: 'hack' }), undefined)
  const fixed = cleanCustomExercise({ ...mine, name: 'x'.repeat(200), equipment: 'cohete', tracking: 'otro', secondaryMuscles: ['pectorals', 'triceps', 'falso'] })!
  assert.equal(fixed.name.length, 60)
  assert.equal(fixed.equipment, 'other')
  assert.equal(fixed.tracking, 'weight_reps')
  assert.deepEqual(fixed.secondaryMuscles, ['triceps'])
})
