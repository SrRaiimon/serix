import { useSyncExternalStore } from 'react'
import type { Unit } from './format'
import type { EquipmentProfile, TrainingGoal, TrainingLevel } from './generator'
import { setLang, systemLang, type Lang } from './i18n'
import { trackingOf, type Tracking } from './tracking'

// Los pesos se guardan siempre en kg; la unidad solo afecta a cómo se muestran.

export interface RoutineExercise {
  exerciseId: string
  name: string
  muscle: string
  sets: number
  repsMin: number
  repsMax: number
  rest: number
  /** Sin valor = peso y repeticiones (datos anteriores a los ejercicios por tiempo). */
  tracking?: Tracking
  /** Objetivo por serie en ejercicios por tiempo. */
  targetSeconds?: number
  /** Ejercicios seguidos con el mismo groupId forman una superserie o circuito. */
  groupId?: string
}

export interface Routine {
  id: string
  name: string
  notes: string
  /** Programa al que pertenece; `undefined` = rutina suelta. */
  programName?: string
  order: number
  createdAt: number
  exercises: RoutineExercise[]
}

export interface SetEntry {
  id: string
  weight: number
  reps: number
  done: boolean
  warmup: boolean
  doneAt?: number
  /** Segundos (ejercicios por tiempo o distancia). */
  duration?: number
  /** Kilómetros. */
  distance?: number
  /** Esfuerzo percibido de 6 a 10 (10 = al fallo). */
  rpe?: number
  /** Tipo de serie efectiva; sin valor = normal. El calentamiento va aparte (`warmup`). */
  kind?: SetKind
}

/** drop = bajada de peso justo después de otra serie, amrap = máximas repeticiones, failure = al fallo. */
export type SetKind = 'drop' | 'amrap' | 'failure'

export interface SessionExercise {
  id: string
  exerciseId: string
  name: string
  muscle: string
  rest: number
  /** Objetivo heredado de la rutina (0 = sin objetivo). */
  repsMin: number
  repsMax: number
  tracking?: Tracking
  targetSeconds?: number
  groupId?: string
  /** Sesión de descarga de este ejercicio: no cuenta para sugerir pesos ni para detectar estancamientos. */
  deload?: boolean
  sets: SetEntry[]
}

export interface Session {
  id: string
  name: string
  routineId?: string
  start: number
  /** `undefined` mientras el entrenamiento está en curso. */
  end?: number
  notes: string
  exercises: SessionExercise[]
}

export interface Measurement {
  id: string
  date: number
  weight?: number
  bodyFat?: number
  waist?: number
  chest?: number
  arm?: number
  thigh?: number
}

export interface Settings {
  name: string
  unit: Unit
  defaultRest: number
  weeklyGoal: number
  activeProgram: string
  onboarded: boolean
  goal: TrainingGoal
  level: TrainingLevel
  days: number
  minutes: number
  equipment: EquipmentProfile
  favorites: string[]
  restSound: boolean
  /** Barra con la que se calculan los discos (kg). Sin valor = la olímpica. */
  barKg?: number
  /** Idioma elegido; sin valor = el del sistema. */
  language?: Lang
  /** Preguntar el RPE al marcar cada serie. */
  rpe: boolean
  /** 1 = Exercise Gym GIFs DB (antiguo), 2 = catálogo propio actual. */
  catalogVersion?: number
  /** Fecha de la última copia exportada y hasta cuándo no recordarla. */
  lastBackupAt?: number
  backupSnoozeUntil?: number
}

export interface AppData {
  version: 1
  routines: Routine[]
  sessions: Session[]
  measurements: Measurement[]
  /** Nota fija de cada ejercicio (id del catálogo → texto), p. ej. «asiento en el 4». */
  exerciseNotes: Record<string, string>
  settings: Settings
}

