import type { TrainingGoal, TrainingLevel } from './generator'
import { MAIN_GROUPS } from './labels'

// Volumen semanal por grupo muscular, con una sola cuenta para el generador, el entrenador y Progreso › Músculos:
// si cada uno contaba a su manera, el programa recién creado salía «por debajo» en su propio análisis.

/** Ejercicios de gasto (escaladores, burpees, saltos): no son series de fuerza aunque tengan músculo. */
export const CONDITIONING_ONLY = /jump|burpee|climber|skater|jack|sprawl|high_knees|battling/i

/** Si un ejercicio cuenta como series de fuerza (el cardio y los saltos, no). */
export const countsForVolume = (exerciseId: string, category?: string) =>
  category !== 'cardio' && category !== 'plyometrics' && !CONDITIONING_ONLY.test(exerciseId)

/**
 * Lo que vale una serie para cada grupo: 1 si el músculo principal es del grupo y 0,5 si solo lo es alguno de los
 * secundarios, una vez por grupo. Antes cada secundario sumaba aparte: un remo (espalda alta, y dorsal de
 * secundario) contaba 1,5 series de espalda, y el programa salía con 22 donde había 14.
 */
export function groupShares(muscle: string, secondary: readonly string[]): number[] {
  return MAIN_GROUPS.map(([, muscles]) => (muscles.includes(muscle) ? 1 : secondary.some((m) => muscles.includes(m)) ? 0.5 : 0))
}

/**
 * Series semanales orientativas por grupo según el objetivo (series efectivas, cerca del fallo). Perder grasa
 * pide casi lo de ganar músculo: en déficit, el volumen es lo que lo conserva. En fuerza, hasta 15: con los
 * press, el hombro suma mucho de rebote sin que sea de más. Quien empieza progresa con menos: desde 6.
 */
export function weeklyRange(goal: TrainingGoal, level?: TrainingLevel): [min: number, max: number] {
  const [min, max]: [number, number] = goal === 'hypertrophy' ? [10, 20] : goal === 'fatLoss' ? [8, 20] : [6, 15]
  return [level === 'beginner' ? Math.min(min, 6) : min, max]
}

/** Índice del abdomen en MAIN_GROUPS. */
export const ABS_GROUP = MAIN_GROUPS.findIndex(([, muscles]) => muscles.includes('abs'))

/**
 * El rango de un grupo. El abdomen lo trabajan de rebote casi todos los básicos: sin mínimo en fuerza e
 * hipertrofia, y unas pocas series directas («Estar en forma», «Perder grasa»), con el mismo máximo.
 */
export function groupRange(goal: TrainingGoal, level: TrainingLevel | undefined, group: number): [min: number, max: number] {
  const [min, max] = weeklyRange(goal, level)
  return group === ABS_GROUP ? [goal === 'general' || goal === 'fatLoss' ? 4 : 0, max] : [min, max]
}
