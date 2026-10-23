import { addDays } from './format'
import { dayGoalOptions, dayKey, goalsForDay, lastWeek } from './nutrition'
import { records, sessionVolume } from './stats'
import { finishedSessions, type AppData } from './store'


export interface WeekRecap {
  workouts: number
  goal: number
  /** Kilos movidos (peso × repeticiones). */
  volume: number
  /** Ejercicios en los que se superó la mejor marca. */
  records: number
  food?: { logged: number; met: number; protein: number }
  /** Último peso de la semana y cambio frente al último de antes. */
  weight?: { kg: number; change?: number }
}

/** Resumen de la semana que empieza en `weekStart` (lunes a domingo); nada si no se hizo nada. */
export function weekRecap(d: AppData, weekStart: number): WeekRecap | undefined {
  // Con el calendario y no con 7 × 24 h: la semana del cambio de hora de otoño tiene 169 h, y el domingo de 23:00 a
  // 24:00 (y la comida del domingo) se quedaban fuera.
  const end = addDays(new Date(weekStart), 7).getTime()
  const sessions = finishedSessions(d)
  const week = sessions.filter((s) => s.start >= weekStart && s.start < end)
  const before = new Map(records(sessions.filter((s) => s.start < weekStart)).map((r) => [r.exerciseId, r.e1rm]))
  const beaten = records(sessions.filter((s) => s.start < end))
    .filter((r) => before.has(r.exerciseId) && r.e1rm > before.get(r.exerciseId)! + 0.01 && r.date >= weekStart).length
  const goals = d.settings.nutrition
  const opts = dayGoalOptions(d)
  const food = goals ? lastWeek(d.nutrition.entries, (day) => goalsForDay(goals, d.nutrition.entries, day, opts), dayKey(end)) : undefined
  const weights = d.measurements.filter((m) => m.weight !== undefined && m.date < end).sort((a, b) => a.date - b.date)
  const inWeek = weights.filter((m) => m.date >= weekStart)
  const last = inWeek.at(-1)
  const prev = weights.filter((m) => m.date < weekStart).at(-1)
  if (!week.length && !food?.logged && !last) return undefined
  return {
    workouts: week.length,
    goal: d.settings.weeklyGoal,
    volume: week.reduce((t, s) => t + sessionVolume(s), 0),
    records: beaten,
    ...(food?.logged ? { food: { logged: food.logged, met: food.met, protein: food.p } } : {}),
    ...(last ? { weight: { kg: last.weight!, ...(prev ? { change: last.weight! - prev.weight! } : {}) } } : {}),
  }
}
