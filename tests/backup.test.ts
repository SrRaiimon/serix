import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_BACKUP_BYTES, parseBackup } from '../src/lib/backup'
import { defaultSettings, type AppData, type Settings } from '../src/lib/store'
import { exercise, session, set } from './helpers'

// Required<Settings>: si se añade un ajuste nuevo, este test no compila hasta incluirlo aquí, y la
// prueba de ida y vuelta comprueba que la copia de seguridad también lo guarda.
const allSettings: Required<Settings> = {
  ...defaultSettings, onboarded: true, name: 'Ana', favorites: ['bench'], barKg: 15,
  catalogVersion: 2, block: { start: Date.UTC(2026, 0, 5), weeks: 5 }, effortRestOff: true, exerciseModes: { Pullups: { assisted: true }, Dumbbell_Lunges: { unilateral: true }, Dumbbell_Bicep_Curl: { perHand: true } }, simpleMode: true, guideHidden: true, guideProgressSeen: true, shareBodyWeight: true, friendShareAt: Date.UTC(2026, 0, 3), friendReminderOff: true, friendReminderSnooze: Date.UTC(2026, 0, 6), language: 'en', theme: 'dark', lockScreenAlert: true, voice: true, plates: { kg: [20, 10, 5, 2.5, 1.25, 0.5], lb: [45, 25, 10, 5, 2.5] }, lastBackupAt: Date.UTC(2026, 0, 2), backupSnoozeUntil: Date.UTC(2026, 0, 9),
  nutrition: { kcal: 2600, protein: 150, carbs: 300, fat: 72, sex: 'f', age: 31, heightCm: 168, weightKg: 62.5, activity: 1.55, aim: 'gain', proteinOnly: true, adjust: -150 },
  nutritionCarryOver: false, nutritionTrainingSplit: false, nutritionAdviceAt: Date.UTC(2026, 0, 4), foodReminders: true, recapSeen: Date.UTC(2026, 0, 5), trainingDays: [0, 2, 4], nutritionBurned: true, trainingTime: '07:30', lastPhotoAt: Date.UTC(2026, 0, 2), photoSnooze: Date.UTC(2026, 0, 8), weighSnooze: Date.UTC(2026, 0, 7), seenVersion: '0.0.58', textScale: 1.12, dayRoutines: { 0: 'r1' }, supplements: ['Creatina'], fasting: { hours: 16, start: Date.UTC(2026, 0, 4, 21) }, meals: ['breakfast', 'brunch', 'lunch', 'dinner'], mealNames: { brunch: 'Almuerzo del curro' }, easyWeek: Date.UTC(2026, 0, 5), coachHidden: { week: Date.UTC(2026, 0, 5), ids: ['swap:bench'] }, weightGoal: { kg: 75, from: 80, createdAt: Date.UTC(2026, 0, 1), by: Date.UTC(2026, 5, 1) }, liftGoals: [{ id: 'g1', exerciseId: 'bench', name: 'Press de banca', kg: 100, from: 90, createdAt: Date.UTC(2026, 0, 1), by: Date.UTC(2026, 5, 1) }],
}

