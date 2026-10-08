import { produce, setAutoFreeze } from 'immer'
import { useSyncExternalStore } from 'react'
import { setWeightSteps, type Unit } from './format'
import { availablePlates, stepFor } from './plates'
import type { EquipmentProfile, TrainingGoal, TrainingLevel } from './generator'
import { setLang, systemLang, type Lang } from './i18n'
import { applyTextScale, applyTheme, type Theme } from './theme'
import type { LiftGoal } from './goals'
import type { TrainingBlock } from './block'
import type { CustomExercise } from './customExercises'
import type { Challenge, FriendSnapshot } from './friends'
import { emptyNutrition, setMealSettings, type MealKey, type NutritionData, type NutritionGoals } from './nutrition'

// Immer no congela los datos: congelar decenas de miles de series al arrancar cuesta y la app no lo
// necesita (los datos solo se cambian con update).
setAutoFreeze(false)
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
  /** Progresión automática del peso (ver lib/progression.ts); sin valor = manual. */
  progression?: Progression
  /** 5/3/1: máximo de entrenamiento (kg) y desde cuándo cuenta (para saber la semana del ciclo). */
  trainingMax?: number
  tmSince?: number
  /** Por porcentaje: parte de tu máximo estimado (0,8 = 80 %) con la que se calcula el peso. */
  percent?: number
}

export type Progression = 'double' | 'linear' | 'wave531' | 'percent'

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
  /** Ejercicios a una mano o una pierna: lado izquierdo o derecho. */
  side?: 'L' | 'R'
  /** Nota de esta serie («molestia en el hombro», «agarre ancho»). */
  note?: string
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
  /** Lo que hizo la progresión automática al preparar el ejercicio (para explicarlo en pantalla). */
  auto?: AutoProgress
  /** Máquina asistida: el peso apuntado es la ayuda (resta), así que no cuenta como peso levantado. */
  assisted?: boolean
  /** A una mano o una pierna: cada serie se apunta por lado (izquierdo y derecho). */
  unilateral?: boolean
  /** Dominadas y fondos: peso corporal (kg) ese día; las estadísticas lo suman al lastre (ver bodyweight.ts). */
  bodyweight?: number
  /** Molestia o dolor durante el ejercicio (1-10) y dónde; se avisa la próxima vez. */
  pain?: number
  painNote?: string
  sets: SetEntry[]
}

export type AutoProgress =
  | { kind: 'up'; from: number; to: number; mode: 'double' | 'linear' }
  | { kind: 'hold'; mode: 'double' | 'linear' }
  | { kind: 'wave'; week: number; tm: number }
  | { kind: 'percent'; pct: number; max: number }

export interface Session {
  id: string
  name: string
  routineId?: string
  start: number
  /** `undefined` mientras el entrenamiento está en curso. */
  end?: number
  notes: string
  exercises: SessionExercise[]
  /** Cómo llegabas (1-5): sueño, energía y agujetas (5 = muchas). Ver lib/readiness.ts. */
  readiness?: { sleep: number; energy: number; soreness: number }
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
  /** Cuello y cadera (cm): para estimar la grasa corporal (lib/bodyfat.ts). */
  neck?: number
  hip?: number
}

