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
