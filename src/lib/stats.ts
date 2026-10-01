import { addDays, startOfWeek } from './format'
import { locale } from './i18n'
import type { Session, SessionExercise, SetEntry } from './store'

// Todas las funciones reciben sesiones terminadas.

/** 1RM estimado con la fórmula de Epley. */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

export const workingSets = (e: SessionExercise) => e.sets.filter((s) => s.done && !s.warmup)

export const sessionVolume = (s: Session) =>
  s.exercises.reduce((t, e) => t + workingSets(e).reduce((v, x) => v + x.weight * x.reps, 0), 0)

export const sessionSets = (s: Session) => s.exercises.reduce((t, e) => t + workingSets(e).length, 0)

export const sessionReps = (s: Session) =>
  s.exercises.reduce((t, e) => t + workingSets(e).reduce((v, x) => v + x.reps, 0), 0)

export const sessionDuration = (s: Session) => (s.end ?? Date.now()) - s.start

export interface PersonalRecord {
  exerciseId: string
  name: string
  weight: number
  reps: number
  e1rm: number
  date: number
}

export function records(sessions: Session[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>()
  for (const s of sessions) {
    for (const e of s.exercises) {
      for (const set of workingSets(e)) {
        if (set.weight <= 0 || set.reps <= 0) continue
        const value = e1rm(set.weight, set.reps)
        if (value > (best.get(e.exerciseId)?.e1rm ?? 0)) {
          best.set(e.exerciseId, { exerciseId: e.exerciseId, name: e.name, weight: set.weight, reps: set.reps, e1rm: value, date: set.doneAt ?? s.start })
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name, locale()))
}

/** Récords batidos en `session` respecto a las sesiones anteriores. */
export function newRecords(session: Session, history: Session[]): PersonalRecord[] {
  const before = new Map(records(history.filter((s) => s.id !== session.id && s.start < session.start)).map((r) => [r.exerciseId, r.e1rm]))
  return records([session]).filter((r) => {
    const prev = before.get(r.exerciseId)
    return prev !== undefined && r.e1rm > prev + 0.01
  })
}

export interface WeekStat {
  start: Date
  volume: number
  sessions: number
  minutes: number
}

export function weekly(sessions: Session[], weeks: number): WeekStat[] {
  const current = startOfWeek(Date.now())
  const result: WeekStat[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(current, -7 * i)
    const end = addDays(start, 7)
    const inWeek = sessions.filter((s) => s.start >= start.getTime() && s.start < end.getTime())
    result.push({
      start,
      volume: inWeek.reduce((t, s) => t + sessionVolume(s), 0),
      sessions: inWeek.length,
      minutes: inWeek.reduce((t, s) => t + sessionDuration(s) / 60000, 0),
    })
  }
  return result
}

export function setsByMuscle(sessions: Session[], since: number): { muscle: string; sets: number }[] {
  const counts = new Map<string, number>()
  for (const s of sessions) {
    if (s.start < since) continue
    for (const e of s.exercises) counts.set(e.muscle, (counts.get(e.muscle) ?? 0) + workingSets(e).length)
  }
  return [...counts].filter(([, n]) => n > 0).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets)
}

/**
 * Series por músculo desde una fecha: cada serie efectiva cuenta 1 para el músculo principal y 0,5
 * para cada secundario (criterio habitual de «series fraccionadas»).
 */
export function muscleLoad(sessions: Session[], since: number, secondaryOf: (exerciseId: string) => string[]): Record<string, number> {
  const load: Record<string, number> = {}
  for (const s of sessions) {
    if (s.start < since) continue
    for (const e of s.exercises) {
      const sets = workingSets(e).length
      if (!sets) continue
      load[e.muscle] = (load[e.muscle] ?? 0) + sets
      for (const m of secondaryOf(e.exerciseId)) if (m !== e.muscle) load[m] = (load[m] ?? 0) + sets / 2
    }
  }
  return load
}

/** Semanas seguidas con al menos un entrenamiento; la semana actual no rompe la racha. */
export function streakWeeks(sessions: Session[], now = Date.now()): number {
  const weeks = new Set(sessions.map((s) => startOfWeek(s.start).getTime()))
  let week = startOfWeek(now)
  if (!weeks.has(week.getTime())) week = addDays(week, -7)
  let streak = 0
  while (weeks.has(week.getTime())) {
    streak++
    week = addDays(week, -7)
  }
  return streak
}

export interface ExercisePoint {
  date: number
  e1rm: number
  maxWeight: number
  volume: number
  /** Segundos de la serie más larga (ejercicios por tiempo o distancia). */
  maxDuration: number
  /** Kilómetros de la serie más larga. */
  maxDistance: number
}

export function exerciseHistory(exerciseId: string, sessions: Session[]): ExercisePoint[] {
  const points: ExercisePoint[] = []
  for (const s of sessions) {
    const sets = s.exercises.filter((e) => e.exerciseId === exerciseId).flatMap(workingSets)
    if (!sets.length) continue
    points.push({
      date: s.start,
      e1rm: Math.max(...sets.map((x) => e1rm(x.weight, x.reps))),
      maxWeight: Math.max(...sets.map((x) => x.weight)),
      volume: sets.reduce((t, x) => t + x.weight * x.reps, 0),
      maxDuration: Math.max(...sets.map((x) => x.duration ?? 0)),
      maxDistance: Math.max(...sets.map((x) => x.distance ?? 0)),
    })
  }
  return points.sort((a, b) => a.date - b.date)
}

/**
 * Series de trabajo de la última vez que se hizo el ejercicio (`sessions` de más reciente a más antigua).
 * Las sesiones de descarga se saltan: después de una se vuelve a los pesos de antes.
 */
export function lastSets(exerciseId: string, sessions: Session[]): SetEntry[] {
  for (const s of sessions) {
    const sets = s.exercises.filter((e) => e.exerciseId === exerciseId && !e.deload).flatMap(workingSets)
    if (sets.length) return sets
  }
  return []
}

/**
 * Sugerencia de subir peso a partir de la última vez:
 * - 'reps': se llegó al máximo de repeticiones en todas las series sin ir al límite (RPE ≤ 9 o sin RPE).
 * - 'easy': todas las series tenían RPE y ninguna pasó de 7, aunque no se llegara al máximo.
 * Los drop sets no cuentan y las series al fallo cuentan como RPE 10.
 */
export function progressionHint(sets: SetEntry[], repsMax: number): 'reps' | 'easy' | null {
  // Los drop sets se hacen con menos peso a propósito; no cuentan.
  const last = sets.filter((s) => s.kind !== 'drop')
  if (!last.length || !last.every((s) => s.weight > 0)) return null
  // Una serie al fallo es RPE 10 aunque no se apuntara.
  const rpes = last.map((s) => (s.kind === 'failure' ? 10 : s.rpe)).filter((r): r is number => r !== undefined)
  const hardest = rpes.length ? Math.max(...rpes) : undefined
  if (repsMax > 0 && last.every((s) => s.reps >= repsMax) && (hardest === undefined || hardest <= 9)) return 'reps'
  if (rpes.length === last.length && hardest !== undefined && hardest <= 7) return 'easy'
  return null
}

export interface PeriodStats {
  sessions: number
  volume: number
  sets: number
  /** Milisegundos entrenados. */
  time: number
  /** Récords batidos en el periodo. */
  records: number
}

/** Cifras de las sesiones que empiezan entre `from` y `to` (récords frente a todo lo anterior). */
export function periodStats(sessions: Session[], from: number, to: number): PeriodStats {
  const inside = sessions.filter((s) => s.start >= from && s.start < to)
  return {
    sessions: inside.length,
    volume: inside.reduce((t, s) => t + sessionVolume(s), 0),
    sets: inside.reduce((t, s) => t + sessionSets(s), 0),
    time: inside.reduce((t, s) => t + sessionDuration(s), 0),
    records: inside.reduce((t, s) => t + newRecords(s, sessions).length, 0),
  }
}

/**
 * Este mes hasta hoy y el mismo tramo del mes anterior (del día 1 al mismo día), para comparar
 * sin que el mes en curso salga siempre perdiendo.
 */
export function monthToDate(sessions: Session[], now = new Date()): { current: PeriodStats; previous: PeriodStats } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const daysInPrev = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth(), Math.min(now.getDate(), daysInPrev), now.getHours(), now.getMinutes(), now.getSeconds()).getTime()
  return { current: periodStats(sessions, start, now.getTime() + 1), previous: periodStats(sessions, prevStart.getTime(), prevEnd + 1) }
}

