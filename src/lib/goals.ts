import { exerciseHistory, records } from './stats'
import type { Session } from './store'

// Metas de fuerza: «100 kg en press de banca» (como máximo estimado a una repetición, que se puede
// alcanzar con cualquier serie: 85 × 5 ya son ~99 kg), con fecha opcional y previsión a tu ritmo.

export interface LiftGoal {
  id: string
  exerciseId: string
  name: string
  /** Máximo estimado a conseguir (kg). */
  kg: number
  /** Máximo estimado al ponerla (para la barra de progreso). */
  from: number
  createdAt: number
  /** Fecha límite (opcional). */
  by?: number
}

const DAY = 86400000

export interface GoalStatus {
  current: number
  /** 0 a 1. */
  progress: number
  /** Fecha en que se consiguió (la primera sesión que llegó). */
  doneAt?: number
  /** A este ritmo, cuándo se llegaría (nada si no sube). */
  eta?: number
  /** Con fecha límite: si se llega a tiempo a este ritmo. */
  onTrack?: boolean
}

/** Ritmo de subida del máximo estimado (kg al día) en las últimas 8 semanas, por mínimos cuadrados. */
export function e1rmSlope(points: { date: number; e1rm: number }[], now = Date.now()): number | undefined {
  const recent = points.filter((p) => p.date >= now - 56 * DAY && p.e1rm > 0)
  if (recent.length < 3) return undefined
  const mx = recent.reduce((n, p) => n + p.date, 0) / recent.length
  const my = recent.reduce((n, p) => n + p.e1rm, 0) / recent.length
  const sxx = recent.reduce((n, p) => n + (p.date - mx) ** 2, 0)
  if (!sxx) return undefined
  return (recent.reduce((n, p) => n + (p.date - mx) * (p.e1rm - my), 0) / sxx) * DAY
}

export function goalStatus(goal: LiftGoal, sessions: Session[], now = Date.now()): GoalStatus {
  const points = exerciseHistory(goal.exerciseId, sessions)
  const current = records(sessions).find((r) => r.exerciseId === goal.exerciseId)?.e1rm ?? 0
  const reached = points.find((p) => p.date >= goal.createdAt - DAY && p.e1rm >= goal.kg - 0.01)
  const progress = goal.kg > goal.from ? Math.min(1, Math.max(0, (current - goal.from) / (goal.kg - goal.from))) : current >= goal.kg ? 1 : 0
  if (reached || current >= goal.kg) return { current, progress: 1, doneAt: reached?.date ?? now }
  const slope = e1rmSlope(points, now)
  const eta = slope && slope > 0.005 ? now + ((goal.kg - current) / slope) * DAY : undefined
  return { current, progress, eta, ...(goal.by ? { onTrack: eta !== undefined && eta <= goal.by } : {}) }
}
