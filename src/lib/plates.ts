import { fromKg, type Unit } from './format'

// Calculadora de discos: qué poner en cada lado de la barra para llegar a un peso.

/** Discos habituales en un gimnasio, de mayor a menor. */
export const PLATES: Record<Unit, number[]> = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] }
/** Barras habituales: olímpica, de mujer / técnica y corta o Z. */
export const BARS: Record<Unit, number[]> = { kg: [20, 15, 10], lb: [45, 35, 25] }

export interface Loading {
  /** Discos de un lado, de mayor a menor, en la unidad indicada. */
  perSide: number[]
  /** Peso total que se consigue (barra + discos). */
  total: number
  /** Diferencia con el objetivo que no se puede cargar con esos discos (0 = exacto). */
  missing: number
}

/** Reparte el peso (en kg) en discos por lado, empezando por los más grandes. */
export function loadBar(targetKg: number, barWeight: number, unit: Unit): Loading {
  const target = fromKg(targetKg, unit)
  let side = Math.max(0, (target - barWeight) / 2)
  const perSide: number[] = []
  for (const plate of PLATES[unit]) {
    while (side >= plate - 1e-6) {
      perSide.push(plate)
      side -= plate
    }
  }
  const total = barWeight + 2 * perSide.reduce((a, b) => a + b, 0)
  return { perSide, total, missing: Math.max(0, Math.round((target - total) * 100) / 100) }
}
