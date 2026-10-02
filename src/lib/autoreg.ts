import { blockWeek, type TrainingBlock } from './block'
import { fromKg, increment, toKg, type Unit } from './format'
import type { TrainingGoal } from './generator'
import { MAIN_GROUPS } from './labels'
import { setCount, workingSets } from './stats'
import type { Session, SessionExercise } from './store'

// Ideas del panel de entrenadores (ver la conversación de la 0.0.22):
// - Volumen semanal por grupo con un rango orientativo.
// - Autorregulación: ajustar el peso de las series que faltan según el RPE de la anterior.
// - Molestias: recordar si un ejercicio molestó la última vez.

// MARK: Volumen semanal

/** Series semanales orientativas por grupo según el objetivo (series efectivas, cerca del fallo). */
export function weeklyRange(goal: TrainingGoal): [min: number, max: number] {
  return goal === 'hypertrophy' ? [10, 20] : goal === 'strength' ? [6, 12] : [6, 15]
}

export interface GroupVolume {
  name: [es: string, en: string]
  sets: number
}

/**
 * Series de los últimos 7 días por grupo principal: 1 por serie del músculo principal y 0,5 por
 * cada secundario (el criterio habitual de series fraccionadas).
 */
export function weeklyGroupSets(sessions: Session[], secondaryOf: (exerciseId: string) => string[], now = Date.now()): GroupVolume[] {
  const since = now - 7 * 86400000
  const load = new Map<string, number>()
  for (const s of sessions) {
    if (s.start < since || s.start > now) continue
    for (const e of s.exercises) {
      const n = setCount(e)
      if (!n) continue
      load.set(e.muscle, (load.get(e.muscle) ?? 0) + n)
      for (const m of secondaryOf(e.exerciseId)) if (m !== e.muscle) load.set(m, (load.get(m) ?? 0) + n / 2)
    }
  }
  return MAIN_GROUPS.map(([name, muscles]) => ({ name, sets: Math.round(muscles.reduce((t, m) => t + (load.get(m) ?? 0), 0) * 2) / 2 }))
}

// MARK: Autorregulación por RPE

/** RPE previsto: el del bloque (10 − RIR) o 8 (dejar unas 2 en la recámara). */
export function targetRpe(block: TrainingBlock | undefined, now = Date.now()): number {
  const w = blockWeek(block, now)
  return w?.rir !== undefined ? 10 - w.rir : 8
}

export interface LoadSuggestion {
  /** Serie cuyo RPE motiva el cambio. */
  setId: string
  rpe: number
  target: number
  from: number
  to: number
  /** Series pendientes a las que se aplicaría. */
  apply: string[]
}

/**
 * Cada punto de RPE equivale más o menos a un 4 % del peso (a igualdad de repeticiones). Si la última
 * serie hecha se alejó un punto o más de lo previsto, se propone ese ajuste para las series que faltan
 * con el mismo peso: hasta −10 % si costó de más y, por prudencia, como mucho +5 % si sobró.
 */
export function loadSuggestion(e: SessionExercise, target: number, unit: Unit): LoadSuggestion | undefined {
  if (e.deload || e.auto?.kind === 'wave') return undefined
  const done = e.sets.filter((s) => s.done && !s.warmup && s.kind !== 'drop' && s.kind !== 'amrap' && s.weight > 0)
  const last = done[done.length - 1]
  if (!last || last.rpe === undefined) return undefined
  const diff = last.rpe - target
  if (Math.abs(diff) < 1) return undefined
  const pending = e.sets.filter((s) => !s.done && !s.warmup && s.kind !== 'drop' && Math.abs(s.weight - last.weight) < 0.01)
  if (!pending.length) return undefined
  const pct = Math.max(-0.1, Math.min(0.05, -diff * 0.04))
  const step = increment(unit)
  const to = toKg(Math.round(fromKg(last.weight * (1 + pct), unit) / step) * step, unit)
  if (Math.abs(to - last.weight) < 0.01 || to <= 0) return undefined
  return { setId: last.id, rpe: last.rpe, target, from: last.weight, to, apply: pending.map((s) => s.id) }
}

// MARK: Molestias

/** Escala de 1 (apenas) a 10; desde 4 se avisa la próxima vez. */
export const PAIN_WARN = 4

/** La molestia apuntada la última vez que se hizo el ejercicio (si la hubo). */
export function lastPain(exerciseId: string, history: Session[]): { pain: number; date: number; note?: string } | undefined {
  for (const s of history) {
    const e = s.exercises.find((x) => x.exerciseId === exerciseId && (workingSets(x).length || x.pain))
    if (e) return e.pain ? { pain: e.pain, date: s.start, note: e.painNote } : undefined
  }
  return undefined
}

