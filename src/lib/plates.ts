import { fromKg, type Unit } from './format'

// Calculadora de discos: qué poner en cada lado de la barra para llegar a un peso.

/** Discos habituales en un gimnasio, de mayor a menor (los que se usan si no se eligen otros). */
export const PLATES: Record<Unit, number[]> = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] }
/** Todos los discos que se pueden marcar como disponibles, incluidos los fraccionales. */
export const PLATE_OPTIONS: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5, 0.25],
  lb: [55, 45, 35, 25, 10, 5, 2.5, 1.25],
}

/** Discos disponibles en la unidad (los elegidos o los habituales), de mayor a menor. */
export function availablePlates(unit: Unit, chosen?: Partial<Record<Unit, number[]>>): number[] {
  const list = chosen?.[unit]?.filter((p) => PLATE_OPTIONS[unit].includes(p))
  return list?.length ? [...list].sort((a, b) => b - a) : PLATES[unit]
}

/** Salto mínimo de peso con esos discos: el más pequeño en cada lado. */
export const stepFor = (plates: number[]) => 2 * Math.min(...plates)
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

/**
 * Reparte el peso (en kg) en discos por lado: la combinación que más se acerca al objetivo sin pasarse y, a igual suma, con
 * menos discos. Antes era voraz (de mayor a menor): con discos de 20 y 15 y 30 por lado ponía 20 y se quedaba corto, y con
 * 15 + 15 llegaba exacto.
 */
export function loadBar(targetKg: number, barWeight: number, unit: Unit, plates: number[] = PLATES[unit]): Loading {
  const target = fromKg(targetKg, unit)
  const side = Math.max(0, (target - barWeight) / 2)
  // Lo habitual primero: de mayor a menor (25 + 10 + 5, no 20 + 20). Solo si así se queda corto se busca una combinación que llegue.
  const greedy = fill(side, plates)
  if (greedy.left < 1e-6) return result(greedy.perSide)
  // La unidad del reparto: el máximo común divisor de los discos (a centésimas): con discos de 1,1 y 0,7 el redondeo a 0,25 se pasaba del objetivo.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  const hundredths = plates.filter((p) => p > 0).map((p) => Math.round(p * 100))
  const QUANTUM = Math.max(0.01, hundredths.reduce(gcd, 0) / 100) || 0.25
  const cap = Math.min(20000, Math.floor(side / QUANTUM + 1e-6))
  const sizes = [...plates].filter((p) => p > 0).sort((a, b) => b - a).map((p) => ({ p, u: Math.round(p / QUANTUM) })).filter((x) => x.u > 0)
  // best[v]: menos discos para sumar exactamente v (en cuartos); prev[v]: último disco usado.
  const best = new Array<number>(cap + 1).fill(Infinity)
  const prev = new Array<number>(cap + 1).fill(-1)
  best[0] = 0
  for (let v = 1; v <= cap; v++) {
    for (let i = 0; i < sizes.length; i++) {
      const u = sizes[i].u
      if (u <= v && best[v - u] + 1 < best[v]) { best[v] = best[v - u] + 1; prev[v] = i }
    }
  }
  let reach = cap
  while (reach > 0 && best[reach] === Infinity) reach--
  const perSide: number[] = []
  for (let v = reach; v > 0; v -= sizes[prev[v]].u) perSide.push(sizes[prev[v]].p)
  perSide.sort((a, b) => b - a)
  const exactSide = perSide.reduce((a, b) => a + b, 0)
  return result(exactSide > greedy.perSide.reduce((a, b) => a + b, 0) + 1e-9 ? perSide : greedy.perSide)

  function result(list: number[]): Loading {
    const total = barWeight + 2 * list.reduce((a, b) => a + b, 0)
    return { perSide: list, total, missing: Math.max(0, Math.round((target - total) * 100) / 100) }
  }
}

/** El reparto voraz de un lado (de mayor a menor) y lo que queda sin cubrir. */
function fill(side: number, plates: number[]): { perSide: number[]; left: number } {
  const perSide: number[] = []
  let left = side
  for (const plate of [...plates].filter((p) => p > 0).sort((a, b) => b - a)) {
    while (left >= plate - 1e-6) {
      perSide.push(plate)
      left -= plate
    }
  }
  return { perSide, left }
}
