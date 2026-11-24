import { fromKg, increment, startOfWeek, toKg, uid, type Unit } from './format'
import { isIsolation } from './isolation'
import { records, workingSets } from './stats'
import type { AutoProgress, Progression, Session, SessionExercise, SetEntry } from './store'

// Progresión automática del peso al empezar una rutina.
//
// - double (doble progresión): se trabaja en un rango de repeticiones (p. ej. 8-12). Cuando la
//   última vez se llegó al máximo en todas las series, se sube el peso y se vuelve al mínimo.
// - linear (lineal): repeticiones fijas (p. ej. 3×5). Si se completaron todas, se sube el peso; si no,
//   se repite. Los ejercicios de pierna suben el doble.
// - wave531 (5/3/1 de Jim Wendler): ciclo de 4 semanas sobre un máximo de entrenamiento (TM,
//   ~90 % del 1RM). La última serie de las 3 primeras semanas es AMRAP y la cuarta es de descarga.
//   Al acabar cada ciclo el TM sube 2,5 kg (tren superior) o 5 kg (pierna), salvo que en algún AMRAP no
//   se llegara a las repeticiones mínimas: entonces el TM baja un 10 % (el «reinicio» de Wendler).

// «spine»: el peso muerto convencional (en el catálogo, su músculo es la zona lumbar).
const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves', 'spine'])
/** Pierna con mancuerna, kettlebell o a una pierna (goblet, zancadas, búlgaras…): sube como el tren superior. */
const LIGHT_LEG = /dumbbell|kettlebell|goblet|lunge|split|step|single|one[-_]leg|pistol/i

export { isIsolation } from './isolation'

/**
 * Material de cada ejercicio, que apunta App al cargar el catálogo: la subida de mancuernas va por el material y
 * no por el nombre (Goblet_Squat o Hammer_Curls son con mancuerna y no lo dicen).
 */
const equipmentById = new Map<string, string>()
/** Sustituye lo apuntado (no lo suma): así cada test empieza limpio y no depende del orden. */
export function rememberEquipment(list: { id: string; equipment: string }[]) {
  equipmentById.clear()
  for (const e of list) equipmentById.set(e.id, e.equipment)
}
/** Material del ejercicio; sin catálogo apuntado, por el nombre (Dumbbell_… son con mancuerna). */
export const equipmentOf = (exerciseId: string) => equipmentById.get(exerciseId) ?? (/dumbbell/i.test(exerciseId) ? 'dumbbell' : undefined)

/**
 * El siguiente peso de mancuerna que existe, en kg. Hasta 10 kg van de 1 en 1. Desde ahí hay dos series: de 2 en 2
 * (12, 14…) y de 2,5 en 2,5 (12,5, 15…). Los pesos de las dos (10, 20, 30) no dicen cuál tienes: lo dicen los
 * que ya has usado en el ejercicio (si alguno es solo de la de 2,5).
 */
function dumbbellStep(weight: number, used: number[]): number {
  if (weight < 10) return weight % 1 === 0 ? 1 : 2.5
  if (only25(weight)) return 2.5
  if (weight % 2 === 0 && weight % 2.5 !== 0) return 2
  return dumbbellSeries(used)
}

/** Barra o EZ: se carga con discos (saltos de 2,5 kg / 5 lb), también en aislamiento. */
const barLoaded = (exerciseId: string, equipment: string) => equipment === 'barbell' || equipment === 'e-z curl bar' || /barbell|(^|_)ez/i.test(exerciseId)
const isLb = (w: number) => Math.round(fromKg(w, 'lb') * 100) / 100
/** Kettlebells que hay en casi todos los gimnasios (kg y lb): la subida y la bajada van de una a la contigua. */
const KETTLEBELLS: Record<Unit, number[]> = {
  kg: [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48],
  lb: [9, 13, 18, 26, 35, 44, 53, 62, 70, 80, 90, 106],
}
const kbNext = (w: number, unit: Unit) => KETTLEBELLS[unit].find((x) => x > fromKg(w, unit) + 0.01)
const only25 = (w: number) => w % 2.5 === 0 && w % 2 !== 0
/** La serie de mancuernas desde 10 kg (de 2 o de 2,5 kg) que dicen los pesos ya usados. La usa también el calentamiento. */
export const dumbbellSeries = (used: number[]): 2 | 2.5 => (used.some((w) => w >= 10 && only25(w)) ? 2.5 : 2)

