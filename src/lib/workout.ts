import { useSyncExternalStore } from 'react'
import type { Exercise } from './catalog'
import { fromKg, increment, startOfWeek, toKg, uid, type Unit } from './format'
import { lastSets, setUnits, workingSets } from './stats'
import { BODYWEIGHT_LIFTS, bodyweightAt } from './bodyweight'
import { normalizeGroups } from './groups'
import { defaultTracking, trackingOf, type Tracking } from './tracking'
import { activeSession, expectedMinutes, finishedSessions, getData, lastPerformed, routineMinutes, routineSets, update, type AppData, type Routine, type Session, type SessionExercise, type Progression, type SetEntry, type SetKind, withUndo } from './store'
import { resetRestView } from './timer'
import { t } from './i18n'
import { equipmentOf, plan } from './progression'
import { BARBELL_EQUIPMENT, plannedWarmup } from './warmup'
import { BARS } from './plates'
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
  percent?: number
  tempo?: string
  trainingMax?: number
  tmSince?: number
}

/** Cambia una sesión (la del entreno en curso) por su id. */
export function editSession(id: string, fn: (s: Session) => void) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id)
    if (s) fn(s)
  })
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
    ...(mode.perHand ? { perHand: true } : {}),
    ...(ex.tempo ? { tempo: ex.tempo } : {}),
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

/** Series que quedan en descarga: ~60 %, y nunca una sola si había dos o más (el press francés se quedaba en 1). */
export const deloadSets = (n: number) => (n <= 1 ? n : Math.max(2, Math.round(n * 0.6)))

/**
 * Sesión de descarga del ejercicio: de las series pendientes quedan ~60 % (al menos una) con un
 * 10 % menos de peso, sin drop sets ni series al fallo. Las ya hechas no se tocan. En las máquinas
 * asistidas el peso es la ayuda: se sube un 10 % (bajarla hacía la descarga más dura).
 */
export function applyDeload(e: SessionExercise, unit: Unit): void {
  const step = increment(unit)
  const round = (kg: number) => toKg(Math.round(fromKg(kg, unit) / step) * step, unit)
  const pending = e.sets.filter((s) => !s.done && !s.warmup && s.kind !== 'drop')
  // Por lados se cuentan parejas (izquierda y su derecha): con entradas sueltas, 4 series daban L, R, L, R, L.
  const units = pending.filter((s) => s.side !== 'R').length
  const keepUnits = deloadSets(units)
  let pair = -1
  const keep = new Set(pending.filter((s) => (s.side !== 'R' ? ++pair : pair) < keepUnits).map((s) => s.id))
  e.beforeDeload = e.sets.filter((s) => !s.done && !s.warmup).map((s) => ({ ...s }))
  e.sets = e.sets.filter((s) => s.done || s.warmup || keep.has(s.id))
  for (const s of e.sets) {
    if (!keep.has(s.id)) continue
    if (s.weight > 0) s.weight = round(s.weight * (e.assisted ? 1.1 : 0.9))
    delete s.kind
  }
  e.deload = true
}

/** Hechas y en total del entreno en curso, con setUnits: la misma regla que el resumen y el historial. */
export function setProgress(sets: readonly SetEntry[]): { done: number; total: number } {
  const units = setUnits(sets)
  return { done: units.filter(Boolean).length, total: units.length }
}

/**
 * Quita la descarga de un ejercicio: vuelven las series y los pesos de antes (antes solo se quitaba la marca y las
 * series seguían recortadas). Lo ya hecho se queda como se hizo.
 */
export function undoDeload(e: SessionExercise): void {
  const before = e.beforeDeload
  delete e.deload
  delete e.beforeDeload
  if (!before) return
  // Si después se pasó a «por lados» (o al revés), las series ya no son las mismas: se quita solo la marca.
  if (before.some((s) => s.side) !== e.sets.some((s) => s.side)) return
  const now = new Map(e.sets.map((s) => [s.id, s]))
  const originals = new Set(before.map((s) => s.id))
  // Lo que no era de antes se queda: el calentamiento y lo hecho delante, y las series añadidas después de la descarga
  // detrás (antes se perdían sin avisar).
  const ahead = e.sets.filter((s) => !originals.has(s.id) && (s.warmup || s.done))
  const added = e.sets.filter((s) => !originals.has(s.id) && !s.warmup && !s.done)
  e.sets = [...ahead, ...before.map((s) => (now.get(s.id)?.done ? now.get(s.id)! : s)), ...added]
}

