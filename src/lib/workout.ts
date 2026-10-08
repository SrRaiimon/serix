import { useSyncExternalStore } from 'react'
import type { Exercise } from './catalog'
import { fromKg, increment, toKg, uid, type Unit } from './format'
import { lastSets, workingSets } from './stats'
import { BODYWEIGHT_LIFTS, bodyweightAt } from './bodyweight'
import { normalizeGroups } from './groups'
import { defaultTracking, trackingOf, type Tracking } from './tracking'
import { activeSession, finishedSessions, getData, lastPerformed, update, type AppData, type Routine, type Session, type SessionExercise, type Progression, type SetEntry, type SetKind, withUndo } from './store'
import { resetRestView } from './timer'
import { t } from './i18n'
import { plan } from './progression'
import { blockWeek } from './block'

// Estado de interfaz del entrenamiento: si la pantalla está abierta y qué resumen mostrar.

interface WorkoutUI {
  open: boolean
  summaryId?: string
}

let ui: WorkoutUI = { open: false }
const listeners = new Set<() => void>()

function setUI(next: WorkoutUI) {
  ui = next
  listeners.forEach((l) => l())
}

export function useWorkoutUI(): WorkoutUI {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => ui,
  )
}

export const openWorkout = () => setUI({ ...ui, open: true })
export const minimizeWorkout = () => setUI({ ...ui, open: false })
export const closeSummary = () => setUI({ ...ui, summaryId: undefined })

interface PlannedExercise {
  exerciseId: string
  name: string
  muscle: string
  rest: number
  repsMin: number
  repsMax: number
  sets: number
  tracking?: Tracking
  targetSeconds?: number
  groupId?: string
  progression?: Progression
  trainingMax?: number
  tmSince?: number
}

/**
 * Series por lados: cada serie pendiente se convierte en una del lado izquierdo y otra del derecho
 * (seguidas, con el mismo peso y repeticiones), en su sitio. Las hechas y las de calentamiento no.
 */
export function toSides(sets: SetEntry[]): SetEntry[] {
  if (sets.some((s) => !s.done && s.side)) return sets
  return sets.flatMap((s) => s.warmup || s.done ? [s] : [{ ...s, side: 'L' as const }, { ...s, id: uid(), side: 'R' as const }])
}

/** Quita los lados: se queda con el izquierdo (o la serie sin lado) de cada pareja pendiente. */
export function fromSides(sets: SetEntry[]): SetEntry[] {
  return sets.filter((s) => s.done || s.side !== 'R').map((s) => (s.done ? s : { ...s, side: undefined }))
}

/** Izquierda y derecha alternas (las series de calentamiento, sin lado, solo una vez). */
function interleave(left: SetEntry[], right: SetEntry[]): SetEntry[] {
  const r = right.filter((x) => !x.warmup)
  let i = 0
  return left.flatMap((l) => (l.warmup ? [l] : [{ ...l, side: 'L' as const }, { ...(r[i++] ?? l), id: uid(), side: 'R' as const }]))
}

function sessionExercise(ex: PlannedExercise, history: Session[], unit: Unit = getData().settings.unit): SessionExercise {
  const mode = getData().settings.exerciseModes?.[ex.exerciseId] ?? {}
  // Por lados: la última vez se apuntó cada serie dos veces; para copiarla basta un lado.
  const lastAll = lastSets(ex.exerciseId, history)
  const last = mode.unilateral ? lastAll.filter((s) => s.side !== 'R') : lastAll
  const count = Math.max(ex.sets, 1)
  // Con progresión automática las series se calculan; si no, se copian de la última vez. En las
  // máquinas asistidas no: progresar es quitar ayuda, y eso se decide a mano.
  const auto = trackingOf(ex) === 'weight_reps' && !mode.assisted ? plan(ex, last, history, unit) : undefined
  const sets = auto?.sets ?? prefillSets(count, last)
  const bodyweight = BODYWEIGHT_LIFTS.has(ex.exerciseId) ? bodyweightAt(getData(), Date.now()) : undefined
  return {
    ...(mode.assisted ? { assisted: true } : {}),
    ...(mode.unilateral ? { unilateral: true } : {}),
    id: uid(),
    exerciseId: ex.exerciseId,
    name: ex.name,
    muscle: ex.muscle,
    rest: ex.rest,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    tracking: ex.tracking,
    targetSeconds: ex.targetSeconds,
    groupId: ex.groupId,
    // Se rellenan con lo que se hizo la última vez para marcar y listo. Por lados, cada lado copia lo
    // suyo (sin progresión automática; con ella, los dos lados con el peso calculado).
    sets: !mode.unilateral ? sets
      : auto || !lastAll.some((x) => x.side === 'R') ? toSides(sets.map(({ side: _side, ...x }) => x))
        : interleave(prefillSets(count, last), prefillSets(count, lastAll.filter((x) => x.side === 'R'))),
    ...(auto?.auto ? { auto: auto.auto } : {}),
    ...(auto?.deload ? { deload: true } : {}),
    ...(bodyweight !== undefined ? { bodyweight } : {}),
  }
}

