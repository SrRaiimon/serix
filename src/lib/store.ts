import { produce, setAutoFreeze } from 'immer'
import { useSyncExternalStore } from 'react'
import { setWeightSteps, type Unit } from './format'
import { availablePlates, stepFor } from './plates'
import type { EquipmentProfile, TrainingGoal, TrainingLevel } from './generator'
import { setLang, systemLang, type Lang } from './i18n'
import { applyTextScale, applyTheme, type Theme } from './theme'
import type { LiftGoal, WeightGoal } from './goals'
import type { WodRecord } from './wod'
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
  /** Tempo de cada repetición en segundos: bajar-pausa-subir(-pausa arriba), p. ej. «3-1-1». */
  tempo?: string
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
  /** Peso de cada mancuerna (el peso movido cuenta las dos; marcas y 1RM, por mancuerna). */
  perHand?: boolean
  /** Tempo heredado de la rutina («3-1-1»). */
  tempo?: string
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
  /** reason 'rpe': se completó, pero al límite (RPE 9,5-10), así que aún no se sube. */
  | { kind: 'hold'; mode: 'double' | 'linear'; reason?: 'rpe' }
  /** Tres sesiones seguidas sin completar el objetivo (lineal): se baja un 10 % para volver a subir. */
  | { kind: 'down'; from: number; to: number; mode: 'linear' }
  /** `reset`: este ciclo empieza con el TM un 10 % más bajo (algún AMRAP no llegó al mínimo). */
  | { kind: 'wave'; week: number; tm: number; reset?: true }
  | { kind: 'percent'; pct: number; max: number }
  /** Sin peso (flexiones, dominadas sin lastre…): ya llegas al máximo del rango; una repetición más por serie y,
   *  pasado el tope (máximo + 5), mejor una variante más difícil o añadir lastre. */
  | { kind: 'reps'; from: number; to: number; harder?: true }

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
  /** Resultado si fue un WOD (ver lib/wod.ts). */
  wod?: WodRecord
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
  /** Suplementos que tomas (para marcarlos cada día en Comidas). */
  supplements?: string[]
  /** Ayuno intermitente: horas de ayuno y, si estás ayunando, desde cuándo. */
  fasting?: { hours: number; start?: number }
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
  /** Semana suave propuesta por el entrenador (lunes de esa semana, ver lib/coach.ts). */
  easyWeek?: number
  /** Tiene barra de dominadas aunque no entrene en gimnasio (el generador propone dominadas). */
  pullupBar?: boolean
  /** Consejos del entrenador ocultos esta semana («Ahora no»). */
  coachHidden?: { week: number; ids: string[] }
  /** Meta de peso corporal con fecha opcional (ver lib/goals.ts). */
  weightGoal?: WeightGoal
}

export interface ExerciseMode {
  assisted?: boolean
  unilateral?: boolean
  /** Mancuernas o pesas rusas: el peso apuntado es el de cada una (el peso movido cuenta las dos). */
  perHand?: boolean
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

// Una sola conexión para toda la sesión (abrir una por escritura era lento); si el navegador la
// cierra, se vuelve a abrir en la siguiente.
let dbPromise: Promise<IDBDatabase> | undefined

function openDB(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => {
      const db = req.result
      db.onclose = () => { dbPromise = undefined }
      db.onversionchange = () => { db.close(); dbPromise = undefined }
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  }).catch((e: unknown) => { dbPromise = undefined; throw e })
  return dbPromise
}

/** Olvida la conexión abierta (para los tests, que cambian el IndexedDB de prueba). */
export function forgetDB() {
  dbPromise = undefined
}

const REV = 'rev'

/** Los datos guardados y su número de revisión (sube con cada escritura, de cualquier pestaña). */
async function readData(): Promise<{ data: unknown; rev: number }> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const os = db.transaction(STORE).objectStore(STORE)
    const req = os.get(KEY)
    const revReq = os.get(REV)
    revReq.onsuccess = () => resolve({ data: req.result, rev: typeof revReq.result === 'number' ? revReq.result : 0 })
    req.onerror = () => reject(req.error)
    revReq.onerror = () => reject(revReq.error)
  })
}

/** Revisión de los datos que esta pestaña leyó o escribió por última vez, y esos datos. */
let knownRev = 0
let base: AppData | undefined

/**
 * Escribe los datos si nadie más lo ha hecho desde la última lectura o escritura de esta pestaña. Si otra
 * pestaña guardó entretanto, junta las dos versiones (`mergeData`) en la misma transacción y devuelve
 * el resultado para que la interfaz lo muestre.
 */