/**
 * Lo que se sube cada vez: un salto de la unidad (2,5 kg / 5 lb), el doble en los básicos de pierna. En
 * aislamiento, un 5 % del peso (al menos 1 kg / 2 lb), redondeado a 0,5 kg / 1 lb: mancuernas y poleas
 * van de 1-2 kg en 1-2 kg.
 */
export function progressionStep(muscle: string, unit: Unit, exerciseId = '', weight = 0, used: number[] = []): number {
  // Mancuernas: a la siguiente que existe (24 → 26 kg, no 26,5), también en aislamiento (un martillo de 24 no
  // pasa a 25). Antes de la regla del 5 %, que daba pesos que no hay en ningún gimnasio.
  const equipment = equipmentOf(exerciseId) ?? ''
  if (unit === 'kg' && equipment === 'dumbbell' && weight > 0) return dumbbellStep(weight, used)
  // Kettlebells (la goblet del catálogo): de 2 en 2 kg hasta 16 y de 4 en 4 desde ahí (16, 20, 24…: las que hay en
  // casi todos los gimnasios), a la siguiente que existe.
  if (equipment === 'kettlebell' && weight > 0) {
    const next = kbNext(weight, unit)
    if (next !== undefined) return toKg(next, unit) - weight
  }
  // Mancuernas en libras: de 5 en 5 (a la siguiente que existe: 25 → 30, no 27).
  if (unit === 'lb' && equipment === 'dumbbell' && weight > 0) { const w = isLb(weight); return toKg(5 - (w % 5 || 0) || 5, 'lb') }
  if (exerciseId && isIsolation(exerciseId) && !barLoaded(exerciseId, equipment)) {
    const fine = unit === 'kg' ? 0.5 : 1
    const min = unit === 'kg' ? 1 : 2
    return toKg(Math.max(min, Math.round((fromKg(weight, unit) * 0.05) / fine) * fine), unit)
  }
  return toKg(increment(unit) * (LOWER.has(muscle) && !LIGHT_LEG.test(exerciseId) ? 2 : 1), unit)
}

/**
 * El peso tras bajar un 10 %: uno que existe y siempre más bajo que el actual. Redondear al paso de la barra (2,5 kg)
 * dejaba 12,5 → 11,25 → 12,5 en un curl (no bajaba nunca), y las mancuernas de 24 kg pasaban a 22,5 (en series de 2 kg
 * no hay). Mancuernas y kettlebells bajan a la siguiente que hay; el aislamiento, de 0,5 kg / 1 lb; el resto, al
 * paso de la unidad.
 */
