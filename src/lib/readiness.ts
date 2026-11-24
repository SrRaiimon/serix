import type { Unit } from './format'
import { lowerWeight } from './progression'
import type { Session } from './store'

// «¿Cómo estás hoy?» antes de entrenar: sueño, energía y agujetas del 1 al 5. Con una nota baja se
// propone aligerar el día (un 10 % menos de peso en lo que queda); no se cambia nada sin tocar el botón.

export type Readiness = NonNullable<Session['readiness']>

/** Nota de 1 a 5 (las agujetas restan: 5 = muchas). */
export const readinessScore = (r: Readiness) => (r.sleep + r.energy + (6 - r.soreness)) / 3

export const readinessLevel = (r: Readiness): 'low' | 'ok' | 'high' => {
  const s = readinessScore(r)
  return s <= 2.34 ? 'low' : s >= 4 ? 'high' : 'ok'
}

/** Un 10 % menos de peso en las series pendientes, a un peso que existe (como la descarga). */
export function lighten(session: Session, unit: Unit) {
  for (const e of session.exercises) {
    for (const x of e.sets) {
      if (x.done || x.weight <= 0 || e.assisted) continue
      const lower = lowerWeight(e.exerciseId, x.weight, unit)
      if (lower > 0) x.weight = lower
    }
  }
}
