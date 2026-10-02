import { addDays, startOfWeek } from './format'
import { t } from './i18n'

// Bloques de entrenamiento (mesociclos): unas semanas apretando cada vez un poco más y, al final, una
// semana de descarga ya programada para recuperar antes del siguiente bloque. Los bloques se repiten
// solos hasta que lo terminas.
//
// En las semanas de carga se indica cuántas repeticiones dejar «en la recámara» (RIR): de 3 la
// primera a 1 la última, es decir, cada semana más cerca del fallo. En la de descarga, todos los
// ejercicios de peso empiezan con menos series y un 10 % menos de peso (ver applyDeload). El 5/3/1
// ya trae su propia descarga y no se toca.

export interface TrainingBlock {
  /** Cualquier momento de la semana en que empezó (se cuenta por semanas de lunes a domingo). */
  start: number
  /** Semanas por bloque, contando la de descarga. */
  weeks: number
}

export const BLOCK_WEEKS = [4, 5, 6, 7]

export interface BlockWeek {
  week: number
  weeks: number
  /** Número de bloque (1 el primero; se repiten solos). */
  cycle: number
  deload: boolean
  /** Repeticiones que dejar en la recámara (solo semanas de carga). */
  rir?: number
}

const WEEK = 7 * 86400000

export function blockWeek(b: TrainingBlock | undefined, now = Date.now()): BlockWeek | undefined {
  if (!b) return undefined
  // Redondeo: los cambios de hora hacen que una semana no mida exactamente 7 × 24 h.
  const elapsed = Math.round((startOfWeek(now).getTime() - startOfWeek(b.start).getTime()) / WEEK)
  if (elapsed < 0) return undefined
  const week = (elapsed % b.weeks) + 1
  const cycle = Math.floor(elapsed / b.weeks) + 1
  const loading = b.weeks - 1
  if (week === b.weeks) return { week, weeks: b.weeks, cycle, deload: true }
  const rir = loading <= 1 ? 2 : Math.round(3 - (2 * (week - 1)) / (loading - 1))
  return { week, weeks: b.weeks, cycle, deload: false, rir }
}

/**
 * Cuándo empieza un bloque nuevo: esta semana si aún queda la mayor parte (de lunes a jueves); si no,
 * el lunes siguiente, para que la primera semana de carga no dure uno o dos días.
 */
export function blockStart(now = Date.now()): number {
  const day = new Date(now).getDay()
  return day >= 1 && day <= 4 ? now : addDays(startOfWeek(now), 7).getTime()
}

/** Qué toca esta semana, en una frase. */
export function blockFocus(w: BlockWeek): string {
  if (w.deload) return t('Semana de descarga: menos series y un 10 % menos de peso para recuperar.', 'Deload week: fewer sets and 10% less weight to recover.')
  return w.rir === 1
    ? t('Deja solo 1 repetición en la recámara: la semana más dura del bloque.', 'Leave just 1 rep in reserve: the hardest week of the block.')
    : t(`Deja unas ${w.rir} repeticiones en la recámara en cada serie.`, `Leave about ${w.rir} reps in reserve on each set.`)
}

/** Si el bloque guardado es válido (copias de seguridad). */
export function cleanBlock(v: unknown): TrainingBlock | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const o = v as Record<string, unknown>
  if (typeof o.start !== 'number' || !Number.isFinite(o.start) || !BLOCK_WEEKS.includes(o.weeks as number)) return undefined
  return { start: o.start, weeks: o.weeks as number }
}