export function lowerWeight(exerciseId: string, weight: number, unit: Unit, used: number[] = [], factor = 0.9): number {
  const target = weight * factor
  const equipment = equipmentOf(exerciseId) ?? ''
  if (unit === 'lb' && equipment === 'dumbbell' && weight > 0) {
    // Mancuernas en libras: de 5 en 5, al más cercano al objetivo y siempre uno por debajo.
    const wl = isLb(weight), tl = fromKg(target, 'lb')
    let lower = wl % 5 === 0 ? wl - 5 : Math.floor(wl / 5) * 5
    while (lower > tl && lower > 0) {
      const next = Math.max(0, lower - 5)
      if (Math.abs(next - tl) < Math.abs(lower - tl)) lower = next
      else break
    }
    return toKg(Math.max(0, lower), 'lb')
  }
  if (equipment === 'kettlebell' && weight > 0) {
    // La más cercana al 10 % menos entre las que existen, siempre por debajo (24 → 20, 18 → 16).
    const list = KETTLEBELLS[unit].filter((x) => x < fromKg(weight, unit) - 0.01)
    if (!list.length) return 0
    const tl = fromKg(target, unit)
    return toKg(list.reduce((best, x) => (Math.abs(x - tl) < Math.abs(best - tl) ? x : best)), unit)
  }
  if (unit === 'kg' && equipment === 'dumbbell' && weight > 0) {
    // Un escalón hacia abajo: el espejo de dumbbellStep (hasta 10 kg de 1 en 1; desde ahí, la serie de 2 o de 2,5 kg).
    const step = (w: number) => {
      if (w <= 10) return w % 1 === 0 ? 1 : 2.5
      if (only25(w)) return 2.5
      if (w % 2 === 0 && w % 2.5 !== 0) return 2
      return dumbbellSeries(used)
    }
    // El más cercano al 10 % menos (24 → 22, no 20), siempre al menos un escalón por debajo.
    let lower = Math.max(0, weight - step(weight))
    while (lower > target && lower > 0) {
      const next = Math.max(0, lower - step(lower))
      if (Math.abs(next - target) < Math.abs(lower - target)) lower = next
      else break
    }
    return lower
  }
  // Barra y discos: a la unidad de la barra (2,5 kg / 5 lb), también en aislamiento (un curl con barra a 0,5 kg no existe).
  // Poleas y máquinas en aislamiento: pasos finos (0,5 kg / 1 lb), como al subir; si no, 10 kg bajaba a 7,5 (−25 %).
  const step = exerciseId && isIsolation(exerciseId) && !barLoaded(exerciseId, equipment) ? (unit === 'kg' ? 0.5 : 1) : increment(unit)
  const rounded = toKg(Math.round(fromKg(target, unit) / step) * step, unit)
  return rounded < weight - 0.01 ? Math.max(0, rounded) : Math.max(0, toKg(fromKg(weight, unit) - step, unit))
}

/** Más ayuda en una máquina asistida (un 10 % más, y siempre al menos un escalón: 5 kg × 1,1 se quedaba en 5). */
export function raiseAssist(weight: number, unit: Unit): number {
  const step = increment(unit)
  const w = fromKg(weight, unit)
  return toKg(Math.max(Math.ceil((w * 1.1) / step - 1e-9) * step, (Math.floor(w / step + 1e-9) + 1) * step), unit)
}

/** Pesos de trabajo ya usados en el ejercicio (sin calentamiento, drop sets ni descargas: no dicen qué juego de mancuernas tienes). */
export const usedWeights = (exerciseId: string, history: Session[]) =>
  history.flatMap((s) => s.exercises.filter((e) => e.exerciseId === exerciseId && !e.deload).flatMap((e) => e.sets.filter((x) => !x.warmup && x.kind !== 'drop').map((x) => x.weight)))

/** Sesiones seguidas (de la más reciente hacia atrás) en las que no se completó el objetivo con este peso. */
function failedStreak(ex: PlanInput, history: Session[], weight: number): number {
  let n = 0
  for (const s of [...history].sort((a, b) => b.start - a.start)) {
    const e = s.exercises.find((x) => x.exerciseId === ex.exerciseId && !x.deload)
    if (!e) continue
    const main = workingSets(e).filter((x) => x.kind !== 'drop' && x.weight > 0)
    if (!main.length) continue
    if (Math.abs(Math.max(...main.map((x) => x.weight)) - weight) > 0.01) break
    const completed = main.length >= Math.max(ex.sets, 1) && main.every((x) => x.reps >= ex.repsMax)
    if (completed) break
    // Una sesión cortada (menos series, todas al objetivo) no es un fallo: la dejaste a la mitad, como en la doble.
    if (main.length < Math.max(ex.sets, 1) && main.every((x) => x.reps >= ex.repsMax)) continue
    n++
  }
  return n
}

/**
 * Doble progresión estancada: con el mismo peso, ninguna de las 3 últimas sesiones mejoró las repeticiones totales de las
 * anteriores (hacen falta 4 sesiones con ese peso). `failedStreak` no vale: en doble, una repetición más dentro del rango
 * también es no completar. Sin esto, el ejercicio repetía el mismo peso («hold») indefinidamente.
 */
