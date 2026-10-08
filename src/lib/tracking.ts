import type { Exercise } from './catalog'
import { clock, num, weight, weightValue, type Unit } from './format'
import { t as tr } from './i18n'
import type { SetEntry } from './store'

/** Cómo se registra cada serie de un ejercicio. */
export type Tracking = 'weight_reps' | 'time' | 'distance_time'

export const trackingOptions = (): { id: Tracking; label: string }[] => [
  { id: 'weight_reps', label: tr('Peso y repeticiones', 'Weight and reps') },
  { id: 'time', label: tr('Tiempo', 'Time') },
  { id: 'distance_time', label: tr('Distancia y tiempo', 'Distance and time') },
]

// El nombre no basta para deducirlo ("hanging" aparece en elevaciones por repeticiones), así que
// se usa una lista explícita; el resto se puede cambiar a mano desde el menú del ejercicio.
const DISTANCE_IDS = new Set([
  'Bicycling', 'Bicycling_Stationary', 'Elliptical_Trainer', 'Jogging_Treadmill', 'Running_Treadmill',
  'Trail_Running_Walking', 'Walking_Treadmill', 'Rowing_Stationary', 'Recumbent_Bike', 'Skating',
])
const TIME_IDS = new Set([
  'Rope_Jumping', 'Stairmaster', 'Step_Mill', 'Plank', 'Side_Bridge', 'Isometric_Chest_Squeezes',
  'Battling_Ropes', 'Stomach_Vacuum', 'Farmers_Walk',
])

export function defaultTracking(e?: Pick<Exercise, 'id' | 'category' | 'tracking'>): Tracking {
  if (!e) return 'weight_reps'
  if (e.tracking) return e.tracking
  if (DISTANCE_IDS.has(e.id)) return 'distance_time'
  if (TIME_IDS.has(e.id) || e.category === 'stretching') return 'time'
  return 'weight_reps'
}

/** Los datos antiguos no guardaban el tipo: eran todos de peso y repeticiones. */
export const trackingOf = (e: { tracking?: Tracking }): Tracking => e.tracking ?? 'weight_reps'

export const defaultTargetSeconds = 45

// MARK: Entrada de tiempo tipo "microondas": los dígitos se rellenan por la derecha (1,3,0 → 1:30).

export function digitsToSeconds(digits: string): number {
  const d = digits.replace(/\D/g, '').slice(-5)
  if (!d) return 0
  return Number(d.slice(0, -2) || '0') * 60 + Number(d.slice(-2))
}

export function secondsToDigits(seconds: number): string {
  if (seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}${String(s).padStart(2, '0')}` : String(s)
}

export function formatDigits(digits: string): string {
  if (!digits) return ''
  const d = digits.padStart(3, '0')
  return `${Number(d.slice(0, -2))}:${d.slice(-2)}`
}

// MARK: Validación y textos

export function isSetFilled(set: SetEntry, t: Tracking): boolean {
  if (t === 'time') return (set.duration ?? 0) > 0
  if (t === 'distance_time') return (set.duration ?? 0) > 0 || (set.distance ?? 0) > 0
  return set.reps > 0
}

export function setText(set: SetEntry, t: Tracking, unit: Unit): string {
  return baseText(set, t, unit) + (set.rpe ? ` · RPE ${num(set.rpe)}` : '')
}

function baseText(set: SetEntry, t: Tracking, unit: Unit): string {
  if (t === 'time') return clock(set.duration ?? 0)
  if (t === 'distance_time') {
    return [set.distance ? `${num(set.distance)} km` : '', set.duration ? clock(set.duration) : ''].filter(Boolean).join(' · ') || '—'
  }
  return set.weight > 0 ? `${weight(set.weight, unit)} × ${set.reps}` : `${set.reps} reps`
}

/** Versión corta para la columna "Anterior". */
export function setShortText(set: SetEntry, t: Tracking, unit: Unit): string {
  const rpe = set.rpe ? ` @${num(set.rpe)}` : ''
  if (t === 'time') return clock(set.duration ?? 0) + rpe
  if (t === 'distance_time') return ([set.distance ? `${num(set.distance)} km` : '', set.duration ? clock(set.duration) : ''].filter(Boolean).join(' ') || '—') + rpe
  return (set.weight > 0 ? `${weightValue(set.weight, unit)} × ${set.reps}` : `${set.reps} reps`) + rpe
}

/** "3 × 8-12 reps", "3 × 0:45" o "1 serie". */
export function targetText(e: { tracking?: Tracking; sets: number; repsMin: number; repsMax: number; targetSeconds?: number }): string {
  const t = trackingOf(e)
  if (t === 'time') return `${e.sets} × ${clock(e.targetSeconds ?? defaultTargetSeconds)}`
  if (t === 'distance_time') return e.sets === 1 ? tr('1 serie', '1 set') : tr(`${e.sets} series`, `${e.sets} sets`)
  return `${e.sets} × ${e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}-${e.repsMax}`} reps`
}

// MARK: RPE (esfuerzo percibido)

export const rpeValues = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10]

/** "al fallo", "te quedaba 1 rep", "te quedaban 1-2 reps"… (RIR = 10 − RPE). */
export function rpeMeaning(rpe: number): string {
  const rir = 10 - rpe
  if (rir <= 0) return tr('al fallo', 'to failure')
  if (rir >= 4) return tr('te quedaban 4 o más', '4 or more left')
  if (rir === 1) return tr('te quedaba 1 rep', '1 rep left')
  if (!Number.isInteger(rir)) return tr(`te quedaban ${Math.floor(rir)}-${Math.ceil(rir)} reps`, `${Math.floor(rir)}-${Math.ceil(rir)} reps left`)
  return tr(`te quedaban ${rir} reps`, `${rir} reps left`)
}

/**
 * ¿Peso o repeticiones con pinta de error al teclear? Más del doble (y 20 kg más) que lo máximo de la
 * última vez, más de 300 kg sin historial, o más de 100 repeticiones. Devuelve la pregunta, si hay que hacerla.
 */
export function suspicious(set: SetEntry, lastMax: number, unit: Unit): string | undefined {
  const w = set.weight
  if (w > 0 && (lastMax > 0 ? w > lastMax * 2 && w - lastMax >= 20 : w > 300)) {
    return lastMax > 0
      ? tr(`¿${weight(w, unit)}? La última vez lo máximo fue ${weight(lastMax, unit)}.`, `${weight(w, unit)}? Last time your top weight was ${weight(lastMax, unit)}.`)
      : tr(`¿${weight(w, unit)}? Es muchísimo peso.`, `${weight(w, unit)}? That is a lot of weight.`)
  }
  if (set.reps > 100) return tr(`¿${set.reps} repeticiones?`, `${set.reps} reps?`)
  return undefined
}
