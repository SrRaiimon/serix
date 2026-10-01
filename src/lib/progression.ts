import { fromKg, increment, toKg, uid, type Unit } from './format'
import { workingSets } from './stats'
import type { AutoProgress, Progression, Session, SetEntry } from './store'

// Progresión automática del peso al empezar una rutina.
//
// - double (doble progresión): se trabaja en un rango de repeticiones (p. ej. 8-12). Cuando la
//   última vez se llegó al máximo en todas las series, se sube el peso y se vuelve al mínimo.
// - linear (lineal): repeticiones fijas (p. ej. 3×5). Si se completaron todas, se sube el peso; si no,
//   se repite. Los ejercicios de pierna suben el doble.
// - wave531 (5/3/1 de Jim Wendler): ciclo de 4 semanas sobre un máximo de entrenamiento (TM,
//   ~90 % del 1RM). La última serie de las 3 primeras semanas es AMRAP y la cuarta es de descarga.
//   Al acabar cada ciclo el TM sube 2,5 kg (tren superior) o 5 kg (pierna).

const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves'])

/** Lo que se sube cada vez: un salto de la unidad (2,5 kg / 5 lb), el doble en pierna. */
export const progressionStep = (muscle: string, unit: Unit) => toKg(increment(unit) * (LOWER.has(muscle) ? 2 : 1), unit)

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
export function plan(ex: PlanInput, last: SetEntry[], history: Session[], unit: Unit): Plan | undefined {
  if (ex.progression === 'wave531') {
    if (!ex.trainingMax) return undefined
    const since = ex.tmSince ?? 0
    // Semana del ciclo: cuántas veces se ha hecho el ejercicio desde que se fijó el TM.
    const done = history.filter((s) => s.start >= since && s.exercises.some((e) => e.exerciseId === ex.exerciseId && workingSets(e).length)).length
    const week = done % 4
    const cycle = Math.floor(done / 4)
    const tm = ex.trainingMax + cycle * progressionStep(ex.muscle, unit)
    const sets = WAVE[week].map(([pct, reps], i) => blank(round(tm * pct, unit), reps, week < 3 && i === 2 ? { kind: 'amrap' } : {}))
    return { sets, auto: { kind: 'wave', week: week + 1, tm }, deload: week === 3 }
  }
  if (ex.progression !== 'double' && ex.progression !== 'linear') return undefined
  const main = last.filter((s) => s.kind !== 'drop' && s.weight > 0)
  if (!main.length || ex.repsMax <= 0) return undefined
  const count = Math.max(ex.sets, 1)
  const weight = Math.max(...main.map((s) => s.weight))
  // Se sube si la última vez se hicieron todas las series previstas y en todas se llegó al máximo
  // de repeticiones del rango (en lineal, a las repeticiones fijadas).
  const completed = main.length >= count && main.every((s) => s.reps >= ex.repsMax)
  if (completed) {
    const next = weight + progressionStep(ex.muscle, unit)
    const reps = ex.progression === 'double' ? ex.repsMin : ex.repsMax
    return { sets: Array.from({ length: count }, () => blank(next, reps)), auto: { kind: 'up', from: weight, to: next, mode: ex.progression } }
  }
  // Mismo peso; en lineal se vuelve a intentar el objetivo completo.
  return {
    sets: Array.from({ length: count }, (_, i) => blank(weight, ex.progression === 'linear' ? ex.repsMax : (main[Math.min(i, main.length - 1)].reps || ex.repsMin))),
    auto: { kind: 'hold', mode: ex.progression },
  }
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
