import { t } from './i18n'
import { MAIN_GROUPS } from './labels'
import { setCount } from './stats'
import type { Session } from './store'

// Equilibrio muscular: compara las series de las últimas 4 semanas entre músculos que trabajan en
// sentidos opuestos. Las descompensaciones grandes (mucho empuje y poco tirón, mucho cuádriceps y poco
// isquiotibial) se asocian a peor postura y más riesgo de molestias, así que se avisa con una
// sugerencia concreta. Solo cuenta el músculo principal de cada ejercicio.

export const BALANCE_DAYS = 28
/** Por debajo de esto no hay datos suficientes para opinar. */
const MIN_SETS = 12

const PUSH = ['pectorals', 'delts', 'triceps']
const PULL = ['lats', 'upper-back', 'biceps', 'traps']

export interface BalancePair {
  id: 'pushPull' | 'quadsHams'
  label: [es: string, en: string]
  sides: [[es: string, en: string], [es: string, en: string]]
  sets: [number, number]
  /** Proporción razonable: el primero como mucho `max` veces el segundo (y al revés `1 / min`). */
  max: number
  min: number
  /** Lado que se queda corto, si lo hay. */
  short?: 0 | 1
}

export interface Balance {
  pairs: BalancePair[]
  /** Grupos principales sin ninguna serie en el periodo (si se ha entrenado lo suficiente). */
  neglected: [es: string, en: string][]
  total: number
}

export function muscleBalance(sessions: Session[], now = Date.now(), secondaryOf: (exerciseId: string) => string[] = () => []): Balance {
  const since = now - BALANCE_DAYS * 86400000
  const sets = new Map<string, number>()
  // Músculos trabajados como secundarios (la sentadilla trabaja glúteos): no cuentan para los
  // equilibrios, pero un grupo así no está «sin ninguna serie».
  const worked = new Set<string>()
  let total = 0
  for (const s of sessions) {
    if (s.start < since || s.start > now) continue
    for (const e of s.exercises) {
      const n = setCount(e)
      if (!n) continue
      sets.set(e.muscle, (sets.get(e.muscle) ?? 0) + n)
      for (const m of secondaryOf(e.exerciseId)) if (m !== e.muscle) worked.add(m)
      total += n
    }
  }
  const sum = (muscles: string[]) => muscles.reduce((t, m) => t + (sets.get(m) ?? 0), 0)
  const pair = (p: Omit<BalancePair, 'short'>): BalancePair => {
    const [a, b] = p.sets
    if (a + b < MIN_SETS) return p
    if (a > p.max * Math.max(b, 1)) return { ...p, short: 1 }
    if (b > Math.max(a, 1) / p.min) return { ...p, short: 0 }
    return p
  }
  const pairs = [
    // Empuje y tirón: lo habitual es 1:1; se avisa a partir de 1,5 veces.
    pair({ id: 'pushPull', label: ['Empuje y tirón', 'Push and pull'], sides: [['Empuje', 'Push'], ['Tirón', 'Pull']], sets: [sum(PUSH), sum(PULL)], max: 1.5, min: 1 / 1.5 }),
    // Cuádriceps e isquiotibiales: es normal algo más de cuádriceps; se avisa a partir de 2,5 veces.
    pair({ id: 'quadsHams', label: ['Delante y detrás de la pierna', 'Front and back of the leg'], sides: [['Cuádriceps', 'Quads'], ['Isquiotibiales', 'Hamstrings']], sets: [sum(['quads']), sum(['hamstrings'])], max: 2.5, min: 1 / 2 }),
  ]
  const neglected = total >= 30 ? MAIN_GROUPS.filter(([, muscles]) => sum(muscles) === 0 && !muscles.some((m) => worked.has(m))).map(([name]) => name) : []
  return { pairs, neglected, total }
}

/** Qué añadir para compensar. */
export function balanceTip(p: BalancePair): string {
  if (p.short === undefined) return t('Bien equilibrado.', 'Well balanced.')
  if (p.id === 'pushPull') {
    return p.short === 1
      ? t('Haces bastante más empuje que tirón: añade remos, dominadas o jalones (y algo de face pull) hasta igualarlos.', 'You do a lot more pushing than pulling: add rows, pull-ups or pulldowns (and some face pulls) until they even out.')
      : t('Haces bastante más tirón que empuje: añade algo de press de banca, press militar o fondos.', 'You do a lot more pulling than pushing: add some bench press, overhead press or dips.')
  }
  return p.short === 1
    ? t('Mucho cuádriceps y poco isquiotibial: añade peso muerto rumano, curl femoral o buenos días.', 'Lots of quads and little hamstring work: add Romanian deadlifts, leg curls or good mornings.')
    : t('Mucho isquiotibial y poco cuádriceps: añade sentadilla, prensa o zancadas.', 'Lots of hamstrings and little quad work: add squats, leg press or lunges.')
}
