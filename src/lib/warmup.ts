import { fromKg, increment, toKg, type Unit } from './format'

// Series de calentamiento a partir del peso de trabajo: unas pocas series, cada vez más pesadas y
// con menos repeticiones, para llegar a la primera serie efectiva sin cansarse.

export interface WarmupSet {
  /** Kilos. */
  weight: number
  reps: number
}

/** Pesos pesados (en kg) a partir de los que se hace una rampa más larga. */
const HEAVY_KG = 60

/**
 * @param workKg peso de la primera serie efectiva
 * @param barKg peso de la barra si el ejercicio es con barra (la primera serie es la barra sola)
 */
export function warmupSets(workKg: number, unit: Unit, barKg?: number): WarmupSet[] {
  if (workKg <= 0) return []
  const step = increment(unit)
  const round = (kg: number) => toKg(Math.round(fromKg(kg, unit) / step) * step, unit)
  const ramp: [number, number][] = workKg >= HEAVY_KG ? [[0.5, 5], [0.7, 3], [0.85, 1]] : [[0.5, 8], [0.75, 4]]
  const sets: WarmupSet[] = []
  if (barKg && workKg >= barKg * 1.6) sets.push({ weight: barKg, reps: 10 })
  for (const [share, reps] of ramp) {
    const weight = Math.max(round(workKg * share), barKg ?? 0)
    const previous = sets[sets.length - 1]
    // Sin series repetidas ni que igualen o superen la de trabajo.
    if (weight <= 0 || weight >= workKg - 1e-6 || (previous && weight <= previous.weight + 1e-6)) continue
    sets.push({ weight, reps })
  }
  return sets
}
