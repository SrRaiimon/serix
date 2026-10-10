import { exerciseHistory, records } from './stats'
import type { Session } from './store'
import { weeklyTrend } from './reminders'

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

/** Meta de peso corporal: «75 kg para junio». Sirve para bajar o para subir. */
export interface WeightGoal {
  kg: number
  /** Peso al ponerla. */
  from: number
  createdAt: number
  by?: number
}

export interface WeightGoalStatus {
  current: number
  progress: number
  doneAt?: number
  /** Cambio por semana ahora mismo (kg; negativo = bajando). */
  perWeek?: number
  eta?: number
  onTrack?: boolean
  /** Con fecha: lo que habría que cambiar por semana para llegar. */
  neededPerWeek?: number
  /** Más de un 1 % del peso por semana: demasiado rápido para hacerlo bien. */
  tooFast?: boolean
}

/**
 * Cómo va la meta de peso con las pesadas (la tendencia de las últimas 4 semanas, no la última pesada,
 * que varía mucho de un día a otro).
 */
export function weightGoalStatus(goal: WeightGoal, weighIns: { date: number; weight: number }[], now = Date.now()): WeightGoalStatus | undefined {
  const points = weighIns.filter((m) => m.weight > 0).sort((a, b) => a.date - b.date)
  const last = points.at(-1)
  if (!last) return undefined
  const losing = goal.kg < goal.from
  const reached = points.find((p) => p.date >= goal.createdAt && (losing ? p.weight <= goal.kg : p.weight >= goal.kg))
  const span = goal.kg - goal.from
  const progress = span ? Math.min(1, Math.max(0, (last.weight - goal.from) / span)) : 1
  if (reached) return { current: last.weight, progress: 1, doneAt: reached.date }
  const perWeek = weeklyTrend(points.map((p) => ({ x: p.date, y: p.weight })))
  const left = goal.kg - last.weight
  const right = perWeek !== undefined && Math.abs(perWeek) > 0.02 && Math.sign(perWeek) === Math.sign(left)
  const eta = right ? now + (left / perWeek!) * 7 * DAY : undefined
  const weeksLeft = goal.by ? (goal.by - now) / (7 * DAY) : undefined
  const neededPerWeek = weeksLeft !== undefined && weeksLeft > 0 ? left / weeksLeft : undefined
  return {
    current: last.weight, progress, perWeek, eta,
    ...(goal.by ? { onTrack: eta !== undefined && eta <= goal.by, neededPerWeek } : {}),
    ...(neededPerWeek !== undefined && Math.abs(neededPerWeek) > last.weight * 0.01 ? { tooFast: true } : {}),
  }
}

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
