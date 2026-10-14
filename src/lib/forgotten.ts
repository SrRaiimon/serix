import { MAIN_GROUPS } from './labels'
import type { Session } from './store'

// Aparte de coach.ts (que tira del generador y de las alternativas) para que Inicio no lo cargue al abrir.

const DAY = 86400000

/**
 * Grupos que entrenabas (en los últimos 60 días) y llevas 10 días o más sin tocar (como músculo
 * principal), del más olvidado al menos. Para avisar en Inicio.
 */
export function forgottenGroups(sessions: Session[], now = Date.now()): { group: number; days: number }[] {
  const last = new Map<string, number>()
  for (const s of sessions) {
    if (s.start < now - 60 * DAY || s.start > now) continue
    for (const e of s.exercises) if (e.sets.some((x) => x.done && !x.warmup)) last.set(e.muscle, Math.max(last.get(e.muscle) ?? 0, s.start))
  }
  return MAIN_GROUPS.map(([, muscles], group) => {
    const at = Math.max(0, ...muscles.map((m) => last.get(m) ?? 0))
    return { group, days: at ? Math.floor((now - at) / DAY) : -1 }
  }).filter((x) => x.days >= 10).sort((a, b) => b.days - a.days)
}
