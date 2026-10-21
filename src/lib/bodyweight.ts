import { weight, type Unit } from './format'
import { t } from './i18n'
import { getData, update, type AppData } from './store'

// Dominadas y fondos mueven el cuerpo entero: lo que se apunta es el lastre (o la ayuda, si es asistido),
// pero para marcas, 1RM estimado y peso movido cuenta también el peso corporal. Cada ejercicio de un
// entrenamiento guarda el peso corporal de ese día (SessionExercise.bodyweight); ver loadSets en stats.ts.

/** Ejercicios del catálogo en los que se levanta todo el peso corporal. */
export const BODYWEIGHT_LIFTS: ReadonlySet<string> = new Set([
  'Pullups', 'Chin-Up', 'One_Arm_Chin-Up', 'V-Bar_Pullup', 'Wide-Grip_Rear_Pull-Up', 'Weighted_Pull_Ups',
  'Dips_-_Chest_Version', 'Dips_-_Triceps_Version', 'Parallel_Bar_Dip', 'Ring_Dips', 'Muscle_Up', 'Kipping_Muscle_Up',
  'Kipping_Pull_Up', 'Chest_To_Bar_Pull_Up',
])

/**
 * Peso corporal (kg) en una fecha: la última medida de antes; si no hay, la primera de después; si
 * tampoco, el peso del objetivo de Comidas.
 */
export function bodyweightAt(d: Pick<AppData, 'measurements' | 'settings'>, at: number): number | undefined {
  let before: { date: number; weight: number } | undefined
  let after: { date: number; weight: number } | undefined
  for (const m of d.measurements) {
    if (m.weight === undefined || m.weight <= 0) continue
    if (m.date <= at) { if (!before || m.date > before.date) before = { date: m.date, weight: m.weight } }
    else if (!after || m.date < after.date) after = { date: m.date, weight: m.weight }
  }
  return before?.weight ?? after?.weight ?? d.settings.nutrition?.weightKg
}

/**
 * Pone el peso corporal a las dominadas y fondos que no lo tienen (los de antes de esta función o
 * de cuando aún no se sabía el peso). Se llama al abrir la app; no hace nada si no falta ninguno.
 */
export function fillBodyweights() {
  const d = getData()
  const missing = (s: AppData['sessions'][number]) => s.exercises.some((e) => BODYWEIGHT_LIFTS.has(e.exerciseId) && e.bodyweight === undefined)
  if (!d.sessions.some((s) => missing(s) && bodyweightAt(d, s.start) !== undefined)) return
  update((draft) => {
    for (const s of draft.sessions) {
      if (!missing(s)) continue
      const kg = bodyweightAt(draft, s.start)
      if (kg === undefined) continue
      for (const e of s.exercises) if (BODYWEIGHT_LIFTS.has(e.exerciseId) && e.bodyweight === undefined) e.bodyweight = kg
    }
  })
}

/** Lo apuntado en dominadas y fondos: «tu peso + 10 kg», «tu peso − 20 kg» (asistida) o «tu peso». */
/** Ejercicios del catálogo con material «peso corporal» (flexiones, zancadas…): los registra App al cargarlo. */
const bodyweightIds = new Set<string>()
export function registerBodyweightExercises(ids: Iterable<string>) {
  for (const id of ids) bodyweightIds.add(id)
}

/**
 * Si el peso apuntado es lastre (se suma al cuerpo): dominadas, fondos y los de peso corporal del catálogo, salvo
 * con máquina asistida (ahí el peso es la ayuda). Así se escribe con «+» aunque aún no conste el peso corporal,
 * y igual en todas las pantallas.
 */
export const addsLoad = (e: { exerciseId: string; assisted?: boolean }): boolean =>
  !e.assisted && (BODYWEIGHT_LIFTS.has(e.exerciseId) || bodyweightIds.has(e.exerciseId))

/** «20 kg», «+20 kg» si es lastre sin peso corporal conocido, o «tu peso + 20 kg» si se conoce (`added`). */
export function liftText(r: { weight: number; added?: number }, unit: Unit, lastre: boolean): string {
  if (r.added !== undefined) return bodyweightText(r.added, unit)
  return lastre && r.weight > 0 ? `+${weight(r.weight, unit)}` : weight(r.weight, unit)
}

export function bodyweightText(added: number, unit: Unit): string {
  return added > 0 ? t(`tu peso + ${weight(added, unit)}`, `bodyweight + ${weight(added, unit)}`)
    : added < 0 ? t(`tu peso − ${weight(-added, unit)}`, `bodyweight − ${weight(-added, unit)}`) : t('tu peso', 'bodyweight')
}