export interface Settings {
  name: string
  unit: Unit
  defaultRest: number
  weeklyGoal: number
  /** Días de entreno: sumar las calorías estimadas de cada entreno en vez de una cantidad fija. */
  nutritionBurned?: boolean
  /** Lunes (ms) de la semana en la que se cerró el resumen de la semana anterior. */
  recapSeen?: number
  /** Comidas del día activas (por defecto las 4 de siempre) y nombres propios. */
  meals?: MealKey[]
  mealNames?: Partial<Record<MealKey, string>>
  /** Metas de fuerza (lib/goals.ts). */
  liftGoals?: LiftGoal[]
  /** Última versión cuyas novedades se vieron (components/News.tsx). */
  seenVersion?: string
  /** Tamaño de la letra: 1 normal, 1.12 grande, 1.25 muy grande. */
  textScale?: number
  /** Fecha de la última foto de progreso (para recordar la siguiente). */
  lastPhotoAt?: number
  /** Hasta cuándo no se recuerda hacer fotos o pesarse («Ahora no»). */
  photoSnooze?: number
  weighSnooze?: number
  /** Rutina de cada día de entreno (0 = lunes … 6 = domingo → id de rutina); sin valor, van rotando. */
  dayRoutines?: Record<number, string>
  /** Hora habitual de entrenar («18:00»), para el calendario. */
  trainingTime?: string
  /** Días fijos de entreno (0 = lunes … 6 = domingo); sin valor, solo cuenta cuántos a la semana. */
  trainingDays?: number[]
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
  /** Discos que hay en el gimnasio, por unidad. Sin valor = los habituales. */
  plates?: Partial<Record<Unit, number[]>>
  /** Idioma elegido; sin valor = el del sistema. */
  language?: Lang
  /** Tema elegido; sin valor = el del sistema. */
  theme?: Theme
  /** Avisos por voz (descanso y temporizadores). */
  voice?: boolean
  /** Aviso del descanso con la pantalla bloqueada (Android; necesita permiso de notificaciones). */
  lockScreenAlert?: boolean
  /** Incluir el peso corporal en el resumen para amigos (fuerza relativa). */
  shareBodyWeight?: boolean
  /** Última vez que compartiste tu resumen, y el recordatorio de los domingos. */
  friendShareAt?: number
  friendReminderOff?: boolean
  friendReminderSnooze?: number
  /** Cómo se hace cada ejercicio (por identificador): asistido o por lados. Se recuerda para la próxima vez. */
  exerciseModes?: Record<string, ExerciseMode>
  /** Modo sencillo: oculta RPE, tipos de serie y opciones avanzadas. */
  simpleMode?: boolean
  /** Bloque de entrenamiento en curso (semanas de carga y descarga programada). */
  block?: TrainingBlock
  /** Guía de primeros pasos en Inicio: oculta, y si ya visitó Progreso. */
  guideHidden?: boolean
  guideProgressSeen?: boolean
  /** No ajustar el descanso según el RPE de la serie (por defecto sí se ajusta). */
  effortRestOff?: boolean
  /** Preguntar el RPE al marcar cada serie. */
  rpe: boolean
  /** 1 = Exercise Gym GIFs DB (antiguo), 2 = catálogo propio actual. */
  catalogVersion?: number
  /** Fecha de la última copia exportada y hasta cuándo no recordarla. */
  lastBackupAt?: number
  backupSnoozeUntil?: number
  /** Objetivo diario de calorías y macronutrientes (Comidas). */
  nutrition?: NutritionGoals
  /** Restar al día siguiente lo que te pasas de calorías (por defecto sí; false = no). */
  nutritionCarryOver?: boolean
  /** Más calorías los días de entreno y menos los de descanso (por defecto sí; false = no). */
  nutritionTrainingSplit?: boolean
  /** Última vez que se aplicó o se descartó el ajuste según el peso (no se vuelve a proponer en 14 días). */
  nutritionAdviceAt?: number
  /** Recordar apuntar las comidas que no se han apuntado pasada su hora. */
  foodReminders?: boolean
}

export interface ExerciseMode {
  assisted?: boolean
  unilateral?: boolean
}