const sample = (): AppData => ({
  version: 1,
  routines: [{
    id: 'r1', name: 'Pecho', notes: 'nota', order: 0, createdAt: Date.UTC(2026, 0, 1),
    exercises: [{ exerciseId: 'bench', name: 'Press', muscle: 'chest', sets: 3, repsMin: 8, repsMax: 12, rest: 90, groupId: 'g', progression: 'wave531', trainingMax: 100, tmSince: Date.UTC(2026, 0, 1) }],
  }],
  sessions: [session(0, [exercise('bench', [
    set(80, 8, { doneAt: Date.UTC(2026, 0, 5, 10, 5), rpe: 8 }),
    set(60, 8, { kind: 'drop' }), set(80, 6, { kind: 'failure' }), set(80, 9, { kind: 'amrap' }),
  ], { deload: true, auto: { kind: 'wave', week: 4, tm: 100 }, pain: 5, painNote: 'Hombro derecho', assisted: true, unilateral: true, bodyweight: 80 }), exercise('row', [set(30, 10, { side: 'L', note: 'Agarre ancho' }), set(30, 10, { side: 'R' })])], { readiness: { sleep: 2, energy: 3, soreness: 4 }, wod: { key: 'b1:Barbell_Thruster+Pullups', format: 'forTime', minutes: 15, rounds: 3, seconds: 412, benchmark: 1 } })],
  measurements: [{ id: 'm1', date: Date.UTC(2026, 0, 1), weight: 80, waist: 85, neck: 38, hip: 95 }],
  exerciseNotes: { bench: 'Asiento en el 4\nagarre ancho' },
  friends: [{ name: 'Ana', at: Date.UTC(2026, 0, 4), week: { sessions: 3, volume: 12000, sets: 45, minutes: 180 }, month: { sessions: 3, volume: 12000, sets: 45, minutes: 180 }, streak: 5, total: 40, lifts: { bench: 90, squat: 120 },
    weeks: [[1, 3000], [3, 12000]], muscles: [12, 10, 8, 4, 4, 9, 3, 3, 6], prs: [{ exerciseId: 'bench', name: 'Press', weight: 90, reps: 3, at: Date.UTC(2026, 0, 3) }], bodyWeight: 78.5,
    challenges: [{ challenge: { id: 'abc123', metric: 'sets', group: 0, target: 60, start: Date.UTC(2026, 0, 1), end: Date.UTC(2026, 0, 31), by: 'Ana' }, value: 20 }] }],
  customExercises: [{ id: 'custom-a1b2c3', name: 'Press máquina azul', muscle: 'pectorals', secondaryMuscles: ['triceps'], equipment: 'machine', tracking: 'weight_reps', notes: 'Asiento en el 4', createdAt: Date.UTC(2026, 0, 2) }],
  nutrition: {
    entries: [{ id: 'e1', day: '2026-01-05', meal: 'breakfast', name: 'Copos de avena', grams: 40, per100: { kcal: 367, p: 13.3, c: 57.9, f: 6.5 }, ref: { kind: 'basic', id: 'oats' }, at: Date.UTC(2026, 0, 5, 8) }],
    foods: [{ id: 'f1', name: 'Crema de cacao', brand: 'Marca', barcode: '3017620422003', per100: { kcal: 539, p: 6.3, c: 57.5, f: 30.9 }, portion: { label: '15 g', g: 15 }, source: 'off' }],
    meals: [{ id: 'm1', name: 'Desayuno de siempre', items: [{ name: 'Leche', grams: 250, per100: { kcal: 47, p: 3.4, c: 4.8, f: 1.6 }, ref: { kind: 'basic', id: 'milk-semi' } }] }],
  },
  challenges: [{ id: 'rep999', metric: 'reps', exerciseId: 'Pullups', exerciseName: 'Dominadas', start: Date.UTC(2026, 0, 1), end: Date.UTC(2026, 0, 15), by: 'Yo' }],
  settings: { ...allSettings },
})

/** Sin las claves con valor undefined, que JSON no guarda. */
const plain = (v: unknown) => JSON.parse(JSON.stringify(v))

test('una copia exportada se importa igual', () => {
  const data = sample()
  const parsed = parseBackup(JSON.stringify(data))
  assert.deepEqual(plain(parsed), plain(data))
})

test('no es una copia', () => {
  assert.throws(() => parseBackup('[]'), /No es una copia/)
  assert.throws(() => parseBackup('{"routines": []}'), /No es una copia/)
  assert.throws(() => parseBackup('no es json'))
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)), /demasiado grande/)
})

test('valores fuera de rango, tipos raros y campos desconocidos', () => {
  const raw = plain(sample())
  const s = raw.sessions[0].exercises[0].sets[0]
  Object.assign(s, { weight: 99999, reps: -3, rpe: 42, kind: 'superserie', hack: '<script>' })
  raw.sessions[0].exercises[0].deload = 'sí'
  raw.routines[0].name = 'x'.repeat(5000)
  raw.settings.unit = 'stone'
  raw.settings.weeklyGoal = 50
  raw.sessions.push({ start: 'ayer' }, null, 7)
  raw.exerciseNotes = { bench: 'n'.repeat(1000), squat: 42, deadlift: '   ' }
  const parsed = parseBackup(JSON.stringify(raw))
  const p = parsed.sessions[0].exercises[0]
  assert.equal(p.sets[0].weight, 2000)
  assert.equal(p.sets[0].reps, 0)
  assert.equal(p.sets[0].rpe, undefined)
  assert.equal(p.sets[0].kind, undefined)
  assert.equal('hack' in p.sets[0], false)
  assert.equal(p.deload, undefined)
  assert.equal(parsed.routines[0].name.length, 100)
  assert.equal(parsed.settings.unit, 'kg')
  assert.equal(parsed.settings.weeklyGoal, 7)
  assert.equal(parsed.sessions.length, 1)
  assert.deepEqual(Object.keys(parsed.exerciseNotes), ['bench'])
  assert.equal(parsed.exerciseNotes.bench.length, 300)
})

test('copias antiguas sin los campos nuevos', () => {
  const raw = plain(sample())
  for (const e of raw.sessions[0].exercises) {
    delete e.deload
    for (const s of e.sets) delete s.kind
  }
  delete raw.measurements
  delete raw.exerciseNotes
  const parsed = parseBackup(JSON.stringify(raw))
  assert.deepEqual(parsed.exerciseNotes, {})
  assert.equal(parsed.sessions[0].exercises[0].sets.length, 4)
  assert.deepEqual(parsed.measurements, [])
})

test('el modo sencillo desactivado a mano se conserva en la copia', () => {
  const data = sample()
  data.settings.simpleMode = false
  assert.equal(parseBackup(JSON.stringify(data)).settings.simpleMode, false)
})