/**
 * Series nuevas copiando la última vez: cada serie con su tipo y, detrás, los drop sets que la
 * siguieron (solo en las series que ya existían; las de más se añaden normales).
 */
export function prefillSets(count: number, last: SetEntry[]): SetEntry[] {
  const chunks: SetEntry[][] = []
  for (const set of last) {
    if (set.kind === 'drop' && chunks.length) chunks[chunks.length - 1].push(set)
    else chunks.push([set])
  }
  const copy = (prev: SetEntry | undefined, kind?: SetKind): SetEntry => ({
    id: uid(), weight: prev?.weight ?? 0, reps: prev?.reps ?? 0, done: false, warmup: false,
    ...(prev?.duration ? { duration: prev.duration } : {}),
    ...(prev?.distance ? { distance: prev.distance } : {}),
    ...(kind ? { kind } : {}),
  })
  const sets: SetEntry[] = []
  for (let i = 0; i < count; i++) {
    const chunk = chunks[Math.min(i, chunks.length - 1)]
    if (!chunk) {
      sets.push(copy(undefined))
      continue
    }
    const [main, ...drops] = chunk
    // Una serie suelta que fue drop set (sin otra delante) se copia como normal.
    sets.push(copy(main, main.kind === 'drop' ? undefined : main.kind))
    if (i < chunks.length) for (const d of drops) sets.push(copy(d, 'drop'))
  }
  return sets
}

/**
 * Sesión de descarga del ejercicio: de las series pendientes quedan ~60 % (al menos una) con un
 * 10 % menos de peso, sin drop sets ni series al fallo. Las ya hechas no se tocan.
 */
export function applyDeload(e: SessionExercise, unit: Unit): void {
  const step = increment(unit)
  const round = (kg: number) => toKg(Math.round(fromKg(kg, unit) / step) * step, unit)
  const pending = e.sets.filter((s) => !s.done && !s.warmup && s.kind !== 'drop')
  const keep = new Set(pending.slice(0, Math.max(1, Math.round(pending.length * 0.6))).map((s) => s.id))
  e.sets = e.sets.filter((s) => s.done || s.warmup || keep.has(s.id))
  for (const s of e.sets) {
    if (!keep.has(s.id)) continue
    if (s.weight > 0) s.weight = round(s.weight * 0.9)
    delete s.kind
  }
  e.deload = true
}

/** Siguiente rutina del programa activo: la que va después de la última realizada. */
export function nextRoutine(d: AppData): Routine | undefined {
  const sorted = [...d.routines].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
  const program = sorted.filter((r) => d.settings.activeProgram && r.programName === d.settings.activeProgram)
  const pool = (program.length ? program : sorted).filter((r) => r.exercises.length)
  if (!pool.length) return undefined
  let lastIndex = -1
  let lastTime = 0
  pool.forEach((r, i) => {
    const at = lastPerformed(d, r.id)
    if (at && at > lastTime) {
      lastTime = at
      lastIndex = i
    }
  })
  return pool[(lastIndex + 1) % pool.length]
}

/** En la semana de descarga del bloque, los ejercicios de peso empiezan ya con la descarga. */
function blockDeload(d: AppData, e: SessionExercise): SessionExercise {
  if (blockWeek(d.settings.block)?.deload && trackingOf(e) === 'weight_reps' && e.auto?.kind !== 'wave' && !e.deload) applyDeload(e, d.settings.unit)
  return e
}

/** Lo que propondrá cada ejercicio al empezar la rutina (los mismos cálculos), para enseñarlo antes. */
export function previewRoutine(routine: Routine, d: AppData): SessionExercise[] {
  const history = finishedSessions(d)
  return routine.exercises.map((e) => blockDeload(d, sessionExercise(e, history, d.settings.unit)))
}

export function startRoutine(routine: Routine) {
  if (activeSession(getData())) return openWorkout()
  update((d) => {
    const history = finishedSessions(d)
    d.sessions.push({
      id: uid(),
      name: routine.name,
      routineId: routine.id,
      start: Date.now(),
      notes: '',
      exercises: routine.exercises.map((e) => blockDeload(d, sessionExercise(e, history))),
    })
  })
  openWorkout()
}

/**
 * Empieza un entrenamiento igual que uno del historial: mismos ejercicios, número de series y
 * superseries, con los pesos de la última vez (como al empezar una rutina).
 */
export function repeatSession(past: Session) {
  if (activeSession(getData())) return openWorkout()
  update((d) => {
    const history = finishedSessions(d)
    d.sessions.push({
      id: uid(),
      name: past.name,
      ...(past.routineId && d.routines.some((r) => r.id === past.routineId) ? { routineId: past.routineId } : {}),
      start: Date.now(),
      notes: '',
      exercises: past.exercises.map((e) => blockDeload(d, sessionExercise({
        exerciseId: e.exerciseId, name: e.name, muscle: e.muscle, rest: e.rest, repsMin: e.repsMin, repsMax: e.repsMax,
        sets: Math.max(1, e.sets.filter((x) => !x.warmup && x.kind !== 'drop' && x.side !== 'R').length),
        tracking: e.tracking, targetSeconds: e.targetSeconds, groupId: e.groupId,
      }, history))),
    })
  })
  openWorkout()
}

