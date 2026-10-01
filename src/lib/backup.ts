import { uid } from './format'
import type { AppData, Measurement, Routine, RoutineExercise, Session, SessionExercise, SetEntry, Settings } from './store'
import { defaultSettings, MAX_EXERCISE_NOTE } from './store'
import { t } from './i18n'

// Validación de copias de seguridad importadas. Solo se aceptan los campos conocidos, con su tipo y
// dentro de rangos razonables; lo demás se descarta. Así un archivo manipulado o de otra app no
// puede meter datos extraños (textos enormes, tipos inesperados) que rompan la app.

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
const MAX_TEXT = 500

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = '', max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : fallback)
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const optNum = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback)
const oneOf = <T extends string>(v: unknown, options: readonly T[]): T | undefined =>
  options.includes(v as T) ? (v as T) : undefined
const list = <T>(v: unknown, parse: (x: unknown) => T | undefined, max = 10000): T[] =>
  Array.isArray(v) ? v.slice(0, max).map(parse).filter((x): x is T => x !== undefined) : []

const TRACKING = ['weight_reps', 'time', 'distance_time'] as const
const SET_KINDS = ['drop', 'amrap', 'failure'] as const
const DAY = 86400000
const EPOCH_MIN = Date.UTC(2000, 0, 1)
const EPOCH_MAX = Date.now() + 365 * DAY

function routineExercise(v: unknown): RoutineExercise | undefined {
  if (!isObj(v) || typeof v.exerciseId !== 'string') return undefined
  return {
    exerciseId: str(v.exerciseId, '', 200), name: str(v.name, 'Ejercicio'), muscle: str(v.muscle, '', 50),
    sets: num(v.sets, 1, 20, 3), repsMin: num(v.repsMin, 1, 100, 8), repsMax: num(v.repsMax, 1, 100, 12), rest: num(v.rest, 0, 900, 90),
    tracking: oneOf(v.tracking, TRACKING), targetSeconds: optNum(v.targetSeconds, 1, 7200),
    groupId: typeof v.groupId === 'string' ? v.groupId.slice(0, 50) : undefined,
  }
}

function routine(v: unknown): Routine | undefined {
  if (!isObj(v)) return undefined
  return {
    id: str(v.id, uid(), 50), name: str(v.name, 'Rutina', 100), notes: str(v.notes),
    programName: typeof v.programName === 'string' ? v.programName.slice(0, 100) : undefined,
    order: num(v.order, 0, 10000, 0), createdAt: num(v.createdAt, EPOCH_MIN, EPOCH_MAX, Date.now()),
    exercises: list(v.exercises, routineExercise, 100),
  }
}

function setEntry(v: unknown): SetEntry | undefined {
  if (!isObj(v)) return undefined
  return {
    id: str(v.id, uid(), 50), weight: num(v.weight, 0, 2000, 0), reps: num(v.reps, 0, 1000, 0),
    done: bool(v.done), warmup: bool(v.warmup), doneAt: optNum(v.doneAt, EPOCH_MIN, EPOCH_MAX),
    duration: optNum(v.duration, 0, 86400), distance: optNum(v.distance, 0, 1000), rpe: optNum(v.rpe, 1, 10),
    kind: oneOf(v.kind, SET_KINDS),
  }
}

function sessionExercise(v: unknown): SessionExercise | undefined {
  if (!isObj(v) || typeof v.exerciseId !== 'string') return undefined
  return {
    id: str(v.id, uid(), 50), exerciseId: str(v.exerciseId, '', 200), name: str(v.name, 'Ejercicio'), muscle: str(v.muscle, '', 50),
    rest: num(v.rest, 0, 900, 90), repsMin: num(v.repsMin, 0, 100, 0), repsMax: num(v.repsMax, 0, 100, 0),
    tracking: oneOf(v.tracking, TRACKING), targetSeconds: optNum(v.targetSeconds, 1, 7200),
    groupId: typeof v.groupId === 'string' ? v.groupId.slice(0, 50) : undefined,
    deload: v.deload === true ? true : undefined,
    sets: list(v.sets, setEntry, 100),
  }
}

