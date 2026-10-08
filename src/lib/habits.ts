import { shiftDay } from './nutrition'

// Suplementos (creatina, proteína, vitamina D…: se marcan cada día con un toque) y ayuno intermitente
// (cuántas horas llevas sin comer y cuándo abres la ventana). Ver Comidas.

/** Días seguidos tomando un suplemento hasta `day` (incluido; si ese día aún no, cuenta hasta ayer). */
export function supplementStreak(log: Record<string, string[]> | undefined, name: string, day: string): number {
  if (!log) return 0
  let d = log[day]?.includes(name) ? day : shiftDay(day, -1)
  let n = 0
  while (log[d]?.includes(name)) { n++; d = shiftDay(d, -1) }
  return n
}

/** Marca o desmarca un suplemento en un día (devuelve el registro nuevo, sin días vacíos). */
export function toggleSupplement(log: Record<string, string[]> | undefined, name: string, day: string): Record<string, string[]> {
  const next = { ...(log ?? {}) }
  const list = next[day] ?? []
  next[day] = list.includes(name) ? list.filter((x) => x !== name) : [...list, name]
  if (!next[day].length) delete next[day]
  return next
}

export const FAST_PLANS = [12, 14, 16, 18] as const

export interface FastState {
  /** Horas que llevas de ayuno. */
  hours: number
  /** 0 a 1 respecto al objetivo. */
  progress: number
  /** Cuándo se cumple el objetivo. */
  endsAt: number
  done: boolean
}

export function fastState(start: number, goalHours: number, now = Date.now()): FastState {
  const hours = Math.max(0, (now - start) / 3600000)
  return { hours, progress: Math.min(1, hours / goalHours), endsAt: start + goalHours * 3600000, done: hours >= goalHours }
}