export function startEmpty() {
  if (activeSession(getData())) return openWorkout()
  update((d) => {
    d.sessions.push({ id: uid(), name: t('Entrenamiento libre', 'Free workout'), start: Date.now(), notes: '', exercises: [] })
  })
  openWorkout()
}

export function addExercises(sessionId: string, exercises: Exercise[]) {
  update((d) => {
    const session = d.sessions.find((s) => s.id === sessionId)
    if (!session) return
    const history = finishedSessions(d)
    for (const e of exercises) {
      const last = lastSets(e.id, history)
      session.exercises.push(blockDeload(d, sessionExercise({
        exerciseId: e.id, name: e.name, muscle: e.muscle, rest: d.settings.defaultRest,
        // El cardio de distancia suele ser una única serie.
        repsMin: 0, repsMax: 0, sets: Math.max(last.filter((x) => x.kind !== 'drop').length, defaultTracking(e) === 'distance_time' ? 1 : 3), tracking: defaultTracking(e),
      }, history)))
    }
  })
}

/**
 * Cambia un ejercicio del entrenamiento por otro. Si ya había series hechas del original se
 * conservan y el nuevo se añade detrás con las series pendientes.
 */
export function replaceSessionExercise(sessionId: string, sessionExerciseId: string, exercise: Exercise) {
  update((d) => {
    const session = d.sessions.find((s) => s.id === sessionId)
    const index = session?.exercises.findIndex((e) => e.id === sessionExerciseId) ?? -1
    if (!session || index < 0) return
    const old = session.exercises[index]
    const pending = old.sets.filter((s) => !s.done).length
    const tracking = defaultTracking(exercise)
    const fresh = sessionExercise({
      exerciseId: exercise.id, name: exercise.name, muscle: exercise.muscle, rest: old.rest,
      repsMin: old.repsMin, repsMax: old.repsMax, sets: Math.max(pending, 1), tracking,
      targetSeconds: tracking === 'time' ? old.targetSeconds : undefined,
      groupId: old.groupId,
    }, finishedSessions(d))
    if (old.sets.some((s) => s.done)) {
      old.sets = old.sets.filter((s) => s.done)
      session.exercises.splice(index + 1, 0, fresh)
    } else {
      session.exercises[index] = fresh
    }
  })
}

/** Cierra el entrenamiento quitando series sin marcar. Si no había nada hecho, lo descarta. */
export function finishSession(id: string) {
  let saved = false
  update((d) => {
    const session = d.sessions.find((s) => s.id === id)
    if (!session) return
    session.exercises = session.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0)
    normalizeGroups(session.exercises)
    if (!session.exercises.length) {
      d.sessions = d.sessions.filter((s) => s.id !== id)
      return
    }
    session.end = Date.now()
    saved = true
  })
  resetRestView()
  setUI({ open: false, summaryId: saved ? id : undefined })
  if (saved) navigator.vibrate?.(80)
}

export function discardSession(id: string) {
  withUndo(t('Entrenamiento descartado', 'Workout discarded'), () => update((d) => {
    d.sessions = d.sessions.filter((s) => s.id !== id)
  }))
  resetRestView()
  setUI({ open: false })
}

/** Crea una rutina a partir de lo que se hizo en un entrenamiento. */
export function saveAsRoutine(session: Session) {
  const routineId = uid()
  update((d) => {
    d.routines.push({
      id: routineId,
      name: session.name,
      notes: '',
      order: d.routines.length,
      createdAt: Date.now(),
      exercises: session.exercises.map((e) => {
        // Los drop sets van pegados a otra serie: no cuentan como series de la rutina.
        const main = workingSets(e).filter((s) => s.kind !== 'drop')
        const reps = main.map((s) => s.reps)
        return {
          exerciseId: e.exerciseId, name: e.name, muscle: e.muscle,
          sets: Math.max(main.length, 1),
          repsMin: reps.length ? Math.max(1, Math.min(...reps)) : 8,
          repsMax: reps.length ? Math.max(1, ...reps) : 12,
          rest: e.rest,
          tracking: e.tracking,
          targetSeconds: e.targetSeconds,
          groupId: e.groupId,
        }
      }),
    })
    const s = d.sessions.find((x) => x.id === session.id)
    if (s) s.routineId = routineId
  })
}

let wakeLock: WakeLockSentinel | undefined

/**
 * Mantiene la pantalla encendida durante el entrenamiento (si el navegador lo permite). El sistema
 * lo retira al cambiar de app, así que al volver hay que pedirlo otra vez aunque ya se tuviera.
 */
export async function keepScreenOn(on: boolean) {
  try {
    if (on && (!wakeLock || wakeLock.released)) wakeLock = await navigator.wakeLock?.request('screen')
    if (!on && wakeLock) {
      await wakeLock.release()
      wakeLock = undefined
    }
  } catch {
    wakeLock = undefined
  }
}