export interface AppData {
  version: 1
  routines: Routine[]
  sessions: Session[]
  measurements: Measurement[]
  /** Nota fija de cada ejercicio (id del catálogo → texto), p. ej. «asiento en el 4». */
  exerciseNotes: Record<string, string>
  /** Resúmenes que han compartido los amigos (retos). */
  friends: FriendSnapshot[]
  /** Retos con amigos en los que participas (creados o aceptados). */
  challenges: Challenge[]
  /** Ejercicios creados por ti (se suman al catálogo). */
  customExercises: CustomExercise[]
  /** Comidas: lo apuntado cada día, tus alimentos y tus comidas guardadas. */
  nutrition: NutritionData
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
  friends: [],
  challenges: [],
  customExercises: [],
  nutrition: emptyNutrition(),
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
/** Cambia con cada modificación de los datos (para saber si un «deshacer» sigue siendo válido). */
let version = 0
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function emit() {
  version++
  // El idioma se aplica antes de avisar a la interfaz, para que se pinte ya en el nuevo.
  setLang(state.settings.language ?? systemLang())
  applyTheme(state.settings.theme)
  applyTextScale(state.settings.textScale)
  setMealSettings(state.settings.mealNames, state.settings.meals)
  // Los redondeos de peso de toda la app usan el salto de los discos disponibles.
  setWeightSteps({
    kg: stepFor(availablePlates('kg', state.settings.plates)),
    lb: stepFor(availablePlates('lb', state.settings.plates)),
  })
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
  if (stored) state = { ...emptyData(), ...stored, nutrition: { ...emptyNutrition(), ...stored.nutrition }, settings: { ...defaultSettings, ...stored.settings } }
  // Pide al navegador que no borre los datos si falta espacio.
  void navigator.storage?.persist?.()
  emit()
}

export function getData(): AppData {
  return state
}

/** Aplica cambios sobre una copia y la publica. */
/**
 * Cambia los datos. Con Immer solo se copia lo que la receta toca y el resto se comparte con la
 * versión anterior (que queda intacta para «deshacer»): copiar todo con cada serie marcada costaba
 * decenas de milisegundos con años de historial en un móvil modesto.
 */
export function update(recipe: (draft: AppData) => void) {
  const next = produce(state, (draft) => {
    recipe(draft)
  })
  if (next === state) return
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

/** Preguntar el RPE: activado y sin el modo sencillo. */
export const rpeOn = (s: Settings) => s.rpe && !s.simpleMode

export const finishedSessions = (d: AppData) =>
  d.sessions.filter((s) => s.end !== undefined).sort((a, b) => b.start - a.start)

export const activeSession = (d: AppData) => d.sessions.find((s) => s.end === undefined)

export const lastPerformed = (d: AppData, routineId: string) =>
  d.sessions.reduce<number | undefined>((max, s) =>
    s.routineId === routineId && s.end !== undefined && (max === undefined || s.end > max) ? s.end : max, undefined)

export const routineSets = (r: Routine) => r.exercises.reduce((n, e) => n + e.sets, 0)
/** Duración estimada: ~40 s por serie de fuerza, el objetivo en las de tiempo, ~10 min en cardio y la preparación. */
export const routineMinutes = (r: Routine) =>
  Math.max(5, Math.round(r.exercises.reduce((n, e, i) => {
    const t = trackingOf(e)
    const work = t === 'time' ? (e.targetSeconds ?? 45) : t === 'distance_time' ? 600 : 40
    // En superseries y circuitos solo se descansa tras el último ejercicio de la ronda.
    const rest = e.groupId && r.exercises[i + 1]?.groupId === e.groupId ? 0 : e.rest
    // Más ~90 s por ejercicio para prepararlo (cargar discos, ajustar la máquina, calentar).
    return n + e.sets * (work + rest) + 90
  }, 0) / 60))

/**
 * Duración esperada de una rutina: la mediana de las últimas veces que se hizo (sin las que se
 * dejaron abiertas horas) y, si aún no hay, la estimación por series.
 */
export function expectedMinutes(d: AppData, r: Routine): { minutes: number; measured: boolean } {
  const past = d.sessions
    .filter((s) => s.routineId === r.id && s.end !== undefined && s.end - s.start < 3 * 3600000 && s.end - s.start > 5 * 60000)
    .sort((a, b) => b.start - a.start).slice(0, 5)
    .map((s) => (s.end! - s.start) / 60000).sort((a, b) => a - b)
  if (!past.length) return { minutes: routineMinutes(r), measured: false }
  const mid = past.length >> 1
  return { minutes: Math.round(past.length % 2 ? past[mid] : (past[mid - 1] + past[mid]) / 2), measured: true }
}

// MARK: Deshacer

/** Segundos que se ofrece deshacer un borrado. */
export const UNDO_SECONDS = 6

export interface UndoOffer {
  label: string
  previous: AppData
  /** Versión de los datos justo después del borrado: si cambia, ya no se puede deshacer. */
  version: number
  at: number
}

let undoOffer: UndoOffer | undefined
const undoListeners = new Set<() => void>()
const emitUndo = () => undoListeners.forEach((l) => l())

/**
 * Hace un cambio destructivo ofreciendo deshacerlo unos segundos. Deshacer devuelve los datos a como
 * estaban justo antes, así que solo se permite mientras no haya habido ningún otro cambio.
 */
export function withUndo(label: string, change: () => void) {
  const previous = state
  change()
  if (state === previous) return
  undoOffer = { label, previous, version, at: Date.now() }
  emitUndo()
}

/** El «deshacer» pendiente, si sigue siendo válido (el aviso lo retira pasados UNDO_SECONDS). */
export const currentUndo = (): UndoOffer | undefined =>
  undoOffer && undoOffer.version === version ? undoOffer : undefined

export function undo(): boolean {
  const offer = currentUndo()
  undoOffer = undefined
  emitUndo()
  if (!offer) return false
  state = offer.previous
  emit()
  flush()
  return true
}

export function dismissUndo() {
  undoOffer = undefined
  emitUndo()
}

function subscribeUndo(listener: () => void) {
  undoListeners.add(listener)
  listeners.add(listener)
  return () => {
    undoListeners.delete(listener)
    listeners.delete(listener)
  }
}

export function useUndo(): UndoOffer | undefined {
  return useSyncExternalStore(subscribeUndo, currentUndo)
}
