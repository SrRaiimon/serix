// Resumen de la tarjeta de recuperación: con tres o más grupos «recuperándose», una sola fila con el tramo de horas.

export interface RecoveryGroup {
  label: string
  /** 0-1; 1 = listo. */
  ready: number
  /** Horas que faltan para estar listo. */
  hoursLeft: number
}

/** Por debajo de esto se considera que el grupo todavía se está recuperando. */
export const RECOVERING = 0.6

export interface RecoverySplit<G extends RecoveryGroup> {
  /** Filas que van sueltas (en el orden recibido). */
  rows: G[]
  /** Los agrupados en una sola fila, si eran tres o más; con su tramo de horas y la media de recuperación. */
  summary?: { groups: G[]; minHours: number; maxHours: number; ready: number }
}

/**
 * Antes solo se agrupaba si las horas eran exactamente iguales: con 7 h y 8 h de diferencia seguían ocho filas casi
 * idénticas. Ahora se agrupan siempre que sean tres o más, y la fila dice el tramo («~36–48 h»).
 */
export function splitRecovery<G extends RecoveryGroup>(groups: G[]): RecoverySplit<G> {
  const recovering = groups.filter((g) => g.ready < RECOVERING)
  if (recovering.length < 3) return { rows: groups }
  const hours = recovering.map((g) => g.hoursLeft)
  return {
    rows: groups.filter((g) => g.ready >= RECOVERING),
    summary: {
      groups: recovering,
      minHours: Math.min(...hours),
      maxHours: Math.max(...hours),
      ready: recovering.reduce((n, g) => n + g.ready, 0) / recovering.length,
    },
  }
}
