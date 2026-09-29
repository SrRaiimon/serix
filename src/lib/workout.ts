import { useSyncExternalStore } from 'react'
import type { Exercise } from './catalog'
import { uid } from './format'
import { lastSets, workingSets } from './stats'
import { normalizeGroups } from './groups'
import { defaultTracking, type Tracking } from './tracking'
import { activeSession, finishedSessions, getData, update, type Routine, type Session, type SessionExercise } from './store'
import { stopRest } from './timer'

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
}

function sessionExercise(ex: PlannedExercise, history: Session[]): SessionExercise {
  const last = lastSets(ex.exerciseId, history)
  const count = Math.max(ex.sets, 1)
  return {
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
    // Se rellenan con lo que se hizo la última vez para marcar y listo.
    sets: Array.from({ length: count }, (_, i) => {
      const prev = last.length ? last[Math.min(i, last.length - 1)] : undefined
      return {
        id: uid(), weight: prev?.weight ?? 0, reps: prev?.reps ?? 0, done: false, warmup: false,
        ...(prev?.duration ? { duration: prev.duration } : {}),
        ...(prev?.distance ? { distance: prev.distance } : {}),
      }
    }),
  }
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
      exercises: routine.exercises.map((e) => sessionExercise(e, history)),
    })
  })
  openWorkout()
}

export function startEmpty() {
  if (activeSession(getData())) return openWorkout()
  update((d) => {
    d.sessions.push({ id: uid(), name: 'Entrenamiento libre', start: Date.now(), notes: '', exercises: [] })
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
      session.exercises.push(sessionExercise({
        exerciseId: e.id, name: e.name, muscle: e.muscle, rest: d.settings.defaultRest,
        // El cardio de distancia suele ser una única serie.
        repsMin: 0, repsMax: 0, sets: Math.max(last.length, defaultTracking(e) === 'distance_time' ? 1 : 3), tracking: defaultTracking(e),
      }, history))
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
  stopRest()
  setUI({ open: false, summaryId: saved ? id : undefined })
  if (saved) navigator.vibrate?.(80)
}

export function discardSession(id: string) {
  update((d) => {
    d.sessions = d.sessions.filter((s) => s.id !== id)
  })
  stopRest()
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
        const reps = workingSets(e).map((s) => s.reps)
        return {
          exerciseId: e.exerciseId, name: e.name, muscle: e.muscle,
          sets: Math.max(workingSets(e).length, 1),
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