/** Sesiones seguidas sin superar la mejor marca a partir de las que se avisa de estancamiento. */
export const STALL_SESSIONS = 3

export interface Stall {
  exerciseId: string
  name: string
  /** Mejor 1RM estimado de antes (kg), el que no se ha superado. */
  best: number
  /** Fecha de la última sesión del ejercicio. */
  last: number
}

/**
 * Ejercicio estancado: en sus últimas `STALL_SESSIONS` sesiones (sin contar descargas) no se ha
 * superado el mejor 1RM estimado de las anteriores. Tras una sesión de descarga la cuenta empieza de
 * nuevo. `sessions` son las terminadas, en cualquier orden.
 */
export function stall(exerciseId: string, sessions: Session[]): Stall | undefined {
  const points: { e1rm: number; deload: boolean; date: number; name: string }[] = []
  for (const s of [...sessions].sort((a, b) => a.start - b.start)) {
    const exercises = s.exercises.filter((e) => e.exerciseId === exerciseId)
    const sets = exercises.flatMap(workingSets).filter((x) => x.kind !== 'drop' && x.weight > 0 && x.reps > 0)
    if (!sets.length) continue
    points.push({ e1rm: Math.max(...sets.map((x) => e1rm(x.weight, x.reps))), deload: exercises.some((e) => e.deload), date: s.start, name: exercises[0].name })
  }
  const lastDeload = points.findLastIndex((p) => p.deload)
  const normal = points.map((p, i) => ({ ...p, i })).filter((p) => !p.deload)
  if (normal.length <= STALL_SESSIONS) return undefined
  const recent = normal.slice(-STALL_SESSIONS)
  if (lastDeload > recent[0].i) return undefined
  const before = Math.max(...normal.slice(0, -STALL_SESSIONS).map((p) => p.e1rm))
  if (Math.max(...recent.map((p) => p.e1rm)) > before + 0.01) return undefined
  const last = points[points.length - 1]
  return { exerciseId, name: last.name, best: before, last: last.date }
}