async function writeData(data: AppData): Promise<AppData | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const os = tx.objectStore(STORE)
    let written = data
    let merged: AppData | undefined
    let next = knownRev
    let tooNew = false
    const revReq = os.get(REV)
    revReq.onsuccess = () => {
      const rev = typeof revReq.result === 'number' ? revReq.result : 0
      const put = (d: AppData) => { written = d; next = rev + 1; os.put(d, KEY); os.put(next, REV) }
      if (rev === knownRev) return put(data)
      const theirsReq = os.get(KEY)
      theirsReq.onsuccess = () => {
        const theirs = theirsReq.result === undefined ? undefined : migrateData(theirsReq.result)
        // Otra pestaña con una versión más nueva de la app ha guardado: no se escribe encima en el formato viejo.
        if (theirs === 'newer') { tooNew = true; tx.abort(); return }
        merged = theirs ? mergeData(theirs, data, base) : data
        put(merged)
      }
    }
    tx.oncomplete = () => { knownRev = next; base = written; resolve(merged) }
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tooNew ? new NewerData() : tx.error ?? new Error('abort'))
  })
}

class NewerData extends Error {}

type Keyed = { id?: string; name?: string }
// Sin id (amigos), por el nombre igual que friendKey (friends.ts): sin tildes, mayúsculas ni espacios de
// más; «José» y «jose » son la misma persona en la interfaz y al juntar pestañas.
const keyOf = (x: Keyed) => x.id ?? x.name?.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ?? ''

/**
 * Igual de contenido. Lo leído de IndexedDB son copias (nunca el mismo objeto que hay en memoria), así que
 * comparar con === diría siempre «cambiado». Solo se usa al juntar pestañas, que es raro.
 */
const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

/** Un valor a tres bandas: si aquí sigue como estaba, vale el de la otra pestaña; si aquí cambió, el de aquí. */
const pick3 = <T,>(theirs: T, ours: T, common: T | undefined, known: boolean): T => (known && same(ours, common) ? theirs : ours)

/**
 * Junta dos listas a tres bandas con la versión común de la que salieron:
 * - en las dos: si aquí no se tocó, la de allí (que quizá sí cambió); si no, la de aquí;
 * - solo aquí: se queda, salvo que allí se borrara y aquí siga como estaba;
 * - solo allí: se queda, salvo que aquí se borrara y allí siga como estaba.
 */
function mergeList<T extends Keyed>(theirs: T[], ours: T[], common: T[] | undefined): T[] {
  const before = new Map((common ?? []).map((x) => [keyOf(x), x]))
  const there = new Map(theirs.map((x) => [keyOf(x), x]))
  const here = new Set(ours.map(keyOf))
  const out: T[] = []
  // Cada clave una sola vez, aunque una lista ya la traiga repetida (dos «José» de antes de comparar sin
  // tildes): si no, cada vez que se juntan pestañas se arrastra el duplicado. Se queda el último, que es el más
  // reciente (lo nuevo se añade al final), en el sitio del primero. Lo que no tiene clave se deja.
  const at = new Map<string, number>()
  const add = (k: string, x: T) => {
    const i = k ? at.get(k) : undefined
    if (i !== undefined) { out[i] = x; return }
    if (k) at.set(k, out.length)
    out.push(x)
  }
  for (const o of ours) {
    const k = keyOf(o)
    const t = there.get(k)
    const b = before.get(k)
    if (t !== undefined) add(k, pick3(t, o, b, b !== undefined))
    else if (!(b !== undefined && same(o, b))) add(k, o)
  }
  for (const t of theirs) {
    const k = keyOf(t)
    if (here.has(k)) continue
    const b = before.get(k)
    if (!(b !== undefined && same(t, b))) add(k, t)
  }
  return out
}

const withoutLists = ({ entries: _e, foods: _f, meals: _m, ...rest }: NutritionData) => rest

/** Un objeto clave a clave (ajustes, notas…), a tres bandas. */
function mergeRecord<T extends object>(theirs: T, ours: T, common: T | undefined): T {
  const out: Record<string, unknown> = {}
  const t = theirs as Record<string, unknown>, o = ours as Record<string, unknown>, c = common as Record<string, unknown> | undefined
  for (const k of new Set([...Object.keys(o), ...Object.keys(t)])) {
    const v = c ? pick3(t[k], o[k], c[k], true) : o[k] ?? t[k]
    if (v !== undefined) out[k] = v
  }
  return out as T
}

/**
 * Datos de otra pestaña + los de esta, con `common` como la versión de partida de esta pestaña. Las listas
 * se juntan elemento a elemento y los ajustes y notas clave a clave: gana lo que cambió cada lado y, si
 * los dos cambiaron lo mismo, esta pestaña (la que está guardando). Sin `common`, se suman las listas.
 */
