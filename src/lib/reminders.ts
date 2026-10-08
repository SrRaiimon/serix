import type { AppData } from './store'

// Recordatorios suaves en Inicio: pesarse una vez por semana y hacer fotos de progreso cada 4 semanas.

const DAY = 86400000
export const WEIGH_EVERY = 7
export const PHOTO_EVERY = 28

/** Último peso apuntado (fecha), o nada. */
export const lastWeighIn = (d: Pick<AppData, 'measurements'>) =>
  d.measurements.reduce<number | undefined>((last, m) => (m.weight !== undefined && (last === undefined || m.date > last) ? m.date : last), undefined)

/**
 * ¿Toca pesarse? Solo a quien ya se pesa o lleva la comida con objetivo (el ajuste de calorías según el
 * peso necesita pesadas frecuentes), si hace una semana o más del último peso.
 */
export function weighDue(d: Pick<AppData, 'measurements' | 'settings'>, now = Date.now()): boolean {
  const last = lastWeighIn(d)
  if (last === undefined && !d.settings.nutrition) return false
  if (d.settings.weighSnooze && now < d.settings.weighSnooze) return false
  return last === undefined || now - last >= WEIGH_EVERY * DAY
}

/** ¿Toca foto de progreso? Solo a quien ya tiene alguna, a las 4 semanas de la última. */
export function photoDue(d: Pick<AppData, 'settings'>, now = Date.now()): boolean {
  const last = d.settings.lastPhotoAt
  if (last === undefined) return false
  if (d.settings.photoSnooze && now < d.settings.photoSnooze) return false
  return now - last >= PHOTO_EVERY * DAY
}

/** Media de los 7 días anteriores (incluido) en cada punto: la tendencia del peso, sin los vaivenes diarios. */
export function rollingAverage(points: { x: number; y: number }[], days = 7): { x: number; y: number }[] {
  const sorted = [...points].sort((a, b) => a.x - b.x)
  return sorted.map((p) => {
    const window = sorted.filter((q) => q.x <= p.x && q.x > p.x - days * DAY)
    return { x: p.x, y: window.reduce((n, q) => n + q.y, 0) / window.length }
  })
}

/**
 * Cambio por semana en las últimas 4 semanas: la pendiente de la recta que mejor se ajusta a los puntos
 * (mínimos cuadrados), no la resta del primero y el último, que arrastraría el vaivén de esos dos días.
 * Nada si hay menos de 2 semanas de datos.
 */
export function weeklyTrend(points: { x: number; y: number }[]): number | undefined {
  if (points.length < 3) return undefined
  const last = points[points.length - 1].x
  const recent = points.filter((p) => p.x >= last - 28 * DAY)
  if (recent.length < 3 || last - recent[0].x < 14 * DAY) return undefined
  const mx = recent.reduce((n, p) => n + p.x, 0) / recent.length
  const my = recent.reduce((n, p) => n + p.y, 0) / recent.length
  const sxx = recent.reduce((n, p) => n + (p.x - mx) ** 2, 0)
  return (recent.reduce((n, p) => n + (p.x - mx) * (p.y - my), 0) / sxx) * 7 * DAY
}

/**
 * Racha en peligro: llevas semanas seguidas entrenando, esta semana aún no y quedan 2 días o menos
 * (sábado o domingo). Devuelve la racha que se perdería y los días que quedan.
 */
export function streakAtRisk(sessionStarts: number[], streak: number, now = Date.now()): { streak: number; daysLeft: number } | undefined {
  const d = new Date(now)
  const weekday = (d.getDay() + 6) % 7
  if (weekday < 5 || streak < 2) return undefined
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekday).getTime()
  if (sessionStarts.some((s) => s >= monday)) return undefined
  return { streak, daysLeft: 7 - weekday }
}
