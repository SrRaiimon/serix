import { addDays, startOfDay } from './format'
import type { Settings } from './store'

// Días fijos de entreno (opcional): 0 = lunes … 6 = domingo, como la semana de Inicio.

/** Día de la semana empezando en lunes (0) hasta domingo (6). */
export const weekdayIndex = (d: Date | number) => (new Date(d).getDay() + 6) % 7

export interface DayPlan {
  /** Hoy es uno de los días elegidos. */
  today: boolean
  /** Próximo día de entreno a partir de mañana. */
  next: Date
}

/** Qué toca hoy según los días elegidos, o nada si no se han elegido. */
export function dayPlan(settings: Pick<Settings, 'trainingDays'>, now = Date.now()): DayPlan | undefined {
  const days = settings.trainingDays
  if (!days?.length) return undefined
  const today = startOfDay(now)
  let next = addDays(today, 1)
  while (!days.includes(weekdayIndex(next))) next = addDays(next, 1)
  return { today: days.includes(weekdayIndex(today)), next }
}