export function mergeData(theirs: AppData, ours: AppData, common?: AppData): AppData {
  const list = <T extends Keyed>(f: (d: AppData) => T[]) => mergeList(f(theirs), f(ours), common && f(common))
  return {
    ...ours,
    routines: list((d) => d.routines),
    sessions: list((d) => d.sessions),
    measurements: list((d) => d.measurements),
    friends: list((d) => d.friends),
    challenges: list((d) => d.challenges),
    customExercises: list((d) => d.customExercises),
    exerciseNotes: mergeRecord(theirs.exerciseNotes, ours.exerciseNotes, common?.exerciseNotes),
    settings: mergeRecord(theirs.settings, ours.settings, common?.settings),
    nutrition: {
      // Sin las listas (se juntan aparte): compararlas enteras con JSON serían megas con años de comidas.
      ...mergeRecord(withoutLists(theirs.nutrition), withoutLists(ours.nutrition), common && withoutLists(common.nutrition)),
      entries: list((d) => d.nutrition.entries),
      foods: list((d) => d.nutrition.foods),
      meals: list((d) => d.nutrition.meals),
    },
  }
}

// MARK: Estado del guardado

/**
 * Problemas con el almacenamiento, para avisar en pantalla:
 * - readError: no se pudieron leer los datos al abrir. No se escribe nada (si no, se guardaría la app
 *   vacía encima del historial de verdad) hasta recargar.
 * - newer: los datos son de una versión más nueva de la app (p. ej. tras volver a una anterior): no se
 *   tocan para no perder lo que esa versión guardó.
 * - writeError: falló un guardado (por ejemplo, sin espacio). Se reintenta en el siguiente cambio.
 */
export type StorageProblem = { kind: 'readError' | 'newer' | 'writeError'; detail?: string }
let problem: StorageProblem | undefined
const problemListeners = new Set<() => void>()
const setProblem = (p: StorageProblem | undefined) => {
  if (problem?.kind === p?.kind && problem?.detail === p?.detail) return
  problem = p
  problemListeners.forEach((l) => l())
}
export const storageProblem = () => problem
export function useStorageProblem(): StorageProblem | undefined {
  return useSyncExternalStore((l) => { problemListeners.add(l); return () => problemListeners.delete(l) }, storageProblem)
}

/** Si se puede escribir: no tras un fallo de lectura ni con datos de una versión más nueva. */
const writable = () => problem?.kind !== 'readError' && problem?.kind !== 'newer'

// MARK: Varias pestañas

// Con la app abierta en dos pestañas (o la instalada y el navegador): tras cada guardado se avisa a las
// demás, que releen los datos si no tienen cambios propios pendientes. Si los tienen, al guardar verán
// que la revisión cambió y juntarán las dos versiones (writeData).
const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('serix-data')
// En Node (tests) el canal abierto no deja terminar el proceso.
;(channel as { unref?: () => void } | undefined)?.unref?.()
/** Hay cambios en memoria aún sin escribir. */
let dirty = false

/** Vuelve a leer lo guardado (otra pestaña escribió, o la app vuelve a primer plano), si no hay cambios propios. */
export async function refreshFromDisk(): Promise<void> {
  if (dirty || !writable()) return
  try {
    const { data, rev } = await readData()
    if (rev === knownRev || dirty) return
    const migrated = data === undefined ? undefined : migrateData(data)
    if (!migrated || migrated === 'newer') return
    knownRev = rev
    base = migrated
    state = migrated
    emit()
  } catch {
    // Sin poder leer, se sigue con lo que hay: al guardar, la revisión dirá si hay que juntar.
  }
}
channel?.addEventListener('message', () => void refreshFromDisk())

async function save(data: AppData): Promise<void> {
  if (!writable()) return
  dirty = false
  try {
    const merged = await writeData(data)
    if (merged) {
      // Otra pestaña había guardado: se muestra lo junto (y lo cambiado aquí mientras tanto, encima).
      state = state === data ? merged : mergeData(merged, state, data)
      // Si aquí cambió algo mientras se guardaba, se vuelve a guardar (si no, quedaría solo en memoria).
      if (state !== merged) scheduleSave()
      emit()
    }
    channel?.postMessage('saved')
    if (problem?.kind === 'writeError') setProblem(undefined)
  } catch (e) {
    dirty = true
    if (e instanceof NewerData) setProblem({ kind: 'newer' })
    else setProblem({ kind: 'writeError', detail: e instanceof Error ? e.name : String(e) })
  }
}

/** Versión de los datos que entiende esta app. Para cambiar su forma, súbela y añade su paso en MIGRATIONS. */
export const DATA_VERSION = 1
/** MIGRATIONS[n] pasa los datos de la versión n a la n + 1 (aún no hace falta ninguna). */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => void> = {}

