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

const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const pad = (n: number) => String(n).padStart(2, '0')
const icsDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

/**
 * Calendario (.ics) con los días de entreno: un evento semanal a la hora elegida, con aviso 15 minutos
 * antes. Así avisa el calendario del móvil aunque la app esté cerrada (Serix no tiene servidor).
 * La hora va sin zona («flotante»): es la hora local del móvil.
 */
export function trainingCalendar(days: number[], time: string, title: string, alarm: string, now = new Date()): string {
  const [h, m] = time.split(':').map(Number)
  let first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  while (!days.includes(weekdayIndex(first)) || first.getTime() <= now.getTime()) first = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1, h, m)
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Serix//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:serix-entreno-${stamp}@serix`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsDate(first)}`,
    'DURATION:PT1H',
    `RRULE:FREQ=WEEKLY;BYDAY=${[...days].sort().map((d) => BYDAY[d]).join(',')}`,
    `SUMMARY:${title}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${alarm}`, 'TRIGGER:-PT15M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}