function stalledDouble(ex: PlanInput, history: Session[], weight: number): boolean {
  const count = Math.max(ex.sets, 1)
  const totals: number[] = []
  for (const s of [...history].sort((a, b) => b.start - a.start)) {
    const e = s.exercises.find((x) => x.exerciseId === ex.exerciseId && !x.deload)
    if (!e) continue
    const main = workingSets(e).filter((x) => x.kind !== 'drop' && x.weight > 0)
    if (!main.length) continue
    if (Math.abs(Math.max(...main.map((x) => x.weight)) - weight) > 0.01) break
    // Una sesión cortada (la dejaste a la mitad) no dice nada de si estás estancado.
    if (main.length < count) continue
    totals.push(main.reduce((n, x) => n + x.reps, 0))
  }
  return totals.length >= 4 && Math.max(...totals.slice(0, 3)) <= Math.max(...totals.slice(3))
}

/** Semanas del 5/3/1: [porcentaje del TM, repeticiones] por serie; la última de las 3 primeras es AMRAP. */
export const WAVE: [number, number][][] = [
  [[0.65, 5], [0.75, 5], [0.85, 5]],
  [[0.7, 3], [0.8, 3], [0.9, 3]],
  [[0.75, 5], [0.85, 3], [0.95, 1]],
  [[0.4, 5], [0.5, 5], [0.6, 5]],
]

const round = (kg: number, unit: Unit) => toKg(Math.round(fromKg(kg, unit) / increment(unit)) * increment(unit), unit)

export interface PlanInput {
  exerciseId: string
  muscle: string
  sets: number
  repsMin: number
  repsMax: number
  progression?: Progression
  percent?: number
  trainingMax?: number
  tmSince?: number
}

export interface Plan {
  sets: SetEntry[]
  auto?: AutoProgress
  /** Semana de descarga del 5/3/1. */
  deload?: boolean
}