/** Aplica en orden las migraciones pendientes (a una copia). También para las copias de seguridad antiguas. */
export function runMigrations(stored: Record<string, unknown>): Record<string, unknown> {
  const d = { ...stored }
  for (let v = typeof d.version === 'number' ? d.version : 1; v < DATA_VERSION; v++) MIGRATIONS[v]?.(d)
  return d
}

/** Datos guardados → datos de esta versión: migraciones en orden y lo mínimo para que la forma sea válida. */
export function migrateData(stored: unknown): AppData | 'newer' | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined
  if (typeof (stored as { version?: unknown }).version === 'number' && (stored as { version: number }).version > DATA_VERSION) return 'newer'
  const d = runMigrations(stored as Record<string, unknown>)
  const empty = emptyData()
  const list = <T,>(x: unknown, fallback: T[]): T[] => (Array.isArray(x) ? x.filter((e) => typeof e === 'object' && e !== null) as T[] : fallback)
  const obj = <T,>(x: unknown, fallback: T): T => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as T : fallback)
  const nutrition = obj<Partial<NutritionData>>(d.nutrition, {})
  return {
    ...empty, ...(d as Partial<AppData>), version: DATA_VERSION,
    routines: list(d.routines, empty.routines), sessions: list(d.sessions, empty.sessions), measurements: list(d.measurements, empty.measurements),
    friends: list(d.friends, empty.friends), challenges: list(d.challenges, empty.challenges), customExercises: list(d.customExercises, empty.customExercises),
    exerciseNotes: obj(d.exerciseNotes, empty.exerciseNotes),
    nutrition: { ...empty.nutrition, ...nutrition, entries: list(nutrition.entries, []), foods: list(nutrition.foods, []), meals: list(nutrition.meals, []) },
    settings: { ...defaultSettings, ...obj<Partial<Settings>>(d.settings, {}) },
  }
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
  dirty = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void save(state), 250)
}

/** Guarda de inmediato; se puede esperar a que termine. */
export function flush(): Promise<void> {
  clearTimeout(saveTimer)
  return save(state)
}

/** Guarda solo si hay cambios sin escribir (al pasar a segundo plano: sin cambios no se escribe una copia vieja). */
export function flushPending(): Promise<void> {
  return dirty ? flush() : Promise.resolve()
}

export async function loadData(): Promise<void> {
  // Si la lectura falla (el navegador a veces tarda en dar acceso al abrir), se reintenta; si sigue
  // fallando no se escribe nada, para no guardar la app vacía encima de los datos de verdad.
  let stored: unknown
  for (let attempt = 0; ; attempt++) {
    try {
      const read = await readData()
      stored = read.data
      knownRev = read.rev
      break
    } catch (e) {
      if (attempt >= 2) {
        setProblem({ kind: 'readError', detail: e instanceof Error ? e.name : String(e) })
        emit()
        return
      }
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
    }
  }
  const migrated = stored === undefined ? undefined : migrateData(stored)
  if (migrated === 'newer') setProblem({ kind: 'newer' })
  else if (migrated) state = base = migrated
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

/** Sustituye todos los datos; la promesa se cumple cuando ya están guardados. */
export function replaceData(data: AppData): Promise<void> {
  // Restaurar una copia es una decisión expresa: vuelve a permitir guardar.
  setProblem(undefined)
  state = { ...emptyData(), ...data, settings: { ...defaultSettings, ...data.settings } }
  emit()
  return flush()
}

export function resetData(): Promise<void> {
  const keepOnboarding = state.settings
  state = emptyData()
  state.settings = { ...keepOnboarding, activeProgram: '', favorites: [] }
  emit()
  return flush()
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
/**
 * Duración estimada: ~45 s por serie de fuerza, el objetivo en las de tiempo, ~10 min en cardio y la
 * preparación. Ajustada con entrenos reales (salía corta: un programa de 16 series marcaba ~49 min y se
 * hacía en más de una hora).
 */
export const routineMinutes = (r: Routine) =>
  Math.max(5, Math.round(r.exercises.reduce((n, e, i) => {
    const t = trackingOf(e)
    const work = t === 'time' ? (e.targetSeconds ?? 45) : t === 'distance_time' ? 600 : 45
    // En superseries y circuitos solo se descansa tras el último ejercicio de la ronda.
    const rest = e.groupId && r.exercises[i + 1]?.groupId === e.groupId ? 0 : e.rest
    // Más ~2,5 min por ejercicio para prepararlo (cargar discos, ajustar la máquina, series de calentamiento).
    return n + e.sets * (work + rest) + 150
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
  void flush()
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