function session(v: unknown): Session | undefined {
  if (!isObj(v) || typeof v.start !== 'number') return undefined
  const start = num(v.start, EPOCH_MIN, EPOCH_MAX, Date.now())
  return {
    id: str(v.id, uid(), 50), name: str(v.name, 'Entrenamiento', 100), routineId: typeof v.routineId === 'string' ? v.routineId.slice(0, 50) : undefined,
    start, end: optNum(v.end, start, EPOCH_MAX), notes: str(v.notes, '', 2000), exercises: list(v.exercises, sessionExercise, 100),
  }
}

function measurement(v: unknown): Measurement | undefined {
  if (!isObj(v)) return undefined
  return {
    id: str(v.id, uid(), 50), date: num(v.date, EPOCH_MIN, EPOCH_MAX, Date.now()),
    weight: optNum(v.weight, 1, 500), bodyFat: optNum(v.bodyFat, 1, 80), waist: optNum(v.waist, 1, 300),
    chest: optNum(v.chest, 1, 300), arm: optNum(v.arm, 1, 150), thigh: optNum(v.thigh, 1, 200),
  }
}

function settings(v: unknown): Settings {
  const s = isObj(v) ? v : {}
  const d = defaultSettings
  return {
    name: str(s.name, '', 60), unit: oneOf(s.unit, ['kg', 'lb'] as const) ?? d.unit,
    defaultRest: num(s.defaultRest, 0, 900, d.defaultRest), weeklyGoal: num(s.weeklyGoal, 1, 7, d.weeklyGoal),
    activeProgram: str(s.activeProgram, '', 100), onboarded: true,
    goal: oneOf(s.goal, ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) ?? d.goal,
    level: oneOf(s.level, ['beginner', 'intermediate', 'advanced'] as const) ?? d.level,
    days: num(s.days, 2, 6, d.days), minutes: num(s.minutes, 20, 120, d.minutes),
    equipment: oneOf(s.equipment, ['gym', 'dumbbells', 'kettlebell', 'bands', 'bodyweight'] as const) ?? d.equipment,
    favorites: list(s.favorites, (x) => (typeof x === 'string' ? x.slice(0, 200) : undefined), 2000),
    restSound: bool(s.restSound, d.restSound), rpe: bool(s.rpe, d.rpe),
    barKg: optNum(s.barKg, 1, 50),
    language: oneOf(s.language, ['es', 'en'] as const),
    catalogVersion: optNum(s.catalogVersion, 1, 99),
    lastBackupAt: optNum(s.lastBackupAt, EPOCH_MIN, EPOCH_MAX),
    backupSnoozeUntil: optNum(s.backupSnoozeUntil, EPOCH_MIN, EPOCH_MAX + 365 * DAY),
  }
}

function exerciseNotes(v: unknown): Record<string, string> {
  if (!isObj(v)) return {}
  const notes: Record<string, string> = {}
  for (const [id, text] of Object.entries(v).slice(0, 2000)) {
    if (typeof text === 'string' && text.trim() && id.length <= 200) notes[id] = text.slice(0, MAX_EXERCISE_NOTE)
  }
  return notes
}

/** Convierte el contenido de un archivo en datos válidos, o lanza un error si no es una copia. */
export function parseBackup(text: string): AppData {
  if (text.length > MAX_BACKUP_BYTES) throw new Error(t('El archivo es demasiado grande.', 'The file is too large.'))
  const raw: unknown = JSON.parse(text)
  if (!isObj(raw) || !Array.isArray(raw.sessions) || !Array.isArray(raw.routines)) throw new Error(t('No es una copia de Serix.', 'This is not a Serix backup.'))
  return {
    version: 1,
    routines: list(raw.routines, routine, 1000),
    sessions: list(raw.sessions, session, 20000),
    measurements: list(raw.measurements, measurement, 5000),
    exerciseNotes: exerciseNotes(raw.exerciseNotes),
    settings: settings(raw.settings),
  }
}
