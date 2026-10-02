import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_BACKUP_BYTES, parseBackup } from '../src/lib/backup'
import { defaultSettings, type AppData, type Settings } from '../src/lib/store'
import { exercise, session, set } from './helpers'

// Required<Settings>: si se añade un ajuste nuevo, este test no compila hasta incluirlo aquí, y la
// prueba de ida y vuelta comprueba que la copia de seguridad también lo guarda.
const allSettings: Required<Settings> = {
  ...defaultSettings, onboarded: true, name: 'Ana', favorites: ['bench'], barKg: 15,
  catalogVersion: 2, block: { start: Date.UTC(2026, 0, 5), weeks: 5 }, effortRestOff: true, guideHidden: true, guideProgressSeen: true, shareBodyWeight: true, friendShareAt: Date.UTC(2026, 0, 3), friendReminderOff: true, friendReminderSnooze: Date.UTC(2026, 0, 6), language: 'en', theme: 'dark', lockScreenAlert: true, voice: true, plates: { kg: [20, 10, 5, 2.5, 1.25, 0.5], lb: [45, 25, 10, 5, 2.5] }, lastBackupAt: Date.UTC(2026, 0, 2), backupSnoozeUntil: Date.UTC(2026, 0, 9),
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
  ], { deload: true, auto: { kind: 'wave', week: 4, tm: 100 } })])],
  measurements: [{ id: 'm1', date: Date.UTC(2026, 0, 1), weight: 80, waist: 85 }],
  exerciseNotes: { bench: 'Asiento en el 4\nagarre ancho' },
  friends: [{ name: 'Ana', at: Date.UTC(2026, 0, 4), week: { sessions: 3, volume: 12000, sets: 45, minutes: 180 }, month: { sessions: 3, volume: 12000, sets: 45, minutes: 180 }, streak: 5, total: 40, lifts: { bench: 90, squat: 120 },
    weeks: [[1, 3000], [3, 12000]], muscles: [12, 10, 8, 4, 4, 9, 3, 3, 6], prs: [{ exerciseId: 'bench', name: 'Press', weight: 90, reps: 3, at: Date.UTC(2026, 0, 3) }], bodyWeight: 78.5,
    challenges: [{ challenge: { id: 'abc123', metric: 'sets', group: 0, target: 60, start: Date.UTC(2026, 0, 1), end: Date.UTC(2026, 0, 31), by: 'Ana' }, value: 20 }] }],
  customExercises: [{ id: 'custom-a1b2c3', name: 'Press máquina azul', muscle: 'pectorals', secondaryMuscles: ['triceps'], equipment: 'machine', tracking: 'weight_reps', notes: 'Asiento en el 4', createdAt: Date.UTC(2026, 0, 2) }],
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