/**
 * Si el resumen de una sesión habla de descarga en vez de comparar el peso movido: si algún ejercicio se descargó de
 * verdad y era la semana de descarga (aunque la plancha o una 5/3/1 no se descarguen), o si todos los comparados se
 * descargaron. Un entreno libre de esa semana sin nada descargado compara como siempre.
 */
export function deloadSummary(d: AppData, session: Session, compared: readonly string[]): boolean {
  const deloaded = new Set(session.exercises.filter((e) => e.deload).map((e) => e.exerciseId))
  return deloaded.size > 0 && (deloadWeek(d, session.start) || (compared.length > 0 && compared.every((id) => deloaded.has(id))))
}

/** Siguiente rutina del programa activo: la que va después de la última realizada. */
export function nextRoutine(d: AppData, now = Date.now()): Routine | undefined {
  // Con una rutina asignada a cada día de entreno, toca la del próximo día (hoy, si aún no has entrenado).
  const byDay = d.settings.dayRoutines
  const days = d.settings.trainingDays
  if (byDay && days?.length) {
    const today = new Date(now)
    const trainedToday = d.sessions.some((s) => s.end && new Date(s.start).toDateString() === today.toDateString())
    for (let i = trainedToday ? 1 : 0; i < 8; i++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      const weekday = (day.getDay() + 6) % 7
      if (!days.includes(weekday)) continue
      const routine = d.routines.find((r) => r.id === byDay[weekday] && r.exercises.length)
      if (routine) return routine
      break
    }
  }
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

/** Si esta semana toca descarga: la del bloque o la que propuso el entrenador. */
export const deloadWeek = (d: AppData, now = Date.now()) =>
  !!(blockWeek(d.settings.block, now)?.deload || d.settings.easyWeek === startOfWeek(now).getTime())

/**
 * La rutina como se hará esta semana: en descarga, las series que dejará applyDeload (el 60 %). Inicio, Rutinas y
 * el detalle cuentan con esto: decían «20 series · ~55 min» y el entreno, «0 de 12».
 */
export function weekRoutine(d: AppData, r: Routine): Routine {
  if (!deloadWeek(d)) return r
  return { ...r, exercises: r.exercises.map((e) => (deloads(e) ? { ...e, sets: deloadSets(e.sets) } : e)) }
}

/** Si un ejercicio se descarga en la semana de descarga: los de peso, salvo la 5/3/1 (lleva su propia semana 4). Una
 * sola regla para lo que enseñan Inicio y Rutinas (weekRoutine) y lo que hace el entreno (blockDeload). */
const deloads = (e: { tracking?: Tracking; progression?: Progression }) => trackingOf(e) === 'weight_reps' && e.progression !== 'wave531'

/** Series y minutos de una rutina esta semana (con la descarga, la estimación: la media real era sin ella). */
export function routineFacts(d: AppData, r: Routine): { sets: number; minutes: number; measured: boolean; deload: boolean } {
  const week = weekRoutine(d, r)
  const deload = week !== r
  return { sets: routineSets(week), ...(deload ? { minutes: routineMinutes(week), measured: false } : expectedMinutes(d, r)), deload }
}

/** En la semana de descarga del bloque, los ejercicios de peso empiezan ya con la descarga. */
function blockDeload(d: AppData, e: SessionExercise, source: { tracking?: Tracking; progression?: Progression }): SessionExercise {
  if (deloadWeek(d) && deloads(source) && e.auto?.kind !== 'wave' && !e.deload) applyDeload(e, d.settings.unit)
  return e
}

/** Lo que propondrá cada ejercicio al empezar la rutina (los mismos cálculos), para enseñarlo antes. */
export function previewRoutine(routine: Routine, d: AppData): SessionExercise[] {
  const history = finishedSessions(d)
  return withWarmup(routine.exercises.map((e) => blockDeload(d, sessionExercise(e, history, d.settings.unit), e)), d, history)
}

/**
 * El calentamiento en series, en el primer ejercicio pesado del día (los siguientes ya llegan calientes). Lo
 * mismo en el detalle de la rutina y al empezarla: antes el detalle enseñaba una rampa que el entreno no traía.
 */
export function withWarmup(list: SessionExercise[], d: AppData, history = finishedSessions(d)): SessionExercise[] {
  const unit = d.settings.unit
  const bar = (e: SessionExercise) => (BARBELL_EQUIPMENT.has(equipmentOf(e.exerciseId) ?? '') ? d.settings.barKg ?? toKg(BARS[unit][0], unit) : undefined)
  for (const e of list) {
    const full = plannedWarmup(e, unit, bar(e), lastSets(e.exerciseId, history).map((x) => x.weight))
    if (!full.length) continue
    // En descarga, las dos más pesadas: con 2 series efectivas al 90 %, una rampa de 4 pesaba más que el trabajo.
    const ramp = e.deload ? full.slice(-2) : full
    e.sets = [...ramp.map((w) => ({ id: uid(), weight: w.weight, reps: w.reps, done: false, warmup: true })), ...e.sets]
    break
  }
  return list
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
      exercises: withWarmup(routine.exercises.map((e) => blockDeload(d, sessionExercise(e, history), e)), d, history),
    })
  })
  openWorkout()
}

