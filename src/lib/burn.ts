import type { Tracking } from './tracking'

// Calorías gastadas en un entrenamiento, estimadas con MET (Compendium of Physical Activities, Ainsworth
// et al., 2011): kcal = MET × peso (kg) × horas. Pesas: 3,5 MET (código 02050, «esfuerzo moderado»):
// el MET de la sesión entera, con los descansos dentro, no el de la serie; cardio de distancia (correr, bici, remo…): 7 MET de media. Se resta 1 MET (lo que se gasta en reposo,
// que ya cuenta el objetivo del día). Es una estimación: puede fallar bastante.

const MET_WEIGHTS = 3.5
const MET_CARDIO = 7

/** Kcal estimadas de un entrenamiento terminado (0 si no se sabe el peso o no tiene duración). */
export function sessionKcal(s: { start: number; end?: number; exercises: { tracking?: Tracking }[] }, kg: number | undefined): number {
  if (!kg || s.end === undefined || !s.exercises.length) return 0
  const hours = Math.min(4, Math.max(0, (s.end - s.start) / 3600000))
  const cardio = s.exercises.filter((e) => e.tracking === 'distance_time').length / s.exercises.length
  // Se cuenta lo que el entreno gasta de más sobre estar sentado (MET − 1): el reposo ya va en la base
  // del día, y si no se contaría dos veces.
  const met = MET_WEIGHTS * (1 - cardio) + MET_CARDIO * cardio - 1
  return Math.round((met * kg * hours) / 10) * 10
}