export const defaultSettings: Settings = {
  name: '',
  unit: 'kg',
  defaultRest: 90,
  weeklyGoal: 3,
  activeProgram: '',
  onboarded: false,
  goal: 'hypertrophy',
  level: 'beginner',
  days: 3,
  minutes: 60,
  equipment: 'gym',
  favorites: [],
  restSound: true,
  rpe: true,
}

const emptyData = (): AppData => ({
  version: 1,
  routines: [],
  sessions: [],
  measurements: [],
  exerciseNotes: {},
  settings: { ...defaultSettings },
})

// MARK: IndexedDB (un único registro con todos los datos)

const DB_NAME = 'gymapp'
const STORE = 'kv'
const KEY = 'data'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readData(): Promise<AppData | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(KEY)
    req.onsuccess = () => resolve(req.result as AppData | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function writeData(data: AppData): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(data, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// MARK: Store

let state: AppData = emptyData()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function emit() {
  // El idioma se aplica antes de avisar a la interfaz, para que se pinte ya en el nuevo.
  setLang(state.settings.language ?? systemLang())
  listeners.forEach((l) => l())
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void writeData(state), 250)
}

/** Guarda de inmediato (p. ej. al pasar la app a segundo plano). */
export function flush() {
  clearTimeout(saveTimer)
  void writeData(state)
}

export async function loadData(): Promise<void> {
  const stored = await readData().catch(() => undefined)
  if (stored) state = { ...emptyData(), ...stored, settings: { ...defaultSettings, ...stored.settings } }
  // Pide al navegador que no borre los datos si falta espacio.
  void navigator.storage?.persist?.()
  emit()
}

export function getData(): AppData {
  return state
}

/** Aplica cambios sobre una copia y la publica. */
export function update(recipe: (draft: AppData) => void) {
  const next = structuredClone(state)
  recipe(next)
  state = next
  emit()
  scheduleSave()
}

export function replaceData(data: AppData) {
  state = { ...emptyData(), ...data, settings: { ...defaultSettings, ...data.settings } }
  emit()
  flush()
}

export function resetData() {
  const keepOnboarding = state.settings
  state = emptyData()
  state.settings = { ...keepOnboarding, activeProgram: '', favorites: [] }
  emit()
  flush()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData)
}

/** Máximo de la nota de un ejercicio (también se aplica al importar copias). */
export const MAX_EXERCISE_NOTE = 300

/** Guarda la nota de un ejercicio; vacía (o solo espacios) la borra. */
export function setExerciseNote(exerciseId: string, text: string) {
  update((d) => {
    if (text.trim()) d.exerciseNotes[exerciseId] = text.slice(0, MAX_EXERCISE_NOTE)
    else delete d.exerciseNotes[exerciseId]
  })
}

export function updateSettings(patch: Partial<Settings>) {
  update((d) => {
    Object.assign(d.settings, patch)
  })
}

// MARK: Consultas habituales

export const finishedSessions = (d: AppData) =>
  d.sessions.filter((s) => s.end !== undefined).sort((a, b) => b.start - a.start)

export const activeSession = (d: AppData) => d.sessions.find((s) => s.end === undefined)

export const lastPerformed = (d: AppData, routineId: string) =>
  d.sessions.reduce<number | undefined>((max, s) =>
    s.routineId === routineId && s.end !== undefined && (max === undefined || s.end > max) ? s.end : max, undefined)

export const routineSets = (r: Routine) => r.exercises.reduce((n, e) => n + e.sets, 0)
/** Duración estimada: ~40 s por serie de fuerza, el objetivo en las de tiempo y ~10 min en cardio. */
export const routineMinutes = (r: Routine) =>
  Math.max(5, Math.round(r.exercises.reduce((n, e, i) => {
    const t = trackingOf(e)
    const work = t === 'time' ? (e.targetSeconds ?? 45) : t === 'distance_time' ? 600 : 40
    // En superseries y circuitos solo se descansa tras el último ejercicio de la ronda.
    const rest = e.groupId && r.exercises[i + 1]?.groupId === e.groupId ? 0 : e.rest
    return n + e.sets * (work + rest)
  }, 0) / 60))