/**
 * Empieza un entrenamiento igual que uno del historial: mismos ejercicios, número de series y
 * superseries, con los pesos de la última vez (como al empezar una rutina).
 */
/**
 * Series de trabajo que tenía previstas un ejercicio de un entreno ya hecho. Si se hizo en descarga, las que quedan
 * son ~60 % (deloadSets): repetirlo o guardarlo como rutina las copiaba recortadas para siempre. Se toman las de la
 * rutina si existe y tiene ese ejercicio; si no, la cuenta de deloadSets al revés (2 → 3, 3 → 5).
 */
export function plannedSets(e: SessionExercise, routine?: Routine): number {
  const done = setUnits(e.sets.filter((x) => !x.warmup && x.kind !== 'drop')).length
  if (!e.deload) return Math.max(1, done)
  const own = routine?.exercises.find((x) => x.exerciseId === e.exerciseId)
  return Math.max(1, own?.sets ?? (done <= 1 ? done : Math.round(done / 0.6)))
}

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
      // Con el calentamiento, como al empezar una rutina.
      exercises: withWarmup(past.exercises.map((e) => blockDeload(d, sessionExercise({
        exerciseId: e.exerciseId, name: e.name, muscle: e.muscle, rest: e.rest, repsMin: e.repsMin, repsMax: e.repsMax,
        sets: plannedSets(e, d.routines.find((r) => r.id === past.routineId)),
        tracking: e.tracking, targetSeconds: e.targetSeconds, groupId: e.groupId,
      }, history), e)), d, history),
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
        // Series como las cuenta setUnits: por lados, la pareja es una (contar filas duplicaba las series).
        repsMin: 0, repsMax: 0, sets: Math.max(setUnits(last).length, defaultTracking(e) === 'distance_time' ? 1 : 3), tracking: defaultTracking(e),
      }, history), { tracking: defaultTracking(e) }))
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
    // Sin el calentamiento ni los drop sets, y por lados la pareja cuenta una (antes el nuevo salía con el doble).
    const pending = setUnits(old.sets.filter((s) => !s.done)).length
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
    // Sin la copia de antes de la descarga: solo sirve durante el entreno (para quitarla) y se guardaba para siempre.
    session.exercises = session.exercises
      .map(({ beforeDeload: _before, ...e }) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
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
/**
 * Guarda un entreno como rutina con el nombre elegido. Los entrenos anteriores sin rutina y con el mismo nombre pasan
 * a ser de la rutina nueva: así «Frente a la última vez» sigue comparando con ellos (antes, al guardarla, la
 * comparación desaparecía) y ninguno vuelve a ofrecer «Guardar como rutina» (salían rutinas repetidas).
 */
export function saveAsRoutine(session: Session, name = session.name) {
  const routineId = uid()
  update((d) => {
    d.routines.push({
      id: routineId,
      name: name.trim().slice(0, 80) || session.name,
      notes: '',
      order: d.routines.length,
      createdAt: Date.now(),
      exercises: session.exercises.map((e) => {
        // Los drop sets van pegados a otra serie y por lados la pareja es una serie: setUnits, como el resumen.
        const main = workingSets(e).filter((s) => s.kind !== 'drop')
        const reps = main.map((s) => s.reps)
        return {
          exerciseId: e.exerciseId, name: e.name, muscle: e.muscle,
          sets: plannedSets(e),
          repsMin: reps.length ? Math.max(1, Math.min(...reps)) : 8,
          repsMax: reps.length ? Math.max(1, ...reps) : 12,
          rest: e.rest,
          tracking: e.tracking,
          targetSeconds: e.targetSeconds,
          groupId: e.groupId,
        }
      }),
    })
    for (const s of d.sessions) if (s.id === session.id || (!s.routineId && s.end !== undefined && s.name === session.name)) s.routineId = routineId
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
