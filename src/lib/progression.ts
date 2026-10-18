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
export function rememberEquipment(list: { id: string; equipment: string }[]) {
  for (const e of list) equipmentById.set(e.id, e.equipment)
}
export const equipmentOf = (exerciseId: string) => equipmentById.get(exerciseId)

/**
 * El siguiente peso de mancuerna que existe, en kg. Hasta 10 kg van de 1 en 1. Desde ahí hay dos series: de 2 en 2
 * (12, 14…) y de 2,5 en 2,5 (12,5, 15…). Los pesos de las dos (10, 20, 30) no dicen cuál tienes: lo dicen los
 * que ya has usado en el ejercicio (si alguno es solo de la de 2,5).
 */
function dumbbellStep(weight: number, used: number[]): number {
  const only25 = (w: number) => w % 2.5 === 0 && w % 2 !== 0
  if (weight < 10) return weight % 1 === 0 ? 1 : 2.5
  if (only25(weight)) return 2.5
  if (weight % 2 === 0 && weight % 2.5 !== 0) return 2
  return used.some((w) => w >= 10 && only25(w)) ? 2.5 : 2
}

/**
 * Lo que se sube cada vez: un salto de la unidad (2,5 kg / 5 lb), el doble en los básicos de pierna. En
 * aislamiento, un 5 % del peso (al menos 1 kg / 2 lb), redondeado a 0,5 kg / 1 lb: mancuernas y poleas
 * van de 1-2 kg en 1-2 kg.
 */
export function progressionStep(muscle: string, unit: Unit, exerciseId = '', weight = 0, used: number[] = []): number {
  // Mancuernas: a la siguiente que existe (24 → 26 kg, no 26,5), también en aislamiento (un martillo de 24 no
  // pasa a 25). Antes de la regla del 5 %, que daba pesos que no hay en ningún gimnasio.
  const equipment = equipmentById.get(exerciseId) ?? (/dumbbell/i.test(exerciseId) ? 'dumbbell' : '')
  if (unit === 'kg' && equipment === 'dumbbell' && weight > 0) return dumbbellStep(weight, used)
  // Kettlebells (la goblet del catálogo): de 2 en 2 kg, a la siguiente par.
  if (unit === 'kg' && equipment === 'kettlebell' && weight > 0) return 2 - (weight % 2)
  if (exerciseId && isIsolation(exerciseId)) {
    const fine = unit === 'kg' ? 0.5 : 1
    const min = unit === 'kg' ? 1 : 2
    return toKg(Math.max(min, Math.round((fromKg(weight, unit) * 0.05) / fine) * fine), unit)
  }
  return toKg(increment(unit) * (LOWER.has(muscle) && !LIGHT_LEG.test(exerciseId) ? 2 : 1), unit)
}

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
    n++
  }
  return n
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
    const lower = Math.max(0, round(weight * 0.9, unit))
    return { sets: Array.from({ length: count }, () => blank(lower, ex.repsMax)), auto: { kind: 'down', from: weight, to: lower, mode: 'linear' } }
  }
  if (completed || easy) {
    // Solo las series de trabajo: el calentamiento (redondeado a 2,5) y los drop sets no dicen qué juego tienes.
    const used = history.flatMap((s) => s.exercises.filter((e) => e.exerciseId === ex.exerciseId).flatMap((e) => e.sets.filter((x) => !x.warmup && x.kind !== 'drop').map((x) => x.weight)))
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