/** Ejercicios estancados entre los hechos desde `since`, del más reciente al más antiguo. */
export function stalls(sessions: Session[], since: number): Stall[] {
  const ids = new Set(sessions.filter((s) => s.start >= since).flatMap((s) => s.exercises.map((e) => e.exerciseId)))
  return [...ids].map((id) => stall(id, sessions)).filter((x): x is Stall => x !== undefined).sort((a, b) => b.last - a.last)
}

export interface MuscleRecovery {
  muscle: string
  /** Cuándo terminó el último entrenamiento que lo trabajó. */
  lastAt: number
  /** Series efectivas de ese entrenamiento (1 si es el principal, 0,5 si es secundario). */
  sets: number
  /** Horas estimadas de recuperación para ese volumen. */
  hoursNeeded: number
  /** 0 = recién entrenado, 1 = recuperado. */
  ready: number
}

/** Horas de recuperación orientativas según el volumen: 48 h con poco, hasta 96 h con mucho. */
export const recoveryHours = (sets: number) => Math.min(96, Math.max(48, 36 + 4 * sets))

/**
 * Estado de recuperación de cada músculo según el último entrenamiento que lo trabajó (con al menos
 * una serie efectiva). Es una estimación sencilla y orientativa: no conoce el sueño, la dieta ni la
 * intensidad real.
 */
export function muscleRecovery(sessions: Session[], secondaryOf: (exerciseId: string) => string[], now = Date.now()): MuscleRecovery[] {
  const result = new Map<string, MuscleRecovery>()
  for (const s of [...sessions].sort((a, b) => b.start - a.start)) {
    const load: Record<string, number> = {}
    for (const e of s.exercises) {
      const sets = workingSets(e).length
      if (!sets) continue
      load[e.muscle] = (load[e.muscle] ?? 0) + sets
      for (const m of secondaryOf(e.exerciseId)) if (m !== e.muscle) load[m] = (load[m] ?? 0) + sets / 2
    }
    const at = s.end ?? s.start
    for (const [muscle, sets] of Object.entries(load)) {
      if (sets < 1 || result.has(muscle) || muscle === 'cardio' || !muscle) continue
      const hoursNeeded = recoveryHours(sets)
      result.set(muscle, { muscle, lastAt: at, sets, hoursNeeded, ready: Math.min(1, Math.max(0, (now - at) / 3600000 / hoursNeeded)) })
    }
  }
  return [...result.values()]
}