const blank = (weight: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry =>
  ({ id: uid(), weight, reps, done: false, warmup: false, ...extra })

/**
 * Series de un ejercicio con progresión automática, o `undefined` si no tiene (o no hay datos para
 * decidir): entonces se rellena como siempre, con lo de la última vez.
 * `last` son las series de trabajo de la última vez (sin descargas) y `history` las sesiones terminadas.
 */
export function plan(ex: PlanInput, last: SetEntry[], history: Session[], unit: Unit, now = Date.now()): Plan | undefined {
  if (ex.progression === 'wave531') {
    if (!ex.trainingMax) return undefined
    const since = ex.tmSince ?? 0
    // Semana del ciclo por semanas del calendario (no por sesiones): quien hace la sentadilla dos veces
    // por semana repite la semana del ciclo en vez de terminarlo en la mitad de tiempo. Cada semana cuenta
    // con su primera sesión de este ejercicio.
    const byWeek = new Map<number, SessionExercise>()
    for (const s of [...history].filter((x) => x.start >= since).sort((a, b) => a.start - b.start)) {
      const e = s.exercises.find((x) => x.exerciseId === ex.exerciseId && workingSets(x).length)
      const w = startOfWeek(s.start).getTime()
      if (e && !byWeek.has(w)) byWeek.set(w, e)
    }
    const done = [...byWeek.values()]
    // Si esta semana ya se hizo, hoy se repite esa semana del ciclo.
    const thisWeek = byWeek.has(startOfWeek(now).getTime())
    const index = thisWeek ? done.length - 1 : done.length
    const week = index % 4
    // Cada ciclo terminado: si en algún AMRAP (semanas 1-3) no se llegó al mínimo, TM −10 %; si no, sube.
    let tm = ex.trainingMax
    let reset = false
    for (let c = 0; c < Math.floor(index / 4); c++) {
      const missed = done.slice(c * 4, c * 4 + 3).some((e, w) => {
        // La serie AMRAP; si se cambió de tipo, la más pesada que se hizo. Sin ninguna hecha, cuenta como fallo.
        const work = e.sets.filter((x) => x.done && !x.warmup && x.kind !== 'drop')
        const amrap = work.find((x) => x.kind === 'amrap') ?? [...work].sort((a, b) => b.weight - a.weight)[0]
        return !amrap || amrap.reps < WAVE[w][2][1]
      })
      reset = missed
      tm = missed ? round(tm * 0.9, unit) : tm + progressionStep(ex.muscle, unit)
    }
    const sets = WAVE[week].map(([pct, reps], i) => blank(round(tm * pct, unit), reps, week < 3 && i === 2 ? { kind: 'amrap' } : {}))
    return { sets, auto: { kind: 'wave', week: week + 1, tm, ...(reset && week === 0 ? { reset: true as const } : {}) }, deload: week === 3 }
  }
  if (ex.progression === 'percent') {
    // Peso = porcentaje del mejor 1RM estimado de los últimos 90 días contados desde hoy (si has bajado,
    // baja contigo). Tras una pausa más larga, el mejor de los 90 días antes de parar menos un 10 %; si
    // aún no hay ninguno, se pone a mano.
    // En dominadas y fondos el máximo incluye el peso corporal: ahí el lastre se pone a mano.
    const best = (h: Session[]) => records(h).find((r) => r.exerciseId === ex.exerciseId && r.added === undefined)?.e1rm
    const recent = best(history.filter((s) => s.start >= now - 90 * 86400000))
    // Tras la pausa: lo que movías en los 90 días antes de parar (no el récord de hace años), −10 %.
    const last = Math.max(0, ...history.filter((s) => s.exercises.some((e) => e.exerciseId === ex.exerciseId)).map((s) => s.start))
    const before = recent === undefined && last ? best(history.filter((s) => s.start >= last - 90 * 86400000 && s.start <= last)) : undefined
    const max = recent ?? (before !== undefined ? before * 0.9 : undefined)
    if (!max || !ex.percent) return undefined
    const reps = ex.repsMax || ex.repsMin || 5
    return { sets: Array.from({ length: Math.max(ex.sets, 1) }, () => blank(round(max * ex.percent!, unit), reps)), auto: { kind: 'percent', pct: ex.percent, max } }
  }
  const bw = bodyweightPlan(ex, last)
  if (bw) return bw
  if (ex.progression !== 'double' && ex.progression !== 'linear') return undefined
  const main = last.filter((s) => s.kind !== 'drop' && s.weight > 0)
  if (!main.length || ex.repsMax <= 0) return undefined
  const count = Math.max(ex.sets, 1)
  const weight = Math.max(...main.map((s) => s.weight))
  // Se sube si la última vez se hicieron todas las series previstas y en todas se llegó al máximo
  // de repeticiones del rango (en lineal, a las repeticiones fijadas).
  const completed = main.length >= count && main.every((s) => s.reps >= ex.repsMax)
  // El esfuerzo (si se apuntó) matiza: completar al límite (RPE 9,5-10) aún no es para subir, y en doble
  // progresión ir sobrado (RPE 7 o menos en todas) a 1 repetición del máximo ya lo es.
  const rpes = main.map((s) => s.rpe).filter((r): r is number => r !== undefined)
  const allRated = rpes.length === main.length
  const maxed = allRated && Math.max(...rpes) >= 9.5
  const easy = ex.progression === 'double' && allRated && main.length >= count && Math.max(...rpes) <= 7 && main.every((s) => s.reps >= ex.repsMax - 1)
  if (completed && maxed) {
    return { sets: Array.from({ length: count }, (_, i) => blank(weight, ex.progression === 'linear' ? ex.repsMax : (main[Math.min(i, main.length - 1)].reps || ex.repsMin))), auto: { kind: 'hold', mode: ex.progression, reason: 'rpe' } }
  }
  // Lineal: tras 3 sesiones seguidas sin completar con el mismo peso, un 10 % menos para volver a subir.
  if (ex.progression === 'linear' && !completed && failedStreak(ex, history, weight) >= 3) {
    const lower = lowerWeight(ex.exerciseId, weight, unit, usedWeights(ex.exerciseId, history))
    if (lower > 0 && lower < weight) return { sets: Array.from({ length: count }, () => blank(lower, ex.repsMax)), auto: { kind: 'down', from: weight, to: lower, mode: 'linear' } }
  }
  // Doble: tras 3 sesiones sin mejorar con el mismo peso, un 10 % menos y de nuevo desde el mínimo del rango.
  // Con esfuerzo bajo (RPE 7 o menos en todas) no es un estancamiento: sobra fuerza, se mantiene.
  const sparing = allRated && Math.max(...rpes) <= 7
  if (ex.progression === 'double' && !completed && !easy && !sparing && stalledDouble(ex, history, weight)) {
    const used = usedWeights(ex.exerciseId, history)
    const lower = lowerWeight(ex.exerciseId, weight, unit, used)
    if (lower > 0 && lower < weight) return { sets: Array.from({ length: count }, () => blank(lower, ex.repsMin)), auto: { kind: 'down', from: weight, to: lower, mode: 'double' } }
  }
  if (completed || easy) {
    // Solo las series de trabajo: el calentamiento (redondeado a 2,5) y los drop sets no dicen qué juego tienes.
    const used = usedWeights(ex.exerciseId, history)
    const next = weight + progressionStep(ex.muscle, unit, ex.exerciseId, weight, used)
    const reps = ex.progression === 'double' ? ex.repsMin : ex.repsMax
    return { sets: Array.from({ length: count }, () => blank(next, reps)), auto: { kind: 'up', from: weight, to: next, mode: ex.progression } }
  }
  // Mismo peso; en lineal se vuelve a intentar el objetivo completo.
  return {
    sets: Array.from({ length: count }, (_, i) => blank(weight, ex.progression === 'linear' ? ex.repsMax : (main[Math.min(i, main.length - 1)].reps || ex.repsMin))),
    auto: { kind: 'hold', mode: ex.progression },
  }
}

/**
 * Sin peso (todas las series de la última vez a 0 kg, con repeticiones): al llegar al máximo del rango en
 * todas, una repetición más por serie. Pasado el máximo + 5 ya no se sube más: toca una variante más
 * difícil o lastre (se avisa). Si aún no se llega, se rellena como siempre.
 */
function bodyweightPlan(ex: PlanInput, last: SetEntry[]): Plan | undefined {
  // Solo con progresión automática (doble o lineal): en «Manual» la decides tú, aunque apuntes 0 kg.
  if ((ex.progression !== 'double' && ex.progression !== 'linear') || ex.repsMax <= 0) return undefined
  const main = last.filter((s) => s.kind !== 'drop')
  if (!main.length || !main.every((s) => s.weight === 0 && s.reps > 0)) return undefined
  const count = Math.max(ex.sets, 1)
  if (main.length < count || !main.every((s) => s.reps >= ex.repsMax)) return undefined
  const from = Math.min(...main.map((s) => s.reps))
  const cap = ex.repsMax + 5
  // Pasado el tope no se sube más, pero tampoco se baja de lo que ya haces.
  const to = from >= cap ? from : Math.min(cap, from + 1)
  return { sets: Array.from({ length: count }, () => blank(0, to)), auto: { kind: 'reps', from, to, ...(from >= cap ? { harder: true as const } : {}) } }
}

// MARK: Programa 5/3/1

/** Los cuatro básicos del 5/3/1 con sus accesorios (doble progresión). */
export const LIFTS_531 = [
  { id: 'Standing_Military_Press', day: ['Press militar', 'Overhead press'], accessories: [['Chin-Up', 3, 6, 10], ['Dips_-_Triceps_Version', 3, 8, 12]] },
  { id: 'Barbell_Deadlift', day: ['Peso muerto', 'Deadlift'], accessories: [['Lying_Leg_Curls', 3, 10, 12], ['Hanging_Leg_Raise', 3, 10, 15]] },
  { id: 'Barbell_Bench_Press_-_Medium_Grip', day: ['Press de banca', 'Bench press'], accessories: [['One-Arm_Dumbbell_Row', 3, 8, 12], ['Face_Pull', 3, 12, 15]] },
  { id: 'Barbell_Squat', day: ['Sentadilla', 'Squat'], accessories: [['Dumbbell_Lunges', 3, 8, 12], ['Cable_Crunch', 3, 10, 15]] },
] as const

/** TM inicial recomendado: 90 % del 1RM, redondeado al salto de la unidad. */
export const trainingMaxFrom = (oneRm: number, unit: Unit) => round(oneRm * 0.9, unit)
